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

    // -----------------------------------------------------------
    // ATOMIC ORDER CREATION via RPC
    // -----------------------------------------------------------
    console.log("Calling create_order_from_cart RPC...");
    const { data: orderId, error: rpcError } = await supabaseAdmin
      .rpc('create_order_from_cart', {
        _user_id: user.id,
        _shipping_address: delivery_address ?? {},
        _payment_method: payment_method ?? 'vesicash'
      });

    if (rpcError) {
      console.error("RPC Error:", rpcError);
      throw { reason: "ORDER_CREATION_FAILED", message: rpcError.message };
    }

    if (!orderId) {
      throw { reason: "ORDER_CREATION_FAILED", message: "No order ID returned from RPC" };
    }

    console.log("Order created successfully via RPC. ID:", orderId);
    
    // Fetch the newly created order details for total calculation/verification (optional but good for logs)
    // we need totalUSD for Vesicash
    const { data: orderData, error: fetchOrderError } = await supabaseAdmin
      .from("orders")
      .select("total_amount, id")
      .eq("id", orderId)
      .single();
      
    if (fetchOrderError || !orderData) {
       console.error("Failed to fetch new order:", fetchOrderError);
       // We can continue but we need total_amount. 
       // If RPC succeeded, order exists.
    }
    
    const order = { id: orderId }; // lightweight order obj
    const totalUSD = orderData?.total_amount || 0; // Fallback or fail? Prefer fail if critical.
    if (!orderData) throw { reason: "ORDER_FETCH_FAILED", message: "Created order could not be retrieved" };

    const reference = `ORD-${order.id}-${Date.now()}`;
    
    await supabaseAdmin.from("payments").insert({
      order_id: order.id,
      provider: "vesicash",
      vesicash_transaction_id: reference,
      status: "pending"
    });

    let payment_link: string | null = null;
      const vesicashSecret = Deno.env.get("VESICASH_SECRET_KEY");
      const vesicashBaseUrl = Deno.env.get("VESICASH_BASE_URL") || "https://api.vesicash.com";

      if (!vesicashSecret) {
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
        Deno.env.get('SUPABASE_URL') + "/functions/v1/handle-vesicash-webhook";

      // Extract customer info from delivery_address
      const customerFirstName = delivery_address?.firstName || user.user_metadata?.full_name?.split(' ')[0] || 'Customer';
      const customerLastName = delivery_address?.lastName || user.user_metadata?.full_name?.split(' ').slice(1).join(' ') || '';
      const customerFullName = `${customerFirstName} ${customerLastName}`.trim();
      const customerEmail = user.email || delivery_address?.email || '';
      const customerPhone = delivery_address?.phone || user.phone || '';

      // Build enriched payload
      const vesicashPayload = {
        // Amount & Currency
        currency: "ZMW",
        country: "ZM",
        amount: totalZMW,
        
        // Reference & Description
        reference,
        narration: `Order #${order.id}`,
        description: `Order #${order.id} – MassRides Spares`,
        method: "mobilemoney",
        
        // === CUSTOMER INFO (CRITICAL for merchant portal) ===
        customer_name: customerFullName,
        customer_email: customerEmail,
        customer_phone: customerPhone,
        email: customerEmail,
        
        // Nested customer object
        customer: {
          name: customerFullName,
          first_name: customerFirstName,
          last_name: customerLastName,
          email: customerEmail,
          phone: customerPhone
        },
        
        // Metadata
        metadata: {
          order_id: order.id,
          user_id: user.id,
          checkout_type: 'authenticated',
          platform: 'massrides-pwa'
        },
        
        // URLs
        webhook_url: webhookUrl,
        callback_url: callbackUrl,
        redirect_url: callbackUrl,
        return_url: callbackUrl
      };

      console.log("Vesicash payload (enriched):", JSON.stringify(vesicashPayload, null, 2));

        // AUTHORITATIVE IMPLEMENTATION: Use Base URL and Bearer Token
      const vesicashRes = await fetch(
        `${vesicashBaseUrl}/payments/initiate`, 
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${vesicashSecret}`,
          },
          body: JSON.stringify(vesicashPayload),
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

      payment_link = vData.data?.link || vData.data?.payment_link;

      // Optional: Store the payment reference
      await supabaseAdmin
        .from("payments")
        .update({
          vesicash_transaction_id: vData.data?.reference || reference,
          vesicash_payment_id: vData.data?.payment_id,
        })
        .eq("order_id", order.id);
    
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
  } catch (error) {
    const err = error as any;
    console.error("CHECKOUT ERROR:", err);
    return new Response(
      JSON.stringify({
        error: "CHECKOUT_FAILED",
        reason: err.reason ?? "UNKNOWN",
        message: err.message ?? String(err),
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
