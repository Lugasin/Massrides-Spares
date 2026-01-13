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

    const { payout_id } = await req.json()

    if (!payout_id) throw new Error('payout_id is required');

    // 1. Get Payout Record
    const { data: payout, error: payoutError } = await supabase
      .from('vendor_payouts')
      .select('*')
      .eq('id', payout_id)
      .single();

    if (payoutError || !payout) throw new Error('Payout not found');
    if (payout.status !== 'pending') {
        return new Response(JSON.stringify({ success: false, message: 'Payout not pending' }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // 2. Get Vendor Banking/Vesicash Info
    // Assuming vendor has 'metadata' or separate table with 'vesicash_recipient_id'
    // or 'bank_details'. 
    // For now, check 'metadata.vesicash_recipient_id' in profiles.
    const { data: vendor } = await supabase
      .from('user_profiles')
      .select('metadata')
      .eq('id', payout.vendor_id)
      .single();
    
    // Check key depending on how we stored it onboard
    const recipientId = vendor?.metadata?.vesicash_recipient_id;

    if (!recipientId) {
        // Mark On Hold
        await supabase.from('vendor_payouts').update({
            status: 'on_hold',
            failure_reason: 'Missing Vesicash Recipient ID'
        }).eq('id', payout_id);
        throw new Error('Vendor not onboarded (Missing Recipient ID)');
    }

    // 3. Initiate Payout via Vesicash
    const vesicashApiKey = Deno.env.get('VESICASH_API_KEY');
    const vesicashUrl = Deno.env.get('VESICASH_API_URL') || 'https://api.vesicash.com/v1';

    const payoutPayload = {
        amount: payout.amount,
        recipient_id: recipientId,
        currency: 'ZMW', // Or USD, depends on order? Assuming standard currency.
        debit_currency: 'ZMW'
    };

    const payoutRes = await fetch(`${vesicashUrl}/payment/payout`, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${vesicashApiKey}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(payoutPayload)
    });

    if (!payoutRes.ok) {
        const errorText = await payoutRes.text();
         await supabase.from('vendor_payouts').update({
            status: 'failed',
            failure_reason: `Vesicash API Error: ${errorText}`
        }).eq('id', payout_id);
        throw new Error(`Vesicash payout failed: ${errorText}`);
    }

    const payoutData = await payoutRes.json();
    // Assuming payoutData contains a reference ID

    // 4. Update Status to Processing (or Completed if synchronous?)
    // Usually Payouts are async, so set to 'processing' and wait for webhook.
    // If Vesicash returns 'success' immediately:
    await supabase.from('vendor_payouts').update({
        status: 'processing', // waiting for webhook
        payout_reference: payoutData.reference || payoutData.id,
        metadata: { vesicash_response: payoutData }
    }).eq('id', payout_id);

    // 5. Audit
    await supabase.from('financial_audit_logs').insert({
        event_type: 'payout_initiated',
        entity_type: 'vendor_payout',
        entity_id: payout_id,
        amount: payout.amount,
        metadata: { recipient_id: recipientId }
    });

    return new Response(
      JSON.stringify({ success: true, reference: payoutData.reference }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Error in process-vendor-payout:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400 
      }
    )
  }
})
