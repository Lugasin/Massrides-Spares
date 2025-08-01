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
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      }
    )

    // Get authenticated user
    const authHeader = req.headers.get('Authorization')!
    const { data: { user }, error: authError } = await supabase.auth.getUser(authHeader.replace('Bearer ', ''))
    
    if (authError || !user) {
      throw new Error('Unauthorized')
    }

    const body: PaymentSessionRequest = await req.json()

    // Get TJ credentials from Supabase secrets
    const TJ_CLIENT_ID = Deno.env.get('TJ_OAUTH_CLIENT_ID')
    const TJ_CLIENT_SECRET = Deno.env.get('TJ_OAUTH_CLIENT_SECRET')
    const TJ_API_BASE = Deno.env.get('TJ_API_BASE') || 'https://secure.transactionjunction.com'

    if (!TJ_CLIENT_ID || !TJ_CLIENT_SECRET) {
      throw new Error('TJ credentials not configured')
    }

    // Get OAuth token
    const tokenResponse = await fetch(`${TJ_API_BASE}/oauth/token`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        grant_type: 'client_credentials',
        client_id: TJ_CLIENT_ID,
        client_secret: TJ_CLIENT_SECRET,
        scope: 'payments'
      })
    })

    if (!tokenResponse.ok) {
      throw new Error('Failed to get TJ access token')
    }

    const tokenData = await tokenResponse.json()
    const accessToken = tokenData.access_token

    // Create payment session
    const sessionPayload = {
      amount: Math.round(body.amount * 100), // Convert to cents
      currency: body.currency,
      customer: {
        email: body.customer_email,
        name: body.customer_name
      },
      merchant_ref: body.merchant_ref,
      redirect_urls: {
        success: body.success_url,
        cancel: body.cancel_url
      },
      webhook_url: body.webhook_url,
      payment_methods: ['card', 'eft', 'instant_eft'],
      expires_in: 3600 // 1 hour
    }

    const sessionResponse = await fetch(`${TJ_API_BASE}/v1/hosted-payments/sessions`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(sessionPayload)
    })

    if (!sessionResponse.ok) {
      const errorData = await sessionResponse.text()
      console.error('TJ API Error:', errorData)
      throw new Error('Failed to create payment session')
    }

    const sessionData = await sessionResponse.json()

    // Store payment session reference in order
    const { error: updateError } = await supabase
      .from('orders')
      .update({
        payment_gateway: 'transaction_junction',
        gateway_transaction_id: sessionData.data.session_id,
        payment_data: {
          session_id: sessionData.data.session_id,
          payment_url: sessionData.data.redirect_url
        }
      })
      .eq('order_number', body.merchant_ref)

    if (updateError) {
      console.error('Failed to update order with payment session:', updateError)
    }

    return new Response(
      JSON.stringify({
        success: true,
        session_id: sessionData.data.session_id,
        payment_url: sessionData.data.redirect_url
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