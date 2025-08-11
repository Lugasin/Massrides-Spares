import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface EmailRequest {
  email: string;
  type: 'signup' | 'recovery';
  redirect_to?: string;
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

    const body: EmailRequest = await req.json()
    const { email, type, redirect_to } = body

    if (type === 'signup') {
      // Resend signup confirmation
      const { error } = await supabase.auth.resend({
        type: 'signup',
        email: email,
        options: {
          emailRedirectTo: redirect_to || `${req.headers.get('origin')}/verify-email`
        }
      })

      if (error) throw error

      // Add notification for resend
      const { data: user } = await supabase.auth.admin.getUserByEmail(email)
      if (user.user) {
        await supabase.from('notifications').insert({
          user_id: user.user.id,
          title: 'Verification Email Sent',
          message: 'A new verification email has been sent to your inbox.',
          type: 'info'
        })
      }

    } else if (type === 'recovery') {
      // Send password recovery email
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: redirect_to || `${req.headers.get('origin')}/reset-password`
      })

      if (error) throw error
    }

    return new Response(
      JSON.stringify({ success: true, message: 'Email sent successfully' }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    )

  } catch (error) {
    console.error('Email sending error:', error)
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