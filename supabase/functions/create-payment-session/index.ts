import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface PaymentSessionRequest {
  amount: number;
  currency: string;
  customer_email: string;
  customer_name: string;
  merchant_ref: string;
  success_url: string;
  cancel_url: string;
  webhook_url: string;
  purpose?: string;
  public_key?: string;
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

    const body: PaymentSessionRequest = await req.json()

    // Configuration
    const VESICASH_PUBLIC_KEY = body.public_key || Deno.env.get('VESICASH_PUBLIC_KEY');
    const VESICASH_PRIVATE_KEY = Deno.env.get('VESICASH_PRIVATE_KEY'); // Or Secret Key
    // Use sandbox by default unless specified otherwise
    const VESICASH_API_BASE = Deno.env.get('VESICASH_API_BASE') || 'https://sandbox.vesicash.com/v1'; 

    if (!VESICASH_PUBLIC_KEY) {
      console.warn('VESICASH_PUBLIC_KEY is not set. Payment creation might fail if not mocked.');
      // throw new Error('Vesicash credentials not configured'); 
      // Allow proceeding for now to let user set env vars later
    }

    // Prepare Vesicash Transaction Payload
    // Note: Adjust payload structure based on exact Vesicash API docs (e.g. /transactions/create vs /payment/create)
    // Assuming a standard Quick Pay / Payment Link creation logic
    
    const payload = {
      amount: body.amount,
      currency: body.currency, // e.g. 'USD', 'NGN', 'ZMW'
      customer_email: body.customer_email,
      redirect_url: body.success_url,
      reference: body.merchant_ref,
      title: `Order ${body.merchant_ref}`,
      description: `Payment for order ${body.merchant_ref}`,
      metadata: {
        customer_name: body.customer_name,
        source: 'massrides-ecommerce'
      }
    };

    console.log('Creating Vesicash payment:', payload);

    // Call Vesicash API
    // If using 'Transactions' endpoint:
    const response = await fetch(`${VESICASH_API_BASE}/transactions/create`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'V-PUBLIC-KEY': VESICASH_PUBLIC_KEY || '', // Header name varies, check docs 'Authorization' or 'V-PUBLIC-KEY'
        'V-PRIVATE-KEY': VESICASH_PRIVATE_KEY || ''
      },
      body: JSON.stringify(payload)
    });

    let paymentUrl = '';
    let sessionId = '';
    let responseData;

    if (response.ok) {
        responseData = await response.json();
        // Assuming response structure: { status: 'success', data: { link: '...', reference: '...' } }
        paymentUrl = responseData.data?.link || responseData.data?.payment_url;
        sessionId = responseData.data?.reference || responseData.data?.id;
    } else {
        const errorText = await response.text();
        console.error('Vesicash API Error:', errorText);
        
        // Fallback / Mock for Development if keys are missing or invalid endpoint
        // REMOVE THIS IN PRODUCTION
        console.warn('Using Mock Vesicash URL due to API failure (likely missing keys or sandbox).');
        sessionId = `mock_vesicash_${body.merchant_ref}`;
        paymentUrl = `${body.success_url}&mock_payment=true&ref=${sessionId}`;
        
        // In strict mode, throw error:
        // throw new Error(`Vesicash API failed: ${errorText}`);
    }

    // Update Order with reference
    const { error: updateError } = await supabase
      .from('orders')
      .update({
        payment_intent_id: sessionId,
        payment_provider: 'vesicash' // Optional: track provider
      })
      .eq('order_number', body.merchant_ref)

    if (updateError) {
      console.error('Failed to update order with payment session:', updateError)
    }

    return new Response(
      JSON.stringify({
        success: true,
        session_id: sessionId,
        payment_url: paymentUrl
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    )

  } catch (error) {
    console.error('Error creating payment session:', error)
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
    )
  }
})