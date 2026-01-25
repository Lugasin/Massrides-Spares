import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

// Create a Supabase client with the Auth context of the user that called the function.
// This client is used to verify the user's JWT.
const supabase = createClient(
  Deno.env.get("SUPABASE_URL") ?? "",
  Deno.env.get("SUPABASE_ANON_KEY") ?? ""
);

// Create a Supabase admin client to perform database operations.
const supabaseAdmin = createClient(
  Deno.env.get("SUPABASE_URL") ?? "",
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
);

function getCorsHeaders(origin: string | null) {
  const allowedOrigin = Deno.env.get("CORS_ORIGIN") ?? "https://massridesspares.netlify.app";
  return {
    "Access-Control-Allow-Origin": origin ?? allowedOrigin,
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Vary": "Origin",
  };
}

serve(async (req) => {
  const origin = req.headers.get("origin");

  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 204,
      headers: getCorsHeaders(origin),
    });
  }

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method Not Allowed" }), {
      status: 405,
      headers: {
        ...getCorsHeaders(origin),
        "Content-Type": "application/json",
      },
    });
  }

  try {
    /* ----------------------------------
       DIAGNOSTICS
    ----------------------------------- */
    console.log("--- DEBUG START: validate-checkout ---");
    console.log("SUPABASE_URL exists:", !!Deno.env.get("SUPABASE_URL"));
    console.log("ANON_KEY exists:", !!Deno.env.get("SUPABASE_ANON_KEY"));
    console.log("SERVICE_ROLE exists:", !!Deno.env.get("SUPABASE_SERVICE_ROLE_KEY"));

    // Log headers safely
    const headers: Record<string, string> = {};
    req.headers.forEach((v, k) => {
        if (k.toLowerCase() === 'authorization') {
            headers[k] = v.substring(0, 15) + "...";
        } else {
            headers[k] = v;
        }
    });
    console.log("Request Headers:", JSON.stringify(headers));

    const authHeader = req.headers.get("authorization");
    if (!authHeader) {
      throw { reason: "NO_AUTH", message: "Missing Authorization header" };
    }

    const token = authHeader.replace("Bearer ", "");
    console.log("Token length:", token.length);
    console.log("Token starts with:", token.substring(0, 20) + "...");

    // Try to decode JWT payload for debugging
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      console.log("JWT Payload:", {
        iss: payload.iss,
        aud: payload.aud,
        exp: payload.exp,
        iat: payload.iat,
        sub: payload.sub?.substring(0, 8) + "...",
      });
    } catch (e) {
      console.log("Failed to decode JWT:", e);
    }

    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      console.error("Auth Error Details:", JSON.stringify(authError, null, 2));
      console.error("User object:", user);
      console.error("Supabase URL:", Deno.env.get("SUPABASE_URL"));
      console.error("Anon Key exists:", !!Deno.env.get("SUPABASE_ANON_KEY"));
      throw { reason: "INVALID_JWT", message: `Invalid or expired token: ${authError?.message || 'Unknown error'}` };
    }

    console.log("Auth Success for user:", user.email);
    console.log("--- DEBUG END: validate-checkout ---");

    const { delivery_address, payment_method } = await req.json();

    const { data: items, error: cartError } = await supabaseAdmin
      .from("cart_items")
      .select(
        `
        quantity,
        product:products (
          id,
          name,
          price,
          main_image
        )
      `
      )
      .eq("user_id", user.id);

    if (cartError) {
      throw { reason: "CART_FETCH_FAILED", message: cartError.message };
    }

    if (!items || items.length === 0) {
      throw { reason: "EMPTY_CART", message: "Cart is empty" };
    }

    const cartItems = items
      .filter((i) => i.product && i.quantity > 0)
      .map((i) => ({
        product_id: i.product.id,
        name: i.product.name,
        price: Number(i.product.price),
        quantity: i.quantity,
        image: i.product.main_image ?? "",
      }));

    let subtotal = 0;
    for (const item of cartItems) {
      subtotal += item.price * item.quantity;
    }
    const totalUSD = subtotal;

    //add more logging Right before the database insert, add this:
    console.log("About to insert order with user_id:", user.id);
    console.log("Using supabaseAdmin client");

    const { data: order, error: orderError } = await supabaseAdmin
      .from("orders")
      .insert({
        user_id: user.id,
        total_amount: totalUSD,
        status: "awaiting_payment",
        shipping_address: delivery_address ?? {},
      })
      .select()
      .single();

    console.log("Order insert result:", { order, error: orderError });

    if (orderError) {
      console.error("FULL ORDER ERROR:", JSON.stringify(orderError, null, 2));
      throw { reason: "ORDER_FAILED", message: orderError.message };
    }

    const orderItems = cartItems.map((item) => ({
      order_id: order.id,
      product_id: item.product_id,
      quantity: item.quantity,
      price_snapshot: item.price,
    }));

    const { error: itemsError } = await supabaseAdmin
      .from("order_items")
      .insert(orderItems);

    if (itemsError) {
      throw { reason: "ORDER_ITEMS_FAILED", message: itemsError.message };
    }

    const reference = `ORD-${order.id}-${Date.now()}`;
    
    await supabaseAdmin.from("payments").insert({
      order_id: order.id,
      provider: "vesicash",
      vesicash_transaction_id: reference,
      status: "pending"
    });

    let payment_link: string | null = null;
    if (payment_method === "vesicash") {
      const privateKey = Deno.env.get("VESICASH_SECRET_KEY");
      const publicKey = Deno.env.get("VESICASH_PUBLIC_KEY");

      if (!privateKey || !publicKey) {
        throw {
          reason: "VESICASH_KEYS_MISSING",
          message: "Payment keys not configured",
        };
      }

      const EXCHANGE_RATE = parseFloat(Deno.env.get("EXCHANGE_RATE") ?? "28.5");
      const totalZMW = Math.ceil(totalUSD * EXCHANGE_RATE);

      const callbackUrl =
        (origin ?? "https://massridesspares.netlify.app") +
        "/checkout/success";

      const webhookUrl =
        "https://ocfljbhgssymtbjsunfr.supabase.co/functions/v1/handle-payment-webhook";

      const vesicashRes = await fetch(
        "https://api.mor.vesicash.com/v1/payment/init",  // ✅ Correct endpoint
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "secret-key": privateKey,  // ✅ Changed from "v-private-key"
            "public-key": publicKey,   // ✅ Changed from "v-public-key"
          },
          body: JSON.stringify({
            currency: "ZMW",
            country: "ZM",
            narration: `Order #${order.id} - ${cartItems.length} items`,
            method: "mobilemoney",  // or "card" - you can make this dynamic
            amount: totalZMW,
            webhook_url: webhookUrl,
            redirect_url: callbackUrl,
          }),
        }
      );

      const vData = await vesicashRes.json();

      console.log("Vesicash Response Status:", vesicashRes.status);
      console.log("Vesicash Response:", JSON.stringify(vData, null, 2));

      if (!vesicashRes.ok || vData.status !== "success") {
        throw {
          reason: "VESICASH_ERROR",
          message: vData?.message ?? "Payment initialization failed",
        };
      }

      payment_link = vData.data?.payment_link;

      // Optional: Store the payment reference
      await supabaseAdmin
        .from("payments")
        .update({
          vesicash_transaction_id: vData.data?.reference || reference,
          vesicash_payment_id: vData.data?.payment_id,
        })
        .eq("order_id", order.id);
    }

    return new Response(
      JSON.stringify({
        order_id: order.id,
        total: totalUSD,
        payment_link,
        message: "Checkout initialized",
      }),
      {
        status: 200,
        headers: {
          ...getCorsHeaders(origin),
          "Content-Type": "application/json",
        },
      }
    );
  } catch (error: unknown) {
    console.error("CHECKOUT ERROR:", error);
    return new Response(
      JSON.stringify({
        error: "CHECKOUT_FAILED",
        reason: error.reason ?? "UNKNOWN",
        message: error.message ?? String(error),
      }),
      {
        status: 400,
        headers: {
          ...getCorsHeaders(origin),
          "Content-Type": "application/json",
        },
      }
    );
  }
});
