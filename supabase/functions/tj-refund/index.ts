import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface RefundRequest {
  transaction_id: string;
  amount?: number; // Optional for partial refunds
  reason?: string;
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

    const body: RefundRequest = await req.json()
    
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

    // Perform refund
    const refundPayload: any = {
      transactionId: body.transaction_id,
      reason: body.reason || 'Customer refund request'
    }

    // Add amount for partial refunds
    if (body.amount) {
      refundPayload.amount = Math.round(body.amount * 100)
    }

    const refundResponse = await fetch(`${TJ_API_BASE}/v1/transactions/${body.transaction_id}/refund`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(refundPayload)
    })

    if (!refundResponse.ok) {
      const errorData = await refundResponse.text()
      console.error('TJ Refund Error:', errorData)
      throw new Error('Failed to process refund')
    }

    const refundData = await refundResponse.json()

    // Update order status in database
    const { error: updateError } = await supabase
      .from('orders')
      .update({
        payment_status: body.amount ? 'partially_refunded' : 'refunded',
        updated_at: new Date().toISOString()
      })
      .eq('payment_intent_id', body.transaction_id)

    if (updateError) {
      console.error('Failed to update order status:', updateError)
    }

    // Add refund notification for user
    const { data: order } = await supabase
      .from('orders')
      .select('user_id, order_number')
      .eq('payment_intent_id', body.transaction_id)
      .single()

    if (order?.user_id) {
      await supabase.from('notifications').insert({
        user_id: order.user_id,
        title: 'Refund Processed',
        message: `Your refund for order ${order.order_number} has been processed successfully.`,
        type: 'info'
      })
    }

    return new Response(
      JSON.stringify({
        success: true,
        transaction_id: body.transaction_id,
        refund_amount: body.amount,
        result: refundData
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    )

  } catch (error) {
    console.error('Refund error:', error)
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