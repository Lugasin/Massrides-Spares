import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { getVesicashApiHeaders, loadVesicashConfig } from "../_shared/vesicash.ts"
import { assertAdminOrSuperAdmin } from "../_shared/auth.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // AUTHORIZATION: Only admins and super admins may initiate payouts
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Authorization header required' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    try {
      await assertAdminOrSuperAdmin(
        authHeader,
        Deno.env.get('SUPABASE_URL')!,
        Deno.env.get('SUPABASE_ANON_KEY')!
      )
    } catch (authError) {
      return new Response(
        JSON.stringify({ error: 'Access denied: Admin or Super Admin role required' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )
    const vesicash = await loadVesicashConfig(supabase)

    const { payout_id } = await req.json()

    if (!payout_id) throw new Error('payout_id is required');

    // 1. Get Payout Record
    const { data: payout, error: payoutError } = await supabase
      .from('vendor_payouts')
      .select('*, vendor:user_profiles!vendor_id(full_name, metadata)')
      .eq('id', payout_id)
      .single();

    if (payoutError || !payout) throw new Error('Payout not found');
    if (payout.status !== 'pending') {
        return new Response(JSON.stringify({ success: false, message: 'Payout not pending' }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // 2. Get Vendor Payout Details from metadata
    const vendorMetadata = payout.vendor?.metadata || {};
    const payoutMethod = vendorMetadata.payout_method || 'bank';
    const bankAccount = vendorMetadata.bank_account;
    const mobileMoneyPhone = vendorMetadata.mobile_money_phone;

    // Validate payout details exist
    if (payoutMethod === 'bank') {
      if (!bankAccount?.account_number || !bankAccount?.bank_id) {
        await supabase.from('vendor_payouts').update({
          status: 'on_hold',
          failure_reason: 'Missing bank account details'
        }).eq('id', payout_id);
        throw new Error('Vendor bank account details missing');
      }
    } else if (payoutMethod === 'mobile_money') {
      if (!mobileMoneyPhone) {
        await supabase.from('vendor_payouts').update({
          status: 'on_hold',
          failure_reason: 'Missing mobile money number'
        }).eq('id', payout_id);
        throw new Error('Vendor mobile money number missing');
      }
    }

    // 3. Get Vesicash Config
    if (!vesicash.secretKey || !vesicash.publicKey) {
      throw new Error('Vesicash API keys are not configured.');
    }

    const countryId = vesicash.countryId;
    if (!countryId) {
      throw new Error('Vesicash Country ID not configured.');
    }

    // 4. Build Payout Payload based on method
    let payoutPayload: Record<string, unknown>;
    
    if (payoutMethod === 'mobile_money') {
      // Format phone to E.164 (remove + if present)
      const phoneNumber = mobileMoneyPhone.replace(/^\+/, '').replace(/\s/g, '');
      payoutPayload = {
        amount: payout.amount,
        countryId: countryId,
        transfer_to: 'mobile_number',
        momo_phone_number: phoneNumber
      };
    } else {
      // Bank transfer
      payoutPayload = {
        amount: payout.amount,
        countryId: countryId,
        transfer_to: 'bank',
        bank_id: bankAccount.bank_id,
        account_number: bankAccount.account_number
      };
    }

    // 5. Call Vesicash Payout API with correct headers
    const payoutEndpoint = `${vesicash.apiBaseUrl}/payment/payouts/process`;
    console.log('Calling Vesicash payout endpoint:', payoutEndpoint);
    console.log('Payout payload:', JSON.stringify(payoutPayload));

    const payoutRes = await fetch(payoutEndpoint, {
      method: 'POST',
      headers: getVesicashApiHeaders(vesicash),
      body: JSON.stringify(payoutPayload)
    });

    const payoutData: Record<string, any> = await payoutRes.json();
    console.log('Vesicash response:', JSON.stringify(payoutData));

    if (!payoutRes.ok || payoutData.status === 'error') {
      const errorMsg = payoutData.message || payoutData.error || 'Unknown error';
      await supabase.from('vendor_payouts').update({
        status: 'failed',
        failure_reason: `Vesicash API Error: ${errorMsg}`
      }).eq('id', payout_id);
      throw new Error(`Vesicash payout failed: ${errorMsg}`);
    }

    // 6. Update Status to Processing
    await supabase.from('vendor_payouts').update({
      status: 'processing',
      payout_reference: payoutData.data?.reference || payoutData.data?.id || payoutData.reference,
      metadata: { 
        vesicash_response: payoutData,
        payout_method: payoutMethod,
        bankAccount: payoutMethod === 'bank' ? { last4: bankAccount.account_number?.slice(-4) } : null,
        mobile_phone: payoutMethod === 'mobile_money' ? mobileMoneyPhone : null
      }
    }).eq('id', payout_id);

    // 7. Audit Log
    await supabase.from('financial_audit_logs').insert({
      event_type: 'payout_initiated',
      entity_type: 'vendor_payout',
      entity_id: payout_id,
      amount: payout.amount,
      metadata: { 
        payout_method: payoutMethod,
        reference: payoutData.data?.reference 
      }
    });

    return new Response(
      JSON.stringify({ 
        success: true, 
        reference: payoutData.data?.reference,
        status: payoutData.data?.status || 'processing'
      }),
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
