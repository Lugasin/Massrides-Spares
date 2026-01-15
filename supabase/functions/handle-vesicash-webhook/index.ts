import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

// Helper to interact with strict state machine
async function transitionPaymentState(supabase, paymentId, newStatus, eventType, payload) {
    // 1. Get current status for history
    const { data: payment } = await supabase
        .from('payments')
        .select('status, order_id')
        .eq('id', paymentId)
        .single();
    
    if (!payment) throw new Error(`Payment ${paymentId} not found`);

    const previousStatus = payment.status;

    // 2. Update Payment
    const { error: updateError } = await supabase
        .from('payments')
        .update({ 
            status: newStatus, 
            updated_at: new Date().toISOString() 
        })
        .eq('id', paymentId);
    
    if (updateError) throw updateError;

    // 3. Log Event
    await supabase
        .from('payment_events')
        .insert({
            payment_id: paymentId,
            order_id: payment.order_id,
            event_type: eventType,
            previous_status: previousStatus,
            new_status: newStatus,
            payload: payload,
            source: 'webhook'
        });

    // 4. Update Order Status (Syncing generic table for frontend)
    // Map payment status to order status
    let orderStatus = 'pending';
    if (newStatus === 'PAID' || newStatus === 'ESCROW_HELD') orderStatus = 'paid';
    if (newStatus === 'FAILED') orderStatus = 'failed';
    
    if (orderStatus !== 'pending') {
         await supabase
            .from('orders')
            .update({ 
                payment_status: orderStatus,
                status: orderStatus === 'paid' ? 'processing' : 'cancelled' 
            })
            .eq('id', payment.order_id);
    }
}

serve(async (req) => {
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  )

  try {
    // 1. Log Raw Receipt (for debugging, ephemeral)
    console.log("Webhook Received");

    // 2. Signature Verification
    // Implement standard HMAC check if secret available
    // const signature = req.headers.get('X-Vesicash-Signature');
    // ... verify logic ...

    const body = await req.json();
    const eventId = body.id || body.reference || `evt_${Date.now()}`; // Unique ID from Vesicash
    const eventType = body.event || body.type; // e.g., 'payment.success'

    // 3. Idempotency Check
    const { data: existingLog } = await supabase
        .from('webhook_processing_log')
        .select('id, status')
        .eq('webhook_id', String(eventId))
        .single();

    if (existingLog) {
        console.log(`Duplicate Webhook ${eventId} ignored.`);
        return new Response("Idempotent ID", { status: 200 });
    }

    // 4. Start Processing Log
    const startTime = Date.now();
    const { data: logEntry, error: logError } = await supabase
        .from('webhook_processing_log')
        .insert({
            webhook_id: String(eventId),
            event_type: eventType,
            payload: body,
            status: 'processing'
        })
        .select()
        .single();
    
    if (logError) throw logError;

    // 5. Process Logic
    try {
        // Find Payment by Merchant Reference (assumed to be in payload)
        // Adjust 'body.data.reference' based on actual Vesicash payload
        const merchantRef = body.data?.reference || body.reference; 
        
        if (!merchantRef) {
            throw new Error("No merchant reference found in webhook payload");
        }

        const { data: payment } = await supabase
            .from('payments')
            .select('id')
            .eq('merchant_reference', merchantRef)
            .single();

        if (!payment) {
             throw new Error(`Payment record not found for ref: ${merchantRef}`);
        }

        // State Transitions
        switch (eventType) {
            case 'payment.success':
            case 'transaction.successful':
                await transitionPaymentState(supabase, payment.id, 'PAID', 'WEBHOOK_SUCCESS', body);
                break;
            
            case 'payment.failed':
                await transitionPaymentState(supabase, payment.id, 'FAILED', 'WEBHOOK_FAILED', body);
                break;
            
            // Add Escrow Release logic here later
            
            default:
                console.log(`Unhandled event type: ${eventType}`);
        }

        // 6. Mark Log Success
        await supabase
            .from('webhook_processing_log')
            .update({
                status: 'success',
                processing_duration_ms: Date.now() - startTime
            })
            .eq('id', logEntry.id);

    } catch (processError) {
        console.error("Webhook Processing Failed:", processError);
        
        // Mark Log Failed
        await supabase
            .from('webhook_processing_log')
            .update({
                status: 'failed',
                error_message: processError.message,
                processing_duration_ms: Date.now() - startTime
            })
            .eq('id', logEntry.id);

        // Alert Admin
        await supabase.from('admin_alerts').insert({
            title: `Webhook Failure: ${eventType}`,
            message: processError.message,
            type: 'critical',
            reference_id: eventId
        });
        
        throw processError; // Re-throw to return 500 if we want retry, or catch and return 200 to stop retry
    }

    return new Response(JSON.stringify({ received: true }), { status: 200, headers: { "Content-Type": "application/json" } });

  } catch (err) {
    console.error(err)
    return new Response(
      JSON.stringify({ error: err.message }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    )
  }
})
