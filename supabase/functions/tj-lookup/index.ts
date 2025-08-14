import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface LookupRequest {
  transactionId?: string;
  sessionId?: string;
  merchantRef?: string;
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

    const body: LookupRequest = await req.json()
    const { transactionId, sessionId, merchantRef } = body

    // TODO: Replace these placeholders with your actual TJ credentials
    const TJ_CLIENT_ID = Deno.env.get('TJ_CLIENT_ID') ?? '<replace_with_TJ_client_id>'
    const TJ_CLIENT_SECRET = Deno.env.get('TJ_CLIENT_SECRET') ?? '<replace_with_TJ_client_secret>'
    const TJ_OAUTH_TOKEN_URL = Deno.env.get('TJ_OAUTH_TOKEN_URL') ?? '<replace_with_TJ_oauth_token_url>'
    const TJ_API_BASE_URL = Deno.env.get('TJ_API_BASE_URL') ?? '<replace_with_TJ_api_base_url>'
    const TJ_TRAN_LOOKUP_PATH = Deno.env.get('TJ_TRAN_LOOKUP_PATH') ?? '/transactions/lookup'

    if (!transactionId && !sessionId && !merchantRef) {
      throw new Error('At least one identifier required: transactionId, sessionId, or merchantRef')
    }

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

    // Build lookup URL with query parameters
    let lookupUrl = `${TJ_API_BASE_URL}${TJ_TRAN_LOOKUP_PATH}`
    const params = new URLSearchParams()
    
    if (transactionId) params.append('transactionId', transactionId)
    if (sessionId) params.append('sessionId', sessionId)
    if (merchantRef) params.append('merchantRef', merchantRef)
    
    lookupUrl += `?${params.toString()}`

    const lookupResponse = await fetch(lookupUrl, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      }
    })

    if (!lookupResponse.ok) {
      const errorData = await lookupResponse.text()
      console.error('TJ Lookup Error:', errorData)
      throw new Error('Failed to lookup transaction')
    }

    const transactionData = await lookupResponse.json()

    // Log lookup request
    await supabase.from('tj_transaction_logs').insert({
      transaction_id: transactionId,
      session_id: sessionId,
      payload: {
        event: 'transaction_lookup',
        request: { transactionId, sessionId, merchantRef },
        response: transactionData
      }
    })

    return new Response(
      JSON.stringify({
        success: true,
        transaction: transactionData
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    )

  } catch (error) {
    console.error('TJ lookup error:', error)
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