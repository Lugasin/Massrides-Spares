import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface VerificationRequest {
  email: string;
  session_id: string;
}

interface VerifyCodeRequest {
  email: string;
  code: string;
  session_id: string;
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

    const url = new URL(req.url)
    const path = url.pathname

    if (path === '/guest-verification/send' && req.method === 'POST') {
      // Send verification code
      const body: VerificationRequest = await req.json()
      const { email, session_id } = body

      // Generate 6-digit verification code
      const verificationCode = Math.floor(100000 + Math.random() * 900000).toString()

      // Store verification in database
      const { error: insertError } = await supabase
        .from('guest_verifications')
        .insert({
          email,
          verification_code: verificationCode,
          session_id,
          expires_at: new Date(Date.now() + 60 * 60 * 1000).toISOString() // 1 hour
        })

      if (insertError) throw insertError

      // TODO: Send email with verification code
      // For now, we'll just return the code (in production, send via email service)
      console.log(`Verification code for ${email}: ${verificationCode}`)

      return new Response(
        JSON.stringify({
          success: true,
          message: 'Verification code sent to your email',
          // Remove this in production - only for testing
          code: verificationCode
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200,
        }
      )

    } else if (path === '/guest-verification/verify' && req.method === 'POST') {
      // Verify code
      const body: VerifyCodeRequest = await req.json()
      const { email, code, session_id } = body

      // Check verification code
      const { data: verification, error: verifyError } = await supabase
        .from('guest_verifications')
        .select('*')
        .eq('email', email)
        .eq('verification_code', code)
        .eq('session_id', session_id)
        .is('verified_at', null)
        .gt('expires_at', new Date().toISOString())
        .single()

      if (verifyError || !verification) {
        return new Response(
          JSON.stringify({
            success: false,
            error: 'Invalid or expired verification code'
          }),
          {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 400,
          }
        )
      }

      // Mark as verified
      const { error: updateError } = await supabase
        .from('guest_verifications')
        .update({ verified_at: new Date().toISOString() })
        .eq('id', verification.id)

      if (updateError) throw updateError

      return new Response(
        JSON.stringify({
          success: true,
          message: 'Email verified successfully'
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200,
        }
      )

    } else {
      return new Response(
        JSON.stringify({ error: 'Not found' }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 404,
        }
      )
    }

  } catch (error) {
    console.error('Guest verification error:', error)
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    )
  }
})