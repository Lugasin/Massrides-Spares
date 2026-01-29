import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface NotificationRequest {
  user_id?: string;
  role?: string;
  title: string;
  message: string;
  type: string;
  action_url?: string;
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

    const body: NotificationRequest = await req.json()

    // Create notification (user_id or role can be used)
    const { data, error } = await supabase
      .from('notifications')
      .insert({
        user_id: body.user_id || null,
        role: body.role || null,
        title: body.title,
        message: body.message,
        type: body.type,
        action_url: body.action_url
      })
      .select()
      .single()

    if (error) throw error

    return new Response(
      JSON.stringify({ success: true, notification: data }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    )

  } catch (error: any) {
    console.error('Notification error:', error)
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
    )
  }
})