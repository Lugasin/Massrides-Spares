import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface PaymentIntentRequest {
  amount: number;
  currency: string;
  customer_email: string;
  merchant_ref: string;
  description?: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const body: PaymentIntentRequest = await req.json()
    
    // Get TJ credentials
    const TJ_CLIENT_ID = Deno.env.get('TJ_CLIENT_ID')
    const TJ_CLIENT_SECRET = Deno.env.get('TJ_CLIENT_SECRET')
    const TJ_API_BASE = Deno.env.get('TJ_API_BASE') || 'https://secure.transactionjunction.com'

    if (!TJ_CLIENT_ID || !TJ_CLIENT_SECRET) {
      throw new Error('Transaction Junction credentials not configured')
    }

    // Get OAuth token
    const tokenResponse = await fetch(`${TJ_API_BASE}/oauth/token`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Authorization': `Basic ${btoa(`${TJ_CLIENT_ID}:${TJ_CLIENT_SECRET}`)}`
      },
      body: new URLSearchParams({
        grant_type: 'client_credentials',
        scope: 'payments'
      })
    })

    if (!tokenResponse.ok) {
      const errorText = await tokenResponse.text()
      console.error('TJ OAuth Error:', errorText)
      throw new Error('Failed to authenticate with Transaction Junction')
    }

    const tokenData = await tokenResponse.json()
    const accessToken = tokenData.access_token

    // Create payment intent (optional step according to TJ guide)
    const intentPayload = {
      amount: Math.round(body.amount * 100), // Convert to cents
      currency: body.currency,
      customerEmail: body.customer_email,
      merchantRef: body.merchant_ref,
      description: body.description || `Payment intent for order ${body.merchant_ref}`,
      metadata: {
        source: 'massrides-ecommerce',
        order_id: body.merchant_ref
      }
    }

    const intentResponse = await fetch(`${TJ_API_BASE}/v1/payment-intents`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(intentPayload)
    })

    if (!intentResponse.ok) {
      const errorData = await intentResponse.text()
      console.error('TJ Payment Intent Error:', errorData)
      throw new Error('Failed to create payment intent')
    }

    const intentData = await intentResponse.json()

    return new Response(
      JSON.stringify({
        success: true,
        payment_intent_id: intentData.paymentIntentId,
        status: intentData.status,
        amount: intentData.amount,
        currency: intentData.currency
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    )

  } catch (error) {
    console.error('Payment intent error:', error)
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