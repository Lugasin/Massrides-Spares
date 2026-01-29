import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1";

console.log("Vesicash Webhook Handler Started");

async function verifySignature(payload: string, signature: string, secret: string) {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-512" },
    false,
    ["verify"]
  );

  const signatureBytes = new Uint8Array(
    signature.match(/.{1,2}/g)?.map(byte => parseInt(byte, 16)) || []
  );

  return await crypto.subtle.verify(
    "HMAC",
    key,
    signatureBytes,
    encoder.encode(payload)
  );
}

serve(async (req) => {
  try {
    const rawBody = await req.text();
    const body = JSON.parse(rawBody);
    const signature = req.headers.get("v-signature");
    const webhookSecret = Deno.env.get('VESICASH_WEBHOOK_SECRET');

    if (webhookSecret && signature) {
      const isValid = await verifySignature(rawBody, signature, webhookSecret);
      if (!isValid) {
        console.error("Invalid Webhook Signature");
        return new Response(JSON.stringify({ error: "Invalid signature" }), { status: 401 });
      }
      console.log("Signature verified successfully");
    } else if (webhookSecret) {
      console.warn("Webhook secret set but no signature received");
      // In production, you might want to block this, but for now we'll allow it if no signature is provided during testing
    }

    console.log("Webhook Payload:", JSON.stringify(body));

    const eventType = body.event || body.type;
    const data = body.data;
    const reference = data?.reference;

    if (!reference) {
      return new Response(JSON.stringify({ error: "No reference" }), { status: 400 });
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Map Vesicash events to mandatory states
    let status = 'PROCESSING';
    if (eventType === 'payment.successful' || eventType === 'transaction.successful') {
      status = 'PAID';
    } else if (eventType === 'payment.failed') {
      status = 'FAILED';
    } else if (eventType === 'payment.cancelled') {
      status = 'CANCELLED';
    }

    // Update Generic Payments table
    const { data: payment, error: pError } = await supabase
      .from('payments')
      .update({
        status,
        raw_payload: body,
        updated_at: new Date().toISOString()
      })
      .eq('provider_reference', reference)
      .select()
      .single();

    if (pError) {
      console.error("Payment update error:", pError);
      return new Response(JSON.stringify({ error: pError.message }), { status: 404 });
    }

    // Update Order Status
    const { error: oError } = await supabase
      .from('orders')
      .update({ status })
      .eq('id', payment.order_id);

    if (oError) {
      console.error("Order update error:", oError);
    }

    // Send Email on Success
    if (status === 'PAID') {
        const { data: order } = await supabase.from('orders').select('*, profiles(email)').eq('id', payment.order_id).single();
        if (order) {
            await supabase.functions.invoke('send-email', {
                body: {
                    to: order.guest_email || order.profiles?.email,
                    type: 'PAYMENT_SUCCESS',
                    order_id: order.id,
                    data: { order_number: order.order_number }
                }
            }).catch(e => console.error("Webhook email failed:", e));
        }
    }

    // Log Webhook Event for Audit
    await supabase.from('webhook_events').insert({
      provider: 'vesicash',
      event_type: eventType,
      payload: body,
      processed: true
    }).catch(err => console.error("Webhook logging failed:", err));

    return new Response(JSON.stringify({ success: true }), {
      headers: { "Content-Type": "application/json" },
      status: 200,
    });

  } catch (err: any) {
    console.error("Webhook Processing Error:", err);
    return new Response(JSON.stringify({ error: err.message }), { status: 500 });
  }
});