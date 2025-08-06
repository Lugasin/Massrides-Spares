import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface LookupRequest {
  transaction_id?: string;
  merchant_ref?: string;
  session_id?: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const body: LookupRequest = await req.json()
    
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

    let lookupUrl = `${TJ_API_BASE}/v1/transactions`
    
    // Build lookup URL based on available identifiers
    if (body.transaction_id) {
      lookupUrl += `/${body.transaction_id}`
    } else if (body.session_id) {
      lookupUrl += `?sessionId=${body.session_id}`
    } else if (body.merchant_ref) {
      lookupUrl += `?merchantRef=${encodeURIComponent(body.merchant_ref)}`
    } else {
      throw new Error('Please provide transaction_id, session_id, or merchant_ref')
    }

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
    console.error('Transaction lookup error:', error)
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