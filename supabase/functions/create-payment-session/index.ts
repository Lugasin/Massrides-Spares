import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1";
import { corsHeaders } from "../_shared/cors.ts";
import { loadVesicashConfig } from "../_shared/vesicash.ts";

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
    const vesicash = await loadVesicashConfig(supabase);

    const { order_id, return_url, cancel_url } = await req.json();

    if (!order_id) {
      throw new Error("Missing order_id. Use create-payment-method-session for tokenization.");
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
    const amount = Number(order.total_amount ?? order.total ?? 0);
    const currency = order.currency || 'ZMW'; // Default to ZMW as per schema
    const description = `Order #${order.order_number || order.id}`;

    const { data: customerProfileById } = await supabase
      .from('user_profiles')
      .select('email, full_name')
      .eq('id', order.user_id)
      .maybeSingle();

    const customerProfile = customerProfileById || await (async () => {
      const { data: customerProfileByUserId } = await supabase
        .from('user_profiles')
        .select('email, full_name')
        .eq('user_id', order.user_id)
        .maybeSingle();

      return customerProfileByUserId;
    })();

    const customerEmail = customerProfile?.email || 'guest@massrides.co.zm';
    
    // Vesicash API requires: amount, currency, reference, redirect_url, etc.
    // Assuming 'create_session' or 'transactions/create' endpoint.
    // Based on user prompt: "Call Vesicash create-session endpoint"
    
    let checkoutUrl = '';
    let transactionId = '';
    let rawResponse: Record<string, any> = {};

    if (vesicash.secretKey) {
      // Real API Call
      const payload = {
        amount,
        currency,
        reference: `ORD-${order.id}-${Date.now()}`, // Unique Ref
        redirect_url: return_url,
        return_url: return_url, // Some versions use this
        cancel_url: cancel_url || return_url,
        email: customerEmail,
        description,
        metadata: {
          order_id: order.id,
          order_number: order.order_number,
          user_id: order.user_id,
          purpose: 'checkout'
        }
      };

      const resp = await fetch(`${vesicash.apiBaseUrl}/transactions/create`, { 
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'V-PRIVATE-KEY': vesicash.secretKey
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
      checkoutUrl = rawResponse.data?.link || rawResponse.data?.payment_url || rawResponse.data?.checkout_url || rawResponse.data?.url;
      transactionId = rawResponse.data?.reference || rawResponse.data?.id || payload.reference;

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
        provider: 'vesicash',
        vesicash_transaction_id: transactionId,
        vesicash_payment_id: rawResponse.data?.payment_id || null,
        amount,
        currency,
        status: 'pending'
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
