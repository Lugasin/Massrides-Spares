import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { crypto } from "https://deno.land/std@0.168.0/crypto/mod.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-tj-signature',
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

    // Get webhook secret
    const webhookSecret = Deno.env.get('TJ_WEBHOOK_SECRET')
    if (!webhookSecret) {
      throw new Error('Webhook secret not configured')
    }

    // Verify webhook signature
    const signature = req.headers.get('X-TJ-Signature')
    if (!signature) {
      throw new Error('Missing webhook signature')
    }

    const body = await req.text()
    const expectedSignature = await crypto.subtle.digest(
      'SHA-256',
      new TextEncoder().encode(webhookSecret + body)
    )
    const expectedHex = Array.from(new Uint8Array(expectedSignature))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('')

    if (signature !== `sha256=${expectedHex}`) {
      throw new Error('Invalid webhook signature')
    }

    const webhookData = JSON.parse(body)
    
    // Handle different webhook events
    switch (webhookData.event) {
      case 'payment.completed':
        await handlePaymentCompleted(supabase, webhookData.data)
        break
      case 'payment.failed':
        await handlePaymentFailed(supabase, webhookData.data)
        break
      case 'payment.cancelled':
        await handlePaymentCancelled(supabase, webhookData.data)
        break
      default:
        console.log(`Unhandled webhook event: ${webhookData.event}`)
    }

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    })

  } catch (error) {
    console.error('Webhook error:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
    )
  }
})

async function handlePaymentCompleted(supabase: any, paymentData: any) {
  const { session_id, transaction_id, amount, merchant_ref } = paymentData

  // Update order status
  const { data: order, error: orderError } = await supabase
    .from('orders')
    .update({
      status: 'confirmed',
      payment_status: 'paid',
      gateway_transaction_id: transaction_id,
      payment_data: paymentData
    })
    .eq('order_number', merchant_ref)
    .select('*')
    .single()

  if (orderError) {
    throw new Error(`Failed to update order: ${orderError.message}`)
  }

  // Send notification to customer
  if (order.user_id) {
    await supabase.from('notifications').insert({
      user_id: order.user_id,
      title: 'Payment Confirmed',
      message: `Your payment for order ${merchant_ref} has been processed successfully.`,
      type: 'success',
      data: { order_id: order.id, transaction_id }
    })
  }

  // Send notification to admins
  const { data: adminProfiles } = await supabase
    .from('user_profiles')
    .select('id')
    .in('role_id', [
      supabase.from('roles').select('id').eq('name', 'admin'),
      supabase.from('roles').select('id').eq('name', 'super_admin')
    ])

  if (adminProfiles) {
    for (const profile of adminProfiles) {
      await supabase.from('notifications').insert({
        user_id: profile.id,
        title: 'New Order Confirmed',
        message: `Order ${merchant_ref} has been paid and confirmed.`,
        type: 'info',
        data: { order_id: order.id, transaction_id }
      })
    }
  }
}

async function handlePaymentFailed(supabase: any, paymentData: any) {
  const { session_id, merchant_ref, failure_reason } = paymentData

  // Update order status
  const { data: order, error: orderError } = await supabase
    .from('orders')
    .update({
      payment_status: 'failed',
      payment_data: paymentData
    })
    .eq('order_number', merchant_ref)
    .select('*')
    .single()

  if (orderError) {
    throw new Error(`Failed to update order: ${orderError.message}`)
  }

  // Send notification to customer
  if (order.user_id) {
    await supabase.from('notifications').insert({
      user_id: order.user_id,
      title: 'Payment Failed',
      message: `Your payment for order ${merchant_ref} failed. Please try again or contact support.`,
      type: 'error',
      data: { order_id: order.id, failure_reason }
    })
  }
}

async function handlePaymentCancelled(supabase: any, paymentData: any) {
  const { session_id, merchant_ref } = paymentData

  // Update order status
  const { data: order, error: orderError } = await supabase
    .from('orders')
    .update({
      payment_status: 'cancelled',
      payment_data: paymentData
    })
    .eq('order_number', merchant_ref)
    .select('*')
    .single()

  if (orderError) {
    throw new Error(`Failed to update order: ${orderError.message}`)
  }

  // Send notification to customer
  if (order.user_id) {
    await supabase.from('notifications').insert({
      user_id: order.user_id,
      title: 'Payment Cancelled',
      message: `Payment for order ${merchant_ref} was cancelled. You can retry payment from your orders page.`,
      type: 'warning',
      data: { order_id: order.id }
    })
  }
}