import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

serve(async (req) => {
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  )

  try {
    const body = await req.json();
    console.log("Vesicash Webhook Body:", JSON.stringify(body, null, 2));

    const eventType = body.event || body.type;
    const checkoutRef = body.data?.reference || body.reference;

    if (!checkoutRef) {
      return new Response(JSON.stringify({ error: "No reference found" }), { status: 400 });
    }

    // 1. Find the payment record
    const { data: payment, error: pError } = await supabase
      .from('payments')
      .select('id, order_id')
      .eq('vesicash_transaction_id', checkoutRef)
      .single();

    if (pError || !payment) {
      console.error("Payment not found for ref:", checkoutRef);
      return new Response(JSON.stringify({ error: "Payment not found" }), { status: 404 });
    }

    // 2. Process based on event
    if (eventType === 'payment.success' || eventType === 'transaction.successful') {
      // Update Payment
      await supabase
        .from('payments')
        .update({ status: 'paid' })
        .eq('id', payment.id);

      // Update Order
      await supabase
        .from('orders')
        .update({ status: 'paid' })
        .eq('id', payment.order_id);
        
      console.log(`Order ${payment.order_id} marked as PAID.`);
    } else if (eventType === 'payment.failed') {
      await supabase
        .from('payments')
        .update({ status: 'failed' })
        .eq('id', payment.id);
        
      console.log(`Payment ${payment.id} marked as FAILED.`);
    }

    return new Response(JSON.stringify({ received: true }), { status: 200 });

  } catch (err) {
    console.error("Webhook Error:", err);
    return new Response(JSON.stringify({ error: err.message }), { status: 500 });
  }
})
