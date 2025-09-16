import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface NotificationRequest {
  user_id: string;
  title: string;
  message: string;
  type: 'info' | 'success' | 'warning' | 'error' | 'welcome' | 'order' | 'payment' | 'message';
  action_url?: string;
  send_email?: boolean;
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

    // Create notification
    const { data, error } = await supabase
      .from('notifications')
      .insert({
        user_id: body.user_id,
        title: body.title,
        message: body.message,
        type: body.type,
        action_url: body.action_url
      })
      .select()
      .single()

    if (error) throw error

    // Log notification creation
    await supabase.from('activity_logs').insert({
      user_id: body.user_id,
      activity_type: 'notification_sent',
      additional_details: {
        notification_id: data.id,
        title: body.title,
        type: body.type
      },
      ip_address: '0.0.0.0',
      log_source: 'system'
    })

    // TODO: Send email notification if requested and email service is configured
    if (body.send_email) {
      try {
        await supabase.functions.invoke('send-notification-email', {
          body: {
            to: body.user_id, // This would need to be resolved to email
            subject: body.title,
            type: body.type,
            data: {
              message: body.message,
              action_url: body.action_url
            }
          }
        })
      } catch (emailError) {
        console.error('Failed to send email notification:', emailError)
        // Don't fail the main notification if email fails
      }
    }

    // Record metric
    await supabase.rpc('record_metric', {
      p_metric_name: 'notifications_sent',
      p_metric_value: 1,
      p_metric_unit: 'count',
      p_tags: {
        type: body.type,
        has_action: body.action_url ? 'yes' : 'no'
      }
    })

    return new Response(
      JSON.stringify({
        success: true,
        notification: data
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    )

  } catch (error) {
    console.error('Notification error:', error)
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