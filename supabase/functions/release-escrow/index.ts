import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const { order_id, trigger } = await req.json()

    if (!order_id) throw new Error('order_id is required');

    // 1. Check idempotency
    const { data: existing } = await supabase
      .from('escrow_releases')
      .select('*')
      .eq('order_id', order_id)
      .single();

    if (existing?.status === 'completed') {
      return new Response(JSON.stringify({ success: true, escrow_release_id: existing.id, already_released: true }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // 2. Verify order
    const { data: order, error: orderError } = await supabase
      .from('orders')
      // Need provider_payment_id from payments table
      .select('*, payment:payments(*)')
      .eq('id', order_id)
      .single();

    if (orderError || !order) throw new Error('Order not found');
    
    // Eligibility checks
    if (order.status !== 'delivered' && trigger !== 'admin') {
         // Allow auto_release if older than X days? Logic usually in caller
         if (trigger !== 'auto_release') throw new Error('Order not eligible for release (status must be delivered or triggered by admin/auto)');
    }
    
    if (!order.payment || order.payment.status !== 'confirmed') {
        // Technically strict, but sometimes 'confirmed' status update lags. 
        // We rely on provider_payment_id availability.
        if (!order.payment?.provider_payment_id) throw new Error('Payment not confirmed / ID missing');
    }

    // 3. Calculate Commission (Internal Call to DB or Function?)
    // Re-calculating using DB logic to be safe/atomic.
    // Or call our own function via fetch? Better to reimplement core logic or import shared module.
    // Deno functions can't easily import from each other in Supabase unless shared.
    // We will Call the calculate-commission Function via invoke to ensure DRY.
    
    const { data: commsData, error: commsError } = await supabase.functions.invoke('calculate-commission', {
        body: { order_id }
    });

    if (commsError || !commsData.success) {
        throw new Error('Commission calculation failed: ' + (commsError?.message || commsData?.error));
    }

    const { vendorAmount, platformAmount } = commsData.data;

    // 4. Release Encrow (Vesicash API)
    // Moves funds from Escrow -> Main Wallet
    const idempotencyKey = `escrow_${order_id}_${Date.now()}`;
    const vesicashApiKey = Deno.env.get('VESICASH_API_KEY');
    const vesicashUrl = Deno.env.get('VESICASH_API_URL') || 'https://api.vesicash.com/v1'; // Default or Env

    // Note: Vesicash Release endpoint usually requires transaction_id
    const releaseRes = await fetch(`${vesicashUrl}/escrow/release`, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${vesicashApiKey}`,
            'Content-Type': 'application/json',
            'Idempotency-Key': idempotencyKey
        },
        body: JSON.stringify({
            transaction_id: order.payment.provider_payment_id,
        })
    });

    // Handle Vesicash Error
    // If 409/Duplicate, check if already released?
    if (!releaseRes.ok) {
        const errorText = await releaseRes.text();
        console.error('Vesicash Release Error:', errorText);
        throw new Error(`Vesicash release failed: ${errorText}`);
    }

    const vesicashData = await releaseRes.json();

    // 5. Record Release in DB
    const { data: release, error: releaseDbError } = await supabase
      .from('escrow_releases')
      .insert({
        order_id: order_id,
        payment_id: order.payment.id,
        vesicash_transaction_id: vesicashData.transaction_id || order.payment.provider_payment_id,
        total_amount: order.total,
        vendor_amount: vendorAmount,
        platform_amount: platformAmount,
        status: 'completed',
        released_at: new Date().toISOString(),
        idempotency_key: idempotencyKey,
        metadata: { trigger, vesicash_response: vesicashData }
      })
      .select()
      .single();

    if (releaseDbError) throw releaseDbError;

    // 6. Create Vendor Payout Record (Pending)
    // Separate worker/process will pick this up
    // 6. Create Vendor Payout Record
    const { data: payout, error: payoutError } = await supabase.from('vendor_payouts').insert({
        vendor_id: order.vendor_id,
        escrow_release_id: release.id,
        order_id: order_id,
        amount: vendorAmount,
        status: 'pending',
        scheduled_at: new Date().toISOString()
    })
    .select()
    .single();

    if (payoutError) {
        console.error('Failed to create payout record:', payoutError);
        // Critical: Funds released but payout record missing.
    } else if (payout) {
        // Trigger Payout Process Immediately
        console.log(`Triggering payout ${payout.id}`);
        supabase.functions.invoke('process-vendor-payout', {
            body: { payout_id: payout.id }
        });
    }

    // 7. Update Commission Status
    await supabase.from('platform_commissions')
        .update({ status: 'recorded', escrow_release_id: release.id })
        .eq('order_id', order_id);

    // 8. Audit
    await supabase.from('financial_audit_logs').insert({
        event_type: 'escrow_released',
        entity_type: 'order',
        entity_id: order_id,
        amount: order.total,
        metadata: { vendor_amount: vendorAmount, platform_amount: platformAmount, trigger }
    });

    return new Response(
      JSON.stringify({ success: true, escrow_release_id: release.id }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Error in release-escrow:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400 
      }
    )
  }
})
