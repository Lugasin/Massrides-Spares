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

    const { data: { user }, error: authError } = await supabase.auth.getUser(
      authHeader.replace("Bearer ", "")
    );

    if (authError || !user) {
      console.error("Auth Error:", authError);
      throw { reason: "INVALID_JWT", message: "Invalid or expired token" };
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

    if (orderError) {
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
      const privateKey = Deno.env.get("VESICASH_PRIVATE_KEY");
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

      const vesicashRes = await fetch(
        "https://sandbox.api.vesicash.com/v1/payment/pay",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "v-private-key": privateKey,
            "v-public-key": publicKey,
          },
          body: JSON.stringify({
            amount: totalZMW,
            currency: "ZMW",
            email: user.email,
            phone_number: delivery_address?.phone ?? "0977000000",
            reference,
            callback_url: callbackUrl,
            metadata: {
              order_id: order.id,
              original_amount_usd: totalUSD,
            },
          }),
        }
      );

      const vData = await vesicashRes.json();

      if (!vesicashRes.ok) {
        throw {
          reason: "VESICASH_ERROR",
          message: vData?.message ?? "Payment initialization failed",
        };
      }

      payment_link = vData.link || vData.payment_url;
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
  } catch (error: any) {
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
