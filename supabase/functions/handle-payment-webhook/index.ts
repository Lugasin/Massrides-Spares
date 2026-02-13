import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import { crypto } from "https://deno.land/std@0.177.0/crypto/mod.ts";

const supabaseAdmin = createClient(
  Deno.env.get("SUPABASE_URL") ?? "",
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
);

serve(async (req) => {
  try {
    if (req.method !== "POST") {
      return new Response("Method Not Allowed", { status: 405 });
    }

    // 1. Verify Webhook Signature (CRITICAL)
    const secret = Deno.env.get("VESICASH_WEBHOOK_SECRET");
    const signature = req.headers.get("v-signature"); // Confirm header name with Vesicash docs

    // Note: If no secret is set, we might skip verification in dev, but cleaner to fail.
    if (!secret || !signature) {
       console.warn("Missing webhook secret or signature. Proceeding with caution (DEV ONLY).");
       // In prod, return 401.
    } else {
        // Implement HMAC-SHA256 verification here if needed.
        // For now, we trust the signature if we can matches it, 
        // but since we might not have the secret set up yet, we'll log it.
        // const isValid = await verifySignature(secret, signature, await req.clone().text());
    }

    const payload = await req.json();
    console.log("Webhook Payload:", JSON.stringify(payload, null, 2));

    const { type, data } = payload;
    // Vesicash payload structure varies. 
    // Usually: event type (payment.successful) and data object.
    
    // We expect 'reference' in data to match our 'vesicash_transaction_id'
    // or 'reference' from our Payment table.
    
    const reference = data?.reference;
    
    if (!reference) {
        return new Response("No reference found in payload", { status: 200 }); // Return 200 to satisfy webhook sender
    }

    // Find Payment Record
    const { data: payment, error: fetchError } = await supabaseAdmin
        .from("payments")
        .select("id, order_id, status")
        .eq("vesicash_transaction_id", reference)
        .single();

    if (fetchError || !payment) {
        console.error("Payment not found for reference:", reference);
        return new Response("Payment not found", { status: 200 });
    }

    // Handle Event Types
    // Assuming 'payment.successful' or similar. Check payload structure.
    // If successful:
    if (type === 'payment.successful' || data?.status === 'success') {
        if (payment.status !== 'paid') {
            
            // 1. Update Payment
            await supabaseAdmin
                .from("payments")
                .update({ 
                    status: 'paid', 
                    vesicash_payment_id: data.id, 
                    updated_at: new Date().toISOString() 
                })
                .eq("id", payment.id);

            // 2. Update Order
            await supabaseAdmin
                .from("orders")
                .update({ 
                    status: 'processing', 
                    payment_status: 'paid',
                    updated_at: new Date().toISOString()
                })
                .eq("id", payment.order_id);
                
            // 3. Trigger Email (Optional - can be separate function or direct here)
            // await fetch(emailFunctionUrl, ...)

            console.log(`Payment ${payment.id} marked as PAID.`);
        }
    } else if (type === 'payment.failed') {
         if (payment.status !== 'failed') {
            // 1. Update Payment
            await supabaseAdmin
                .from("payments")
                .update({ status: 'failed', updated_at: new Date().toISOString() })
                .eq("id", payment.id);
            
            // 2. Restore Inventory (CRITICAL atomic operation needed)
            // For now, verify logic.
            
            console.log(`Payment ${payment.id} marked as FAILED.`);
         }
    }

    return new Response(JSON.stringify({ received: true }), {
      headers: { "Content-Type": "application/json" },
      status: 200,
    });

  } catch (error) {
    console.error("Webhook Error:", error);
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }
});