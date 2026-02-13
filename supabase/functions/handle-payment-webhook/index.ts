import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

async function verifySignature(rawBody: string, signature: string) {
  const secret = Deno.env.get("WEBHOOK_SECRET");
  if (!secret) {
    console.error("WEBHOOK_SECRET is not set");
    return false;
  }
  const encoder = new TextEncoder();

  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );

  const signed = await crypto.subtle.sign(
    "HMAC",
    key,
    encoder.encode(rawBody)
  );

  const hash = Array.from(new Uint8Array(signed))
    .map(b => b.toString(16).padStart(2, "0"))
    .join("");

  return hash === signature;
}

serve(async (req) => {
  try {
    const raw = await req.text();
    const signature = req.headers.get("x-signature") || req.headers.get("X-Signature"); // Case insensitive check

    if (!signature) {
       return new Response("Missing signature", { status: 401 });
    }

    if (!await verifySignature(raw, signature)) {
      return new Response("Invalid signature", { status: 401 });
    }

    const payload = JSON.parse(raw);
    const reference = payload.data?.reference;

    if (!reference) {
      return new Response("No reference in payload", { status: 400 });
    }

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Find the payment record
    const { data: payment, error: paymentError } = await supabaseAdmin
      .from("payments")
      .select("*")
      .eq("vesicash_transaction_id", reference)
      .single();

    if (paymentError || !payment) {
        console.error("Payment not found for reference:", reference);
        return new Response("Payment not found", { status: 404 });
    }

    const orderId = payment.order_id;

    if (payload.data.status === "success") {
      // SUCCESS path
      if (payment.status === "paid") {
        return new Response("Already processed");
      }

      await supabaseAdmin
        .from("payments")
        .update({ status: "paid", completed_at: new Date().toISOString() })
        .eq("id", payment.id);

      await supabaseAdmin
        .from("orders")
        .update({
          payment_status: "paid",
          status: "processing"
        })
        .eq("id", orderId);

      // TODO: Send email receipt (optional, calling send-email function)

    } else {
      // FAILURE path
      if (payment.status === "failed") {
        return new Response("Already processed");
      }

      await supabaseAdmin
        .from("payments")
        .update({ status: "failed" })
        .eq("id", payment.id);

      await supabaseAdmin
        .from("orders")
        .update({
          payment_status: "failed",
          status: "cancelled" // Cancel order
        })
        .eq("id", orderId);

      // INVENTORY ROLLBACK
      const { data: items } = await supabaseAdmin
        .from("order_items")
        .select("*")
        .eq("order_id", orderId);

      if (items) {
          for (const item of items) {
            // Increment inventory back using atomic RPC
            await supabaseAdmin.rpc('increment_inventory', {
                p_id: item.spare_part_id,
                qty: item.quantity
            }).catch((err) => {
                console.error("Failed to rollback inventory for item:", item.id, err);
            });
          }
      }
    }

    return new Response("ok");
  } catch (err) {
    console.error("Webhook Error:", err);
    return new Response("Internal Server Error", { status: 500 });
  }
});
