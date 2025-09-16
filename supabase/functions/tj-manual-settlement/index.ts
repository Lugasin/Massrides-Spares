import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface SettlementRequest {
  transactionId: string;
  action: 'settle' | 'reverse';
  amount?: number; // Optional for partial settlements
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

    // Verify admin access
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      throw new Error('Authorization required')
    }

    const userSupabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: { headers: { Authorization: authHeader } },
        auth: { persistSession: false }
      }
    )

    const { data: { user } } = await userSupabase.auth.getUser()
    if (!user) {
      throw new Error('Authentication required')
    }

    const { data: profile } = await supabase
      .from('user_profiles')
      .select('id, role')
      .eq('user_id', user.id)
      .single()

    if (!profile || !['admin', 'super_admin'].includes(profile.role)) {
      throw new Error('Admin access required')
    }

    const body: SettlementRequest = await req.json()
    const { transactionId, action, amount, reason } = body

    // TODO: Replace these placeholders with your actual TJ credentials
    const TJ_CLIENT_ID = Deno.env.get('TJ_CLIENT_ID') ?? '<replace_with_TJ_client_id>'
    const TJ_CLIENT_SECRET = Deno.env.get('TJ_CLIENT_SECRET') ?? '<replace_with_TJ_client_secret>'
    const TJ_OAUTH_TOKEN_URL = Deno.env.get('TJ_OAUTH_TOKEN_URL') ?? '<replace_with_TJ_oauth_token_url>'
    const TJ_API_BASE_URL = Deno.env.get('TJ_API_BASE_URL') ?? '<replace_with_TJ_api_base_url>'

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
      throw new Error('Failed to authenticate with Transaction Junction')
    }

    const tokenData = await tokenResponse.json()
    const accessToken = tokenData.access_token

    // Perform settlement or reversal
    const endpoint = action === 'settle' ? 'settle' : 'reverse'
    const settlementPayload: any = {
      transactionId: transactionId,
      reason: reason || `Manual ${action} by admin`
    }

    if (amount && action === 'settle') {
      settlementPayload.amount = Math.round(amount * 100) // Convert to cents
    }

    const settlementResponse = await fetch(`${TJ_API_BASE_URL}/transactions/${transactionId}/${endpoint}`, {
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

    // Update order status
    const { error: updateError } = await supabase
      .from('orders')
      .update({
        payment_status: action === 'settle' ? 'settled' : 'reversed',
        updated_at: new Date().toISOString()
      })
      .eq('payment_intent_id', transactionId)

    if (updateError) {
      console.error('Failed to update order status:', updateError)
    }

    // Log settlement action
    await supabase.from('tj_transaction_logs').insert({
      transaction_id: transactionId,
      event_type: `manual_${action}`,
      webhook_data: {
        event: `manual_${action}`,
        admin_user_id: user.id,
        request: settlementPayload,
        response: settlementData,
        performedAt: new Date().toISOString()
      }
    })

    await supabase.from('activity_logs').insert({
      user_id: profile.id,
      activity_type: `payment_${action}`,
      additional_details: {
        transaction_id: transactionId,
        amount: amount,
        reason: reason
      },
      ip_address: '0.0.0.0',
      log_source: 'admin_action'
    })

    return new Response(
      JSON.stringify({
        success: true,
        action: action,
        transactionId: transactionId,
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