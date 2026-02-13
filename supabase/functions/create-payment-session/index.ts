import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

/**
 * Create Payment Session - Provider Agnostic
 * 
 * Unified payment states:
 * - pending: Order created, no payment initiated
 * - initiated: Payment session created
 * - redirected: User redirected to payment page
 * - processing: Payment in progress
 * - paid: Payment successful
 * - failed: Payment failed
 * - cancelled: Payment cancelled
 */

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

    const { 
      order_id, 
      return_url,
      cancel_url,
      customer_email,
      customer_name 
    } = await req.json();

    if (!order_id) {
      throw new Error("Missing order_id");
    }

    console.log(`Creating payment session for Order: ${order_id}`);

    // ==========================================
    // 1. Fetch Order
    // ==========================================
    
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .select('*')
      .eq('id', order_id)
      .single();

    if (orderError || !order) {
      throw new Error(`Order not found: ${orderError?.message}`);
    }

    // ==========================================
    // 2. Prepare Payment Details
    // ==========================================
    
    const amount = order.total_amount || order.total || 0;
    const currency = order.currency || 'ZMW';
    const email = customer_email || order.customer_email || order.guest_email || 'guest@massrides.co.zm';
    const description = `Order #${order.id}`;
    
    // Generate unique reference
    // Generate unique reference
    const reference = `ORD-${order.id}-${Date.now()}`;
    
    // AUTHORITATIVE: Use strict env vars
    const vesicashSecret = Deno.env.get('VESICASH_SECRET_KEY');
    const vesicashBaseUrl = Deno.env.get('VESICASH_BASE_URL') || 'https://api.vesicash.com';
    
    let checkoutUrl = '';
    let transactionId = '';
    let rawResponse: any = {};

    // ==========================================
    // 3. Create Payment Session (Vesicash)
    // ==========================================
    
    if (vesicashSecret) {
      console.log("Using Vesicash live/test API");
      
      // Extract customer info from order shipping_address or passed params
      const shippingAddress = order.shipping_address || {};
      const customerFirstName = shippingAddress.firstName || customer_name?.split(' ')[0] || 'Guest';
      const customerLastName = shippingAddress.lastName || customer_name?.split(' ').slice(1).join(' ') || '';
      const customerFullName = `${customerFirstName} ${customerLastName}`.trim() || customer_name || 'Guest Customer';
      const customerPhone = shippingAddress.phone || order.guest_phone || order.phone || '';
      const customerEmail = email;
      
      // Build enriched payload with ALL customer fields
      const payload = {
        // === AMOUNT & CURRENCY ===
        amount,
        currency,
        country: "ZM", 
        method: "mobilemoney",
        
        // === REFERENCE & DESCRIPTION ===
        reference,
        description: `Order #${order.id} – MassRides Spares`,
        narration: `Order #${order.id}`,
        
        // === CUSTOMER INFO (CRITICAL for merchant portal) ===
        // Flat fields (some gateways require this)
        customer_name: customerFullName,
        customer_email: customerEmail,
        customer_phone: customerPhone,
        email: customerEmail,  // Vesicash also accepts 'email'
        
        // Nested customer object (some gateways require this)
        customer: {
          name: customerFullName,
          first_name: customerFirstName,
          last_name: customerLastName,
          email: customerEmail,
          phone: customerPhone,
          phone_number: customerPhone  // Alternative field name
        },
        
        // === METADATA (for reporting & analytics) ===
        metadata: {
          order_id: order.id,
          user_id: order.user_id || 'guest',
          checkout_type: order.user_id ? 'authenticated' : 'guest',
          guest_email: order.guest_email,
          platform: 'massrides-pwa'
        },
        
        // === URLS ===
        redirect_url: return_url || `${Deno.env.get('CORS_ORIGIN') || 'https://massridesspares.netlify.app'}/checkout/success`,
        return_url: return_url,
        cancel_url: cancel_url,
        callback_url: `${Deno.env.get('SUPABASE_URL')}/functions/v1/handle-vesicash-webhook`,
        webhook_url: `${Deno.env.get('SUPABASE_URL')}/functions/v1/handle-vesicash-webhook`
      };

      console.log("Vesicash payload (enriched):", JSON.stringify(payload, null, 2));

      // AUTHORITATIVE CALL: Base URL + Bearer Token
      const resp = await fetch(`${vesicashBaseUrl}/payment/init`, { 
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${vesicashSecret}`
        },
        body: JSON.stringify(payload)
      });

      rawResponse = await resp.json();
      
      console.log("Vesicash Response Status:", resp.status);
      console.log("Vesicash Response:", JSON.stringify(rawResponse, null, 2));

      if (!resp.ok || rawResponse.status !== 'success') {
        console.error("Vesicash Error:", rawResponse);
        throw new Error(rawResponse.message || "Failed to create Vesicash session");
      }

      // Map response
      checkoutUrl = rawResponse.data?.link || rawResponse.data?.payment_link || rawResponse.data?.payment_url;
      transactionId = rawResponse.data?.reference || rawResponse.data?.payment_id || reference;

    } else {
      // ==========================================
      // 4. Mock Fallback (Development)
      // ==========================================
      
      console.warn("Using MOCK Payment Session (No Vesicash keys configured)");
      transactionId = `mock_tx_${Date.now()}`;
      checkoutUrl = `${return_url || 'http://localhost:8080/checkout/success'}?status=success&tx=${transactionId}&order=${order.id}`;
      rawResponse = { mock: true, transactionId };
    }

    // ==========================================
    // 5. Insert/Update Payment Record
    // ==========================================
    
    // Check if payment record already exists
    const { data: existingPayment } = await supabase
      .from('payments')
      .select('id')
      .eq('order_id', order.id)
      .single();

    if (existingPayment) {
      // Update existing payment
      const { error: updateError } = await supabase
        .from('payments')
        .update({
          provider_reference: transactionId,
          amount,
          currency,
          status: 'initiated',
          raw_payload: rawResponse,
          updated_at: new Date().toISOString()
        })
        .eq('id', existingPayment.id);

      if (updateError) {
        console.error("Payment update error:", updateError);
      }
    } else {
      // Create new payment
      const { error: paymentError } = await supabase
        .from('payments')
        .insert({
          order_id: order.id,
          provider: 'vesicash',
          provider_reference: transactionId,
          // Keep vesicash_transaction_id for backwards compatibility
          vesicash_transaction_id: transactionId,
          amount,
          currency,
          status: 'initiated',
          raw_payload: rawResponse
        });

      if (paymentError) {
        console.error("Payment insert error:", paymentError);
        throw new Error(`Failed to create payment record: ${paymentError.message}`);
      }
    }

    // ==========================================
    // 6. Update Order Status
    // ==========================================
    
    await supabase
      .from('orders')
      .update({ status: 'awaiting_payment' })
      .eq('id', order.id);

    // ==========================================
    // 7. Log Activity
    // ==========================================
    
    await supabase.from('activity_logs').insert({
      user_id: order.user_id || null,
      action: 'PAYMENT_SESSION_CREATED',
      metadata: { 
        order_id: order.id, 
        transactionId,
        provider: 'vesicash',
        amount,
        currency
      }
    });

    // ==========================================
    // Return Success
    // ==========================================
    
    return new Response(
      JSON.stringify({ 
        success: true,
        checkout_url: checkoutUrl,
        payment_url: checkoutUrl,  // Alias for compatibility
        transaction_id: transactionId,
        order_id: order.id
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error("Error:", error);
    return new Response(
      JSON.stringify({ 
        success: false,
        error: error.message 
      }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});