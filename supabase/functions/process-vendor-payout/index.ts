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

    // 1. Get Payout Record (assuming vendor_payouts exists or similar)
    const { data: payout, error: payoutError } = await supabase
      .from('payouts')
      .select('*')
      .eq('id', payout_id)
      .single();

    if (payoutError || !payout) throw new Error('Payout not found');

    // 2. Get Vendor Info
    const { data: vendor } = await supabase
      .from('vendors')
      .select('vesicash_recipient_id')
      .eq('id', payout.vendor_id)
      .single();
    
    const recipientId = vendor?.vesicash_recipient_id;

    if (!recipientId) {
        throw new Error('Vendor missing Vesicash Recipient ID');
    }

    // 3. Call Vesicash
    const vesicashSecret = Deno.env.get('VESICASH_PRIVATE_KEY') || Deno.env.get('VESICASH_SECRET_KEY');

    const payoutRes = await fetch('https://api.mor.vesicash.com/v1/payment/payout', {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${vesicashSecret}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            amount: payout.amount,
            recipient_id: recipientId,
            currency: payout.currency || 'ZMW'
        })
    });

    const payoutData = await payoutRes.json();

    if (!payoutRes.ok) {
        throw new Error(`Vesicash Payout Error: ${JSON.stringify(payoutData)}`);
    }

    // 4. Update Status
    await supabase.from('payouts').update({
        status: 'PROCESSING',
        payout_ref: payoutData.data?.reference
    }).eq('id', payout_id);

    return new Response(
      JSON.stringify({ success: true, reference: payoutData.data?.reference }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error: any) {
    console.error('Payout Error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
    )
  }
})