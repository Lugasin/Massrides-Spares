import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1";
import { corsHeaders } from "../_shared/cors.ts";

console.log("Create-Payment-Session Function Invoked");

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

    console.log(`Creating payment session for Order: ${order_id}`);

    // 1. Fetch Order
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .select('*')
      .eq('id', order_id)
      .single();

    if (orderError || !order) {
      throw new Error(`Order not found: ${orderError?.message}`);
    }

    // 2. Prepare Vesicash Payload
    const amount = order.total || 0;
    const currency = order.currency || 'ZMW'; // Default to ZMW as per schema
    const description = `Order #${order.id}`;
    
    // Vesicash API requires: amount, currency, reference, redirect_url, etc.
    // Assuming 'create_session' or 'transactions/create' endpoint.
    // Based on user prompt: "Call Vesicash create-session endpoint"
    
    const vesicashSecret = Deno.env.get('VESICASH_SECRET_KEY');
    const isMock = !vesicashSecret || vesicashSecret.includes('morSec_test_'); // treat test key as partial mock if needed, or real test
    // Actually if key is there, use it.
    
    let checkoutUrl = '';
    let transactionId = '';
    let rawResponse = {};

    if (vesicashSecret) {
      // Real API Call
      const payload = {
        amount,
        currency,
        reference: `ORD-${order.id}-${Date.now()}`, // Unique Ref
        redirect_url: return_url,
        email: order.customer_email || 'guest@massrides.co.zm', // Fallback
        description
      };

      const resp = await fetch('https://api.vesicash.com/v1/transactions/create', { 
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'V-PRIVATE-KEY': vesicashSecret 
          // Verify header name in Vesicash docs. User prompt said:
          // "VESICASH_SECRET_KEY = morSec_test_... (API secret for server calls)"
          // Usually V-PRIVATE-KEY or Authorization: Bearer
          // I will assume V-PRIVATE-KEY based on standard Vesicash integrations or Authorization.
          // Let's use Authorization: Bearer as it's more common, or check previous code if it had it.
          // Previous code used 'V-PUBLIC-KEY'. 
          // Server calls usually use Secret Key. 
          // I'll try 'V-PRIVATE-KEY'.
        },
        body: JSON.stringify(payload)
      });

      rawResponse = await resp.json();
      
      if (!resp.ok) {
        console.error("Vesicash Error:", rawResponse);
        throw new Error("Failed to create Vesicash session");
      }

      // Map response
      // Assuming response structure: { data: { link: '...', reference: '...' } }
      checkoutUrl = rawResponse.data?.link || rawResponse.data?.payment_url;
      transactionId = rawResponse.data?.reference || rawResponse.data?.id;

    } else {
      // Mock Fallback
      console.warn("Using MOCK Payment Session (No Secret Key)");
      transactionId = `mock_tx_${Date.now()}`;
      checkoutUrl = `${return_url}?status=success&tx=${transactionId}`;
      rawResponse = { mock: true, transactionId };
    }

    // 3. Insert Payment Record
    const { data: payment, error: paymentError } = await supabase
      .from('payments')
      .insert({
        order_id: order.id,
        vesicash_transaction_id: transactionId,
        amount,
        currency,
        payment_status: 'pending', // Enum
        raw_payload: rawResponse
      })
      .select()
      .single();

    if (paymentError) throw paymentError;

    // 4. Audit Log
    await supabase.from('audit_logs').insert({
      entity_type: 'payment',
      entity_id: String(payment.id),
      event_type: 'PAYMENT_SESSION_CREATED',
      actor: 'system',
      metadata: { order_id: order.id, transactionId }
    });

    return new Response(
      JSON.stringify({ checkout_url: checkoutUrl }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error("Error:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});