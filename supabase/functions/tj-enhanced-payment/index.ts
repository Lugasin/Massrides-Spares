import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface PaymentRequest {
  amount: number;
  currency: string;
  customer_email: string;
  customer_name: string;
  merchant_ref: string;
  success_url: string;
  cancel_url: string;
  webhook_url: string;
  purpose?: 'charge' | 'tokenize';
  user_id?: string;
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

    const body: PaymentRequest = await req.json()
    const userAgent = req.headers.get('user-agent') || ''
    const ipAddress = req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || ''

    // Enhanced security logging
    await supabase.rpc('log_security_event', {
      p_event_type: 'payment_initiated',
      p_user_id: body.user_id || null,
      p_transaction_id: body.merchant_ref,
      p_amount: body.amount,
      p_ip_address: ipAddress,
      p_user_agent: userAgent,
      p_risk_score: calculateRiskScore(body, userAgent, ipAddress),
      p_metadata: {
        purpose: body.purpose || 'charge',
        currency: body.currency,
        customer_email: body.customer_email
      }
    })

    // Record payment metrics
    await supabase.rpc('record_metric', {
      p_metric_name: 'payment_requests_total',
      p_metric_value: 1,
      p_metric_unit: 'count',
      p_tags: {
        purpose: body.purpose || 'charge',
        currency: body.currency,
        amount_range: getAmountRange(body.amount)
      }
    })

    // Get TJ credentials
    const TJ_CLIENT_ID = Deno.env.get('TJ_CLIENT_ID')
    const TJ_CLIENT_SECRET = Deno.env.get('TJ_CLIENT_SECRET')
    const TJ_API_BASE = Deno.env.get('TJ_API_BASE') || 'https://secure.transactionjunction.com'

    if (!TJ_CLIENT_ID || !TJ_CLIENT_SECRET) {
      await supabase.rpc('log_security_event', {
        p_event_type: 'payment_config_error',
        p_user_id: body.user_id || null,
        p_transaction_id: body.merchant_ref,
        p_risk_score: 10,
        p_blocked: true,
        p_metadata: { error: 'TJ credentials not configured' }
      })
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
      
      await supabase.rpc('log_security_event', {
        p_event_type: 'payment_auth_failed',
        p_user_id: body.user_id || null,
        p_transaction_id: body.merchant_ref,
        p_risk_score: 8,
        p_metadata: { error: 'TJ OAuth failed', response: errorText }
      })
      
      throw new Error('Failed to authenticate with Transaction Junction')
    }

    const tokenData = await tokenResponse.json()
    const accessToken = tokenData.access_token

    // Create enhanced payment session
    const sessionPayload = {
      amount: body.purpose === 'tokenize' ? 0 : Math.round(body.amount * 100),
      currency: body.currency || 'USD',
      customerEmail: body.customer_email,
      customerName: body.customer_name,
      merchantRef: body.merchant_ref,
      redirectSuccessUrl: body.success_url,
      redirectFailedUrl: body.cancel_url,
      webhookUrl: body.webhook_url,
      paymentMethods: ['CARD', 'EFT', 'INSTANT_EFT'],
      expiresIn: 3600,
      description: body.purpose === 'tokenize' 
        ? `Tokenize payment method for customer ${body.customer_name}`
        : `Payment for order ${body.merchant_ref}`,
      metadata: {
        source: 'massrides-ecommerce-enhanced',
        order_id: body.merchant_ref,
        purpose: body.purpose || 'charge',
        user_id: body.user_id || null,
        risk_score: calculateRiskScore(body, userAgent, ipAddress)
      },
      threeDSecure: 'required',
      savePaymentMethod: body.purpose === 'tokenize',
      // Enhanced fraud detection
      customerData: {
        ipAddress: ipAddress,
        userAgent: userAgent,
        email: body.customer_email,
        name: body.customer_name
      }
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
      console.error('TJ Session Creation Error:', errorData)
      
      await supabase.rpc('log_security_event', {
        p_event_type: 'payment_session_failed',
        p_user_id: body.user_id || null,
        p_transaction_id: body.merchant_ref,
        p_risk_score: 7,
        p_metadata: { error: 'TJ session creation failed', response: errorData }
      })
      
      throw new Error('Failed to create payment session')
    }

    const sessionData = await sessionResponse.json()
    const sessionId = sessionData.data?.session_id || sessionData.ipgwSId

    // Update order with payment session
    const { error: updateError } = await supabase
      .from('orders')
      .update({
        payment_intent_id: sessionId,
        stripe_session_id: sessionId,
        tj: {
          sessionId: sessionId,
          status: 'created',
          createdAt: new Date().toISOString(),
          riskScore: calculateRiskScore(body, userAgent, ipAddress),
          metadata: sessionPayload.metadata
        }
      })
      .eq('order_number', body.merchant_ref)

    if (updateError) {
      console.error('Failed to update order with payment session:', updateError)
    }

    // Log successful session creation
    await supabase.rpc('log_security_event', {
      p_event_type: 'payment_session_created',
      p_user_id: body.user_id || null,
      p_transaction_id: body.merchant_ref,
      p_risk_score: calculateRiskScore(body, userAgent, ipAddress),
      p_metadata: {
        session_id: sessionId,
        amount: body.amount,
        currency: body.currency,
        purpose: body.purpose || 'charge'
      }
    })

    // Record success metrics
    await supabase.rpc('record_metric', {
      p_metric_name: 'payment_sessions_created',
      p_metric_value: 1,
      p_metric_unit: 'count',
      p_tags: {
        purpose: body.purpose || 'charge',
        currency: body.currency,
        status: 'success'
      }
    })

    return new Response(
      JSON.stringify({
        success: true,
        session_id: sessionId,
        payment_url: sessionData.data?.redirect_url || sessionData.redirectUrl,
        risk_score: calculateRiskScore(body, userAgent, ipAddress),
        expires_at: new Date(Date.now() + 3600000).toISOString()
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    )

  } catch (error) {
    console.error('Error creating enhanced payment session:', error)
    
    // Log error
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )
    
    await supabase.rpc('log_security_event', {
      p_event_type: 'payment_error',
      p_transaction_id: (await req.json().catch(() => ({})))?.merchant_ref || 'unknown',
      p_risk_score: 10,
      p_blocked: true,
      p_metadata: { error: error.message }
    })

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

function calculateRiskScore(paymentData: PaymentRequest, userAgent: string, ipAddress: string): number {
  let score = 0;
  
  // Amount-based risk
  if (paymentData.amount > 10000) score += 3;
  else if (paymentData.amount > 5000) score += 2;
  else if (paymentData.amount > 1000) score += 1;
  
  // Currency risk
  if (paymentData.currency !== 'USD' && paymentData.currency !== 'ZMW') score += 1;
  
  // User agent analysis
  if (!userAgent || userAgent.length < 50) score += 2;
  if (userAgent.includes('bot') || userAgent.includes('curl')) score += 5;
  
  // IP analysis (basic)
  if (!ipAddress) score += 2;
  
  // Email analysis
  const emailDomain = paymentData.customer_email.split('@')[1];
  const suspiciousDomains = ['tempmail.com', '10minutemail.com', 'guerrillamail.com'];
  if (suspiciousDomains.includes(emailDomain)) score += 3;
  
  return Math.min(score, 10); // Cap at 10
}

function getAmountRange(amount: number): string {
  if (amount < 100) return '0-100';
  if (amount < 500) return '100-500';
  if (amount < 1000) return '500-1000';
  if (amount < 5000) return '1000-5000';
  return '5000+';
}