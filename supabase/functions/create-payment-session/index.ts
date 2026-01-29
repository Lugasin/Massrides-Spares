import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { order_id, return_url } = await req.json();

    if (!order_id) {
      throw new Error("Missing order_id");
    }

    // 1. Fetch Order
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .select('*')
      .eq('id', order_id)
      .single();

    if (orderError || !order) {
      throw new Error(`Order not found: ${orderError?.message}`);
    }

    // 2. Call Vesicash API
    const vesicashSecret = Deno.env.get('VESICASH_PRIVATE_KEY') || Deno.env.get('VESICASH_SECRET_KEY');
    const isMock = !vesicashSecret;
    
    let checkoutUrl = '';
    let transactionId = '';
    let rawResponse = {};

    if (!isMock) {
      const payload = {
        amount: order.total_amount,
        currency: order.currency || 'ZMW',
        reference: `ORD-${order.id}-${Date.now()}`,
        success_url: return_url || `${Deno.env.get('SITE_URL')}/checkout/success`,
        cancel_url: `${Deno.env.get('SITE_URL')}/checkout/cancel`,
        email: order.guest_email || 'customer@massrides.co.zm',
        metadata: { order_id: order.id }
      };

      const resp = await fetch('https://api.mor.vesicash.com/v1/transactions/create', { 
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'V-PRIVATE-KEY': vesicashSecret!
        },
        body: JSON.stringify(payload)
      });

      rawResponse = await resp.json();
      
      if (!resp.ok) {
        throw new Error(`Vesicash Error: ${JSON.stringify(rawResponse)}`);
      }

      checkoutUrl = rawResponse.data?.link || rawResponse.data?.payment_url;
      transactionId = rawResponse.data?.reference || rawResponse.data?.id;

    } else {
      console.warn("Using MOCK Payment Session");
      transactionId = `mock_tx_${Date.now()}`;
      checkoutUrl = `${return_url || ''}?status=success&tx=${transactionId}`;
      rawResponse = { mock: true, transactionId };
    }

    // 3. Insert Payment Record (Generic Table)
    const { data: payment, error: paymentError } = await supabase
      .from('payments')
      .insert({
        order_id: order.id,
        provider: 'vesicash',
        provider_reference: transactionId,
        amount: order.total_amount,
        currency: order.currency || 'ZMW',
        status: 'INITIATED',
        raw_payload: rawResponse
      })
      .select()
      .single();

    if (paymentError) throw paymentError;

    // 4. Update Order Status
    await supabase.from('orders').update({ status: 'INITIATED' }).eq('id', order.id);

    return new Response(
      JSON.stringify({ checkout_url: checkoutUrl, payment_id: payment.id }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error("Payment Session Error:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});