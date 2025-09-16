import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface CreateSessionRequest {
  orderId: string;
  amount: number;
  currency: string;
  returnSuccessUrl: string;
  returnFailedUrl: string;
  customerEmail?: string;
  customerName?: string;
  purpose?: 'charge' | 'tokenize';
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

    const body: CreateSessionRequest = await req.json()
    const { orderId, amount, currency, returnSuccessUrl, returnFailedUrl, customerEmail, customerName, purpose = 'charge' } = body

    // TODO: Replace these placeholders with your actual TJ credentials
    const TJ_CLIENT_ID = Deno.env.get('TJ_CLIENT_ID') ?? '<replace_with_TJ_client_id>'
    const TJ_CLIENT_SECRET = Deno.env.get('TJ_CLIENT_SECRET') ?? '<replace_with_TJ_client_secret>'
    const TJ_OAUTH_TOKEN_URL = Deno.env.get('TJ_OAUTH_TOKEN_URL') ?? '<replace_with_TJ_oauth_token_url>'
    const TJ_API_BASE_URL = Deno.env.get('TJ_API_BASE_URL') ?? '<replace_with_TJ_api_base_url>'
    const TJ_CREATE_SESSION_PATH = Deno.env.get('TJ_CREATE_SESSION_PATH') ?? '/hpp/sessions'
    const TJ_MERCHANT_REF_PREFIX = Deno.env.get('TJ_MERCHANT_REF_PREFIX') ?? 'myplatform:order:'

    if (!orderId || !amount || !currency) {
      throw new Error('Missing required parameters: orderId, amount, currency')
    }

    // Get order details
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .select('*')
      .eq('id', orderId)
      .single()

    if (orderError || !order) {
      throw new Error(`Order not found: ${orderId}`)
    }

    // Update order status to pending_payment
    await supabase
      .from('orders')
      .update({ 
        status: 'pending_payment',
        updated_at: new Date().toISOString()
      })
      .eq('id', orderId)

    // Log security event
    await supabase.rpc('log_security_event', {
      p_event_type: 'payment_session_requested',
      p_user_id: order.user_id,
      p_transaction_id: order.order_number,
      p_amount: amount,
      p_metadata: {
        order_id: orderId,
        purpose: purpose,
        currency: currency
      }
    })

    // Get OAuth token from TJ
    const tokenResponse = await fetch(TJ_OAUTH_TOKEN_URL, {
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
      
      await supabase.rpc('log_security_event', {
        p_event_type: 'payment_auth_failed',
        p_user_id: order.user_id,
        p_transaction_id: order.order_number,
        p_risk_score: 8,
        p_metadata: { error: 'TJ OAuth failed', response: errorText }
      })
      
      throw new Error('Failed to authenticate with Transaction Junction')
    }

    const tokenData = await tokenResponse.json()
    const accessToken = tokenData.access_token

    // Create TJ session
    const merchantRef = `${TJ_MERCHANT_REF_PREFIX}${order.order_number}`
    const sessionPayload = {
      amount: purpose === 'tokenize' ? 0 : Math.round(amount * 100), // Convert to cents, 0 for tokenization
      currency: currency,
      merchantRef: merchantRef,
      returnSuccessUrl: returnSuccessUrl,
      returnFailedUrl: returnFailedUrl,
      customerEmail: customerEmail || order.billing_address?.email,
      customerName: customerName || `${order.billing_address?.firstName} ${order.billing_address?.lastName}`,
      description: purpose === 'tokenize' 
        ? `Tokenize payment method for customer ${customerName}`
        : `Payment for order ${order.order_number}`,
      expiresIn: 3600, // 1 hour
      webhookUrl: `${Deno.env.get('SUPABASE_URL')}/functions/v1/tj-webhook`,
      paymentMethods: ['CARD', 'EFT', 'INSTANT_EFT'],
      threeDSecure: 'required',
      savePaymentMethod: purpose === 'tokenize',
      metadata: {
        source: 'massrides-ecommerce',
        order_id: orderId,
        purpose: purpose
      }
    }

    const sessionResponse = await fetch(`${TJ_API_BASE_URL}${TJ_CREATE_SESSION_PATH}`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(sessionPayload)
    })

    if (!sessionResponse.ok) {
      const errorData = await sessionResponse.text()
      console.error('TJ Session Creation Error:', errorData)
      
      await supabase.rpc('log_security_event', {
        p_event_type: 'payment_session_failed',
        p_user_id: order.user_id,
        p_transaction_id: order.order_number,
        p_risk_score: 7,
        p_metadata: { error: 'TJ session creation failed', response: errorData }
      })
      
      throw new Error('Failed to create payment session')
    }

    const sessionData = await sessionResponse.json()

    // Save TJ session data to order
    const tjData = {
      sessionId: sessionData.sessionId,
      paymentIntentId: sessionData.paymentIntentId,
      redirectUrl: sessionData.redirectUrl,
      merchantRef: merchantRef,
      amount: amount,
      currency: currency,
      purpose: purpose,
      createdAt: new Date().toISOString()
    }

    await supabase
      .from('orders')
      .update({
        tj: tjData,
        payment_intent_id: sessionData.paymentIntentId,
        stripe_session_id: sessionData.sessionId, // Reusing this field for TJ session
        updated_at: new Date().toISOString()
      })
      .eq('id', orderId)

    // Log session creation
    await supabase.from('tj_transaction_logs').insert({
      order_id: orderId,
      session_id: sessionData.sessionId,
      payment_intent_id: sessionData.paymentIntentId,
      event_type: 'session_created',
      amount: amount,
      currency: currency,
      webhook_data: {
        event: 'session_created',
        request: sessionPayload,
        response: sessionData
      }
    })

    // Log successful session creation
    await supabase.rpc('log_security_event', {
      p_event_type: 'payment_session_created',
      p_user_id: order.user_id,
      p_transaction_id: order.order_number,
      p_metadata: {
        session_id: sessionData.sessionId,
        amount: amount,
        currency: currency,
        purpose: purpose
      }
    })

    return new Response(
      JSON.stringify({
        success: true,
        redirectUrl: sessionData.redirectUrl,
        sessionId: sessionData.sessionId
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    )

  } catch (error) {
    console.error('TJ session creation error:', error)
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