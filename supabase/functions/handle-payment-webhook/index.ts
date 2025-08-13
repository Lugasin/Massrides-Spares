import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { logPaymentEvent, logOrderEvent } from '../_shared/activityLogger.ts'

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
    console.log('Received webhook:', webhookData)
    
    // Log webhook receipt
    await supabase.from('tj_transaction_logs').insert({
      transaction_id: webhookData.transactionId,
      session_id: webhookData.sessionId,
      payment_intent_id: webhookData.paymentIntentId,
      payload: webhookData
    });
    
    // Handle Transaction Junction webhook format
    const {
      transactionId,
      sessionId,
      merchantRef,
      transactionStatus,
      amount,
      responseText,
      paymentType
    } = webhookData

    if (!merchantRef) {
      throw new Error('Missing merchant reference in webhook')
    }

    // Find the order
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .select('*')
      .eq('order_number', merchantRef)
      .single()

    if (orderError || !order) {
      throw new Error(`Order not found: ${merchantRef}`)
    }

    // Update order based on transaction status
    let orderStatus = 'pending'
    let paymentStatus = 'pending'

    switch (transactionStatus) {
      case 'PAYMENT_SETTLED':
      case 'PAYMENT_AUTHORISED':
        orderStatus = 'confirmed'
        paymentStatus = 'paid'
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
    }

    // Update order
    const { error: updateError } = await supabase
      .from('orders')
      .update({
        status: orderStatus,
        payment_status: paymentStatus,
        payment_intent_id: transactionId
      })
      .eq('id', order.id)

    if (updateError) {
      throw new Error(`Failed to update order: ${updateError.message}`)
    }
    
    // Log order update
    logOrderEvent('order_updated', order.id, order.user_id, {
      status: orderStatus,
      payment_status: paymentStatus,
      transaction_id: transactionId
    });

    // Clear cart after successful payment
    if (paymentStatus === 'paid') {
      if (order.user_id) {
        // Clear user cart
        const { data: userCart } = await supabase
          .from('carts')
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
          message: `Your payment for order ${merchantRef} has been processed successfully.`,
          type: 'success'
        })
      }
    } else if (paymentStatus === 'failed') {
      // Send failure notification if user exists
      if (order.user_id) {
        await supabase.from('notifications').insert({
          user_id: order.user_id,
          title: 'Payment Failed',
          message: `Your payment for order ${merchantRef} failed. Please try again or contact support.`,
          type: 'error'
        })
      }
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