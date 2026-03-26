import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const supabase = createClient(
  Deno.env.get("SUPABASE_URL") ?? "",
  Deno.env.get("SUPABASE_ANON_KEY") ?? ""
);

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

function getNameParts(fullName?: string | null) {
  const trimmed = fullName?.trim() ?? "";
  if (!trimmed) {
    return { firstName: "", lastName: "" };
  }

  const [firstName, ...rest] = trimmed.split(/\s+/);
  return {
    firstName,
    lastName: rest.join(" "),
  };
}

function asObject(value: unknown) {
  return value && typeof value === "object" && !Array.isArray(value)
    ? value as Record<string, unknown>
    : {};
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
    const authHeader = req.headers.get("authorization");
    if (!authHeader) {
      throw { reason: "NO_AUTH", message: "Missing Authorization header" };
    }

    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      throw { reason: "INVALID_JWT", message: `Invalid or expired token: ${authError?.message || 'Unknown error'}` };
    }

    const { delivery_address, customer_details, payment_method, send_receipt } = await req.json();
    const shippingAddress = asObject(delivery_address);
    const customerDetails = asObject(customer_details);

    const { data: profile } = await supabaseAdmin
      .from("user_profiles")
      .select("full_name, email, phone, company_name, address, city, state, country, zip_code")
      .eq("user_id", user.id)
      .maybeSingle();

    const profileName = getNameParts(profile?.full_name);
    const customerName = `${customerDetails.firstName ?? ""} ${customerDetails.lastName ?? ""}`.trim();
    const providedName = getNameParts(customerName);

    const resolvedCustomer = {
      first_name: String(customerDetails.firstName ?? providedName.firstName ?? profileName.firstName ?? "").trim(),
      last_name: String(customerDetails.lastName ?? providedName.lastName ?? profileName.lastName ?? "").trim(),
      full_name: String(customerName || profile?.full_name || "").trim(),
      email: String(customerDetails.email ?? profile?.email ?? user.email ?? "").trim(),
      phone: String(customerDetails.phone ?? profile?.phone ?? "").trim(),
      company_name: String(customerDetails.company ?? profile?.company_name ?? "").trim(),
      address: String(customerDetails.address ?? shippingAddress.address ?? profile?.address ?? "").trim(),
      city: String(customerDetails.city ?? shippingAddress.city ?? profile?.city ?? "").trim(),
      state: String(customerDetails.state ?? shippingAddress.state ?? profile?.state ?? "").trim(),
      zip_code: String(customerDetails.zipCode ?? shippingAddress.zipCode ?? profile?.zip_code ?? "").trim(),
      country: String(customerDetails.country ?? shippingAddress.country ?? profile?.country ?? "Zambia").trim(),
    };

    // Call RPC to create order (handles inventory, cart clearing, empty checks)
    const { data: orderId, error: rpcError } = await supabaseAdmin.rpc("create_order_from_cart", {
        _user_id: user.id,
        _shipping_address: shippingAddress,
        _payment_method: payment_method ?? 'vesicash'
    });

    if (rpcError) {
        console.error("RPC Error:", JSON.stringify(rpcError));
        // Pass through specific RPC errors like CART_EMPTY or OUT_OF_STOCK
        const message = rpcError.message || "Checkout failed";
        if (message.includes("CART_EMPTY")) throw { reason: "EMPTY_CART", message: "Your cart is empty." };
        if (message.includes("OUT_OF_STOCK")) throw { reason: "OUT_OF_STOCK", message: message };
        throw { reason: "CHECKOUT_RPC_FAILED", message: message };
    }

    // Fetch the created order to get details (total_amount) for payment
    const { data: order, error: fetchError } = await supabaseAdmin
        .from("orders")
        .select("*")
        .eq("id", orderId)
        .single();
    
    if (fetchError || !order) {
         throw { reason: "ORDER_FETCH_FAILED", message: fetchError?.message || "Order not found" };
    }
    
    const totalUSD = Number(order.total_amount ?? 0);
    const exchangeRate = parseFloat(Deno.env.get("EXCHANGE_RATE") ?? "28.5");
    const totalZMW = Math.ceil(totalUSD * exchangeRate);
    const reference = `ORD-${order.id}-${Date.now()}`;

    const { data: paymentRecord, error: paymentInsertError } = await supabaseAdmin
      .from("payments")
      .insert({
        order_id: order.id,
        provider: "vesicash",
        vesicash_transaction_id: reference,
        status: "pending"
      })
      .select("id")
      .single();

    if (paymentInsertError || !paymentRecord) {
      throw {
        reason: "PAYMENT_RECORD_FAILED",
        message: paymentInsertError?.message || "Unable to create payment record",
      };
    }

    await supabaseAdmin.from("financial_audit_logs").insert({
      event_type: "payment_checkout_created",
      entity_type: "payment",
      entity_id: String(paymentRecord.id),
      amount: totalZMW,
      metadata: {
        order_id: order.id,
        order_number: order.order_number,
        provider: "vesicash",
        customer: resolvedCustomer,
        exchange_rate: exchangeRate,
        order_amount_usd: totalUSD,
        payment_amount_zmw: totalZMW,
        send_receipt: !!send_receipt,
        reference,
      },
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

      const callbackUrl =
        (origin ?? "https://massridesspares.netlify.app") +
        "/checkout/success";

      const webhookUrl =
        "https://ocfljbhgssymtbjsunfr.supabase.co/functions/v1/handle-vesicash-webhook";

      const vesicashPayload = {
        currency: "ZMW",
        country: "ZM",
        narration: `Order ${order.order_number ?? order.id}`,
        method: "mobilemoney",
        amount: totalZMW,
        webhook_url: webhookUrl,
        redirect_url: callbackUrl,
        email: resolvedCustomer.email,
        phone_number: resolvedCustomer.phone || undefined,
        first_name: resolvedCustomer.first_name || undefined,
        last_name: resolvedCustomer.last_name || undefined,
        customer: {
          email: resolvedCustomer.email,
          phone_number: resolvedCustomer.phone || undefined,
          first_name: resolvedCustomer.first_name || undefined,
          last_name: resolvedCustomer.last_name || undefined,
          full_name: resolvedCustomer.full_name || undefined,
          company_name: resolvedCustomer.company_name || undefined,
          address: resolvedCustomer.address || undefined,
          city: resolvedCustomer.city || undefined,
          state: resolvedCustomer.state || undefined,
          country: resolvedCustomer.country || undefined,
          zip_code: resolvedCustomer.zip_code || undefined,
        },
        metadata: {
          order_id: order.id,
          order_number: order.order_number,
          user_id: user.id,
          customer_email: resolvedCustomer.email,
          customer_phone: resolvedCustomer.phone || null,
          source: "massrides_checkout",
          reference,
        },
      };

      const vesicashRes = await fetch(
        "https://api.mor.vesicash.com/v1/payment/init",  // ✅ Correct endpoint
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "secret-key": privateKey,  // ✅ Changed from "v-private-key"
            "public-key": publicKey,   // ✅ Changed from "v-public-key"
          },
          body: JSON.stringify(vesicashPayload),
        }
      );

      const vData = await vesicashRes.json();

      console.log("Vesicash Response Status:", vesicashRes.status);
      console.log("Vesicash Response:", JSON.stringify(vData, null, 2));

      if (!vesicashRes.ok || vData.status !== "success") {
        await supabaseAdmin
          .from("payments")
          .update({ status: "failed" })
          .eq("id", paymentRecord.id);

        await supabaseAdmin.from("financial_audit_logs").insert({
          event_type: "payment_initialization_failed",
          entity_type: "payment",
          entity_id: String(paymentRecord.id),
          amount: totalZMW,
          metadata: {
            order_id: order.id,
            provider: "vesicash",
            reference,
            error: vData?.message ?? "Payment initialization failed",
            response: vData,
          },
        });

        throw {
          reason: "VESICASH_ERROR",
          message: vData?.message ?? "Payment initialization failed",
        };
      }

      payment_link = vData.data?.payment_link ?? null;
      const providerReference = vData.data?.reference || reference;

      // Optional: Store the payment reference
      await supabaseAdmin
        .from("payments")
        .update({
          vesicash_transaction_id: providerReference,
          vesicash_payment_id: vData.data?.payment_id,
          status: "pending",
        })
        .eq("id", paymentRecord.id);

      await supabaseAdmin.from("financial_audit_logs").insert({
        event_type: "payment_initialized",
        entity_type: "payment",
        entity_id: String(paymentRecord.id),
        amount: totalZMW,
        metadata: {
          order_id: order.id,
          provider: "vesicash",
          reference: providerReference,
          payment_id: vData.data?.payment_id ?? null,
          customer: resolvedCustomer,
        },
      });
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
    const checkoutError = error as { message?: string; reason?: string };
    console.error("CHECKOUT ERROR:", checkoutError);
    return new Response(
      JSON.stringify({
        error: "CHECKOUT_FAILED",
        reason: checkoutError.reason ?? "UNKNOWN",
        message: checkoutError.message ?? String(error),
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
