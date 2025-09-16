import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

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

    const webhookData = await req.json()
    console.log('Received TJ webhook:', webhookData)

    // TODO: Verify webhook signature if TJ_WEBHOOK_SECRET is set
    const TJ_WEBHOOK_SECRET = Deno.env.get('TJ_WEBHOOK_SECRET')
    if (TJ_WEBHOOK_SECRET && TJ_WEBHOOK_SECRET !== '<replace_with_webhook_secret_or_leave_empty>') {
      const signature = req.headers.get('x-tj-signature')
      // TODO: Implement signature verification logic here
      // const isValid = verifySignature(webhookData, signature, TJ_WEBHOOK_SECRET)
      // if (!isValid) throw new Error('Invalid webhook signature')
    }

    const {
      transactionId,
      sessionId,
      merchantRef,
      transactionStatus,
      amount,
      currency,
      paymentType,
      responseText,
      paymentMethodToken,
      customerInfo
    } = webhookData

    // Check for duplicate webhook (idempotency)
    const { data: existingLog } = await supabase
      .from('tj_transaction_logs')
      .select('id')
      .eq('transaction_id', transactionId)
      .eq('event_type', 'webhook_received')
      .single()

    if (existingLog) {
      console.log('Duplicate webhook ignored:', transactionId)
      return new Response(JSON.stringify({ success: true, message: 'Duplicate webhook ignored' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      })
    }

    // Log webhook receipt immediately
    await supabase.from('tj_transaction_logs').insert({
      transaction_id: transactionId,
      session_id: sessionId,
      payment_intent_id: webhookData.paymentIntentId,
      event_type: 'webhook_received',
      amount: amount,
      currency: currency,
      status: transactionStatus,
      webhook_data: {
        event: 'webhook_received',
        ...webhookData,
        receivedAt: new Date().toISOString()
      }
    })

    // Handle payment method tokenization
    if (webhookData.metadata?.purpose === 'tokenize' && transactionStatus === 'PAYMENT_SETTLED' && paymentMethodToken) {
      const { data: profile } = await supabase
        .from('user_profiles')
        .select('id')
        .eq('email', customerInfo?.email)
        .single();

      if (profile) {
        await supabase
          .from('tj_payment_methods')
          .insert({
            user_id: profile.id,
            payment_method_token: paymentMethodToken,
            brand: customerInfo?.cardBrand,
            last4: customerInfo?.cardLast4,
            exp_month: customerInfo?.cardExpMonth,
            exp_year: customerInfo?.cardExpYear,
            tj_customer_id: customerInfo?.customerId
          });
      }

      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      });
    }

    // Find order by merchantRef
    const TJ_MERCHANT_REF_PREFIX = Deno.env.get('TJ_MERCHANT_REF_PREFIX') ?? 'myplatform:order:'
    let order = null
    
    if (merchantRef && merchantRef.startsWith(TJ_MERCHANT_REF_PREFIX)) {
      const orderNumber = merchantRef.replace(TJ_MERCHANT_REF_PREFIX, '')
      const { data: orderByRef } = await supabase
        .from('orders')
        .select('*')
        .eq('order_number', orderNumber)
        .single()
      order = orderByRef
    }

    if (!order && sessionId) {
      const { data: orderBySession } = await supabase
        .from('orders')
        .select('*')
        .eq('stripe_session_id', sessionId)
        .single()
      order = orderBySession
    }

    if (!order) {
      throw new Error(`Order not found for merchantRef: ${merchantRef} or sessionId: ${sessionId}`)
    }

    // Update order status based on TJ transaction status
    let orderStatus = order.status
    let paymentStatus = order.payment_status

    switch (transactionStatus) {
      case 'PAYMENT_SETTLED':
        orderStatus = 'confirmed'
        paymentStatus = 'paid'
        break
      case 'PAYMENT_AUTHORISED':
        orderStatus = 'confirmed'
        paymentStatus = 'authorised'
        break
      case 'PAYMENT_FAILED':
      case 'PAYMENT_DECLINED':
        orderStatus = 'failed'
        paymentStatus = 'failed'
        break
      case 'PAYMENT_CANCELLED':
        orderStatus = 'cancelled'
        paymentStatus = 'cancelled'
        break
      default:
        console.log(`Unknown transaction status: ${transactionStatus}`)
        paymentStatus = 'unknown'
    }

    // Update order with TJ data
    const { error: updateError } = await supabase
      .from('orders')
      .update({
        status: orderStatus,
        payment_status: paymentStatus,
        payment_intent_id: transactionId,
        tj: {
          ...order.tj,
          transactionId: transactionId,
          transactionStatus: transactionStatus,
          amount: amount,
          currency: currency,
          paymentType: paymentType,
          responseText: responseText,
          settledAt: transactionStatus === 'PAYMENT_SETTLED' ? new Date().toISOString() : null,
          lastWebhookAt: new Date().toISOString()
        },
        updated_at: new Date().toISOString()
      })
      .eq('id', order.id)

    if (updateError) {
      console.error('Error updating order:', updateError)
      throw new Error(`Failed to update order: ${updateError.message}`)
    }

    // Clear cart after successful payment
    if (paymentStatus === 'paid' || paymentStatus === 'authorised') {
      if (order.user_id) {
        // Clear user cart
        const { data: userCart } = await supabase
          .from('user_carts')
          .select('id')
          .eq('user_id', order.user_id)
          .single()

        if (userCart) {
          await supabase
            .from('cart_items')
            .delete()
            .eq('cart_id', userCart.id)
        }

        // Send success notification
        await supabase.from('notifications').insert({
          user_id: order.user_id,
          title: 'Payment Confirmed',
          message: `Your payment for order ${order.order_number} has been processed successfully.`,
          type: 'payment',
          action_url: `/orders/${order.id}`
        })
      }

      // Log successful payment
      await supabase.from('activity_logs').insert({
        user_id: order.user_id,
        activity_type: 'payment_processed',
        additional_details: {
          order_id: order.id,
          order_number: order.order_number,
          amount: amount,
          currency: currency,
          transaction_id: transactionId,
          payment_type: paymentType
        },
        ip_address: '0.0.0.0',
        log_source: 'webhook'
      })
    } else if (paymentStatus === 'failed') {
      // Send failure notification if user exists
      if (order.user_id) {
        await supabase.from('notifications').insert({
          user_id: order.user_id,
          title: 'Payment Failed',
          message: `Your payment for order ${order.order_number} failed. Please try again or contact support.`,
          type: 'error',
          action_url: `/orders/${order.id}`
        })
      }

      // Log failed payment
      await supabase.from('activity_logs').insert({
        user_id: order.user_id,
        activity_type: 'payment_failed',
        additional_details: {
          order_id: order.id,
          order_number: order.order_number,
          amount: amount,
          currency: currency,
          transaction_id: transactionId,
          response_text: responseText
        },
        ip_address: '0.0.0.0',
        log_source: 'webhook'
      })
    }

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    })

  } catch (error) {
    console.error('TJ webhook error:', error)
    
    // Log webhook error
    try {
      const supabase = createClient(
        Deno.env.get('SUPABASE_URL') ?? '',
        Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
      )
      
      await supabase.from('activity_logs').insert({
        activity_type: 'webhook_error',
        additional_details: {
          error: error.message,
          webhook_data: await req.json().catch(() => ({}))
        },
        ip_address: '0.0.0.0',
        log_source: 'webhook'
      })
    } catch (logError) {
      console.error('Failed to log webhook error:', logError)
    }

    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
    )
  }
})