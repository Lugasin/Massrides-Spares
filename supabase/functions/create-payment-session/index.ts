import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

console.log("Loading create-payment-session...")

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // 1. Initialize Supabase Client (Service Role for Admin Access to Payments Table)
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const body = await req.json()
    const { order_id, order_reference, return_url } = body

    if (!order_id && !order_reference) {
        throw new Error("Missing order_id or order_reference")
    }

    console.log(`Creating payment session for Order: ${order_id || order_reference}`)

    // 2. Fetch Order Details
    let orderQuery = supabaseAdmin.from('orders').select('*');
    
    if (order_id) {
        orderQuery = orderQuery.eq('id', order_id);
    } else {
        orderQuery = orderQuery.eq('order_reference', order_reference);
    }

    const { data: order, error: orderError } = await orderQuery.single();
    
    if (orderError || !order) {
        throw new Error(`Order not found: ${orderError?.message}`)
    }

    // 3. Create 'payments' Record (State: PENDING)
    // This is the "Intent" phase. We promise to try and verify/collect money.
    // Use order.order_reference (from DB) or order_reference (passed in body) if db ref is somehow missing
    const refToUse = order.order_reference || order_reference || `ORD-${order.id}`;
    const merchant_ref = `PAY-${refToUse}-${Date.now().toString().slice(-4)}`;
    
    // Check for correct amount column (total vs total_amount)
    const amount = order.total || order.total_amount || 0;

    const { data: payment, error: paymentError } = await supabaseAdmin
        .from('payments')
        .insert({
            order_id: order.id,
            user_id: order.user_id,
            amount: amount,
            currency: 'USD', // Default
            merchant_reference: merchant_ref,
            status: 'PENDING',
            metadata: {
                source: 'web_checkout',
                initiated_by_ip: req.headers.get('x-forwarded-for') || 'unknown'
            }
        })
        .select()
        .single()

    if (paymentError) {
        throw new Error(`Failed to create payment record: ${paymentError.message}`)
    }

    // 4. Log Event: PAYMENT_INTENT_CREATED
    await supabaseAdmin.from('payment_events').insert({
        payment_id: payment.id,
        order_id: order.id,
        event_type: 'PAYMENT_INTENT_CREATED',
        new_status: 'PENDING',
        payload: { amount: amount, currency: 'USD', merchant_ref },
        source: 'system'
    })

    // 5. Interact with Vesicash API (or Mock)
    const VESICASH_API_BASE = Deno.env.get('VESICASH_API_BASE') || 'https://sandbox.vesicash.com/v1';
    const VESICASH_PUBLIC_KEY = Deno.env.get('VESICASH_PUBLIC_KEY');
    
    let paymentUrl = '';
    let providerRef = '';

    // MOCK MODE Logic (If no key provided or explicit mock request)
    if (!VESICASH_PUBLIC_KEY) {
        console.warn("Using MOCK Vesicash Implementation (No Public Key found)");
        providerRef = `mock_ref_${Date.now()}`;
        // Simulate a hosted checkout page via a simple redirect with success param
        // In real life this would be the Vesicash payment link
        paymentUrl = `${return_url || 'http://localhost:8080/checkout/success'}?order=${order.order_number}&mock_payment=true&ref=${providerRef}`;
    } else {
        // REAL API CALL
        const payload = {
            amount: amount,
            currency: 'USD',
            redirect_url: return_url,
            reference: merchant_ref,
            customer_email: order.customer_email || order.billing_address?.email || 'customer@example.com', 
            description: `Order ${refToUse}`
        };

        const apiRes = await fetch(`${VESICASH_API_BASE}/transactions/create`, { // Adjust endpoint as per docs
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'V-PUBLIC-KEY': VESICASH_PUBLIC_KEY
            },
            body: JSON.stringify(payload)
        });

        if (!apiRes.ok) {
            const errText = await apiRes.text();
            throw new Error(`Vesicash API Error: ${apiRes.status} ${errText}`);
        }

        const apiData = await apiRes.json();
        paymentUrl = apiData.data?.link || apiData.data?.payment_url; // Adjust based on actual response
        providerRef = apiData.data?.reference || apiData.data?.id;
    }

    // 6. Update Payment Record with Provider Info & Transition to AWAITING_PAYMENT
    const { error: updateError } = await supabaseAdmin
        .from('payments')
        .update({
            provider_reference: providerRef,
            payment_url: paymentUrl,
            status: 'AWAITING_PAYMENT',
            updated_at: new Date().toISOString()
        })
        .eq('id', payment.id)

    if (updateError) {
         console.error("Failed to update payment with provider info", updateError);
         // Don't fail the written request, but log it. 
    }

    // 7. Log Event: AWAITING_PAYMENT
    await supabaseAdmin.from('payment_events').insert({
        payment_id: payment.id,
        order_id: order.id,
        event_type: 'REDIRECTING_USER',
        previous_status: 'PENDING',
        new_status: 'AWAITING_PAYMENT',
        payload: { provider_ref: providerRef, payment_url: paymentUrl },
        source: 'system'
    })

    return new Response(
      JSON.stringify({
        success: true,
        payment_url: paymentUrl,
        merchant_reference: merchant_ref
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    )

  } catch (error) {
    console.error('Error in create-payment-session:', error)
    
    // Attempt to log failure to admin_alerts if possible (using a fresh client if needed, or just console)
    // We can't easily access the DB if the client init failed, but usually it's logic error.
    
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400, // Client error usually, or 500
      }
    )
  }
})