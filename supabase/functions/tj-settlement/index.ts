import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface SettlementRequest {
  transaction_id: string;
  action: 'settle' | 'reverse';
  amount?: number; // Optional for partial settlements
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

    const body: SettlementRequest = await req.json()
    
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

    // Perform settlement or reversal
    const endpoint = body.action === 'settle' ? 'settle' : 'reverse'
    const settlementPayload: any = {
      transactionId: body.transaction_id
    }

    // Add amount for partial settlements
    if (body.amount && body.action === 'settle') {
      settlementPayload.amount = Math.round(body.amount * 100)
    }

    const settlementResponse = await fetch(`${TJ_API_BASE}/v1/transactions/${body.transaction_id}/${endpoint}`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(settlementPayload)
    })

    if (!settlementResponse.ok) {
      const errorData = await settlementResponse.text()
      console.error(`TJ ${endpoint} Error:`, errorData)
      throw new Error(`Failed to ${endpoint} transaction`)
    }

    const settlementData = await settlementResponse.json()

    // Update order status in database
    const { error: updateError } = await supabase
      .from('orders')
      .update({
        payment_status: body.action === 'settle' ? 'settled' : 'reversed',
        updated_at: new Date().toISOString()
      })
      .eq('payment_intent_id', body.transaction_id)

    if (updateError) {
      console.error('Failed to update order status:', updateError)
    }

    return new Response(
      JSON.stringify({
        success: true,
        action: body.action,
        transaction_id: body.transaction_id,
        result: settlementData
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    )

  } catch (error) {
    console.error(`Settlement/Reversal error:`, error)
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