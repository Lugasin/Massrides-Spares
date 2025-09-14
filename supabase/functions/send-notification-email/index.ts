import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface EmailNotificationRequest {
  to: string;
  subject: string;
  type: 'security_alert' | 'payment_notification' | 'system_health' | 'order_update';
  data: any;
  priority?: 'low' | 'medium' | 'high' | 'critical';
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

    const body: EmailNotificationRequest = await req.json()
    
    // Check if RESEND_API_KEY is available
    const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')
    if (!RESEND_API_KEY) {
      console.log('RESEND_API_KEY not configured, storing notification for later processing')
      
      // Store notification in database for later processing
      const { error: storeError } = await supabase
        .from('notifications')
        .insert({
          user_id: null, // System notification
          title: body.subject,
          message: generateEmailContent(body.type, body.data),
          type: body.type,
          action_url: null
        })

      if (storeError) {
        console.error('Failed to store notification:', storeError)
      }

      return new Response(
        JSON.stringify({
          success: true,
          message: 'Notification stored for later processing (RESEND_API_KEY not configured)',
          stored: true
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200,
        }
      )
    }

    // Use dynamic import for Resend to handle missing API key gracefully
    const { Resend } = await import('npm:resend@4.0.0')
    const resend = new Resend(RESEND_API_KEY)

    const htmlContent = generateEmailHTML(body.type, body.data, body.subject)
    const textContent = generateEmailContent(body.type, body.data)

    const emailData = {
      from: 'MassRides Security <security@massrides.com>',
      to: [body.to],
      subject: body.subject,
      html: htmlContent,
      text: textContent,
    }

    const result = await resend.emails.send(emailData)

    if (result.error) {
      throw new Error(result.error.message)
    }

    // Log successful email send
    await supabase.rpc('log_security_event', {
      p_event_type: 'notification_sent',
      p_metadata: {
        email_type: body.type,
        priority: body.priority || 'medium',
        recipient: body.to,
        message_id: result.data?.id
      }
    })

    return new Response(
      JSON.stringify({
        success: true,
        message_id: result.data?.id,
        sent_at: new Date().toISOString()
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    )

  } catch (error) {
    console.error('Email notification error:', error)
    
    // Try to log the error
    try {
      const supabase = createClient(
        Deno.env.get('SUPABASE_URL') ?? '',
        Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
      )
      
      await supabase.rpc('log_security_event', {
        p_event_type: 'notification_failed',
        p_metadata: {
          error: error.message,
          email_type: (await req.json().catch(() => ({})))?.type || 'unknown'
        }
      })
    } catch (logError) {
      console.error('Failed to log email error:', logError)
    }

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

function generateEmailContent(type: string, data: any): string {
  switch (type) {
    case 'security_alert':
      return `Security Alert: ${data.event_type}\n\n` +
             `Risk Score: ${data.risk_score}/10\n` +
             `Time: ${data.created_at}\n` +
             `Details: ${JSON.stringify(data.metadata, null, 2)}\n\n` +
             `Please review this alert and take appropriate action if necessary.`

    case 'payment_notification':
      return `Payment Notification\n\n` +
             `Transaction ID: ${data.transaction_id}\n` +
             `Amount: $${data.amount}\n` +
             `Status: ${data.status}\n` +
             `Time: ${data.created_at}\n\n` +
             `Please verify this transaction in your payment dashboard.`

    case 'system_health':
      return `System Health Alert\n\n` +
             `Health Score: ${data.score}/100\n` +
             `Status: ${data.status}\n` +
             `Time: ${new Date().toISOString()}\n\n` +
             `${data.message || 'Please check the system monitoring dashboard for more details.'}`

    case 'order_update':
      return `Order Update\n\n` +
             `Order: ${data.order_number}\n` +
             `Status: ${data.status}\n` +
             `Customer: ${data.customer_name}\n` +
             `Time: ${data.updated_at}\n\n` +
             `The order status has been updated.`

    default:
      return `Notification: ${JSON.stringify(data, null, 2)}`
  }
}

function generateEmailHTML(type: string, data: any, subject: string): string {
  const baseHTML = `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${subject}</title>
    <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: #f8f9fa; padding: 20px; border-radius: 8px; margin-bottom: 20px; }
        .alert-critical { border-left: 4px solid #dc3545; }
        .alert-high { border-left: 4px solid #fd7e14; }
        .alert-medium { border-left: 4px solid #ffc107; }
        .alert-low { border-left: 4px solid #28a745; }
        .content { padding: 20px; background: #fff; border-radius: 8px; border: 1px solid #dee2e6; }
        .footer { margin-top: 20px; padding: 20px; background: #f8f9fa; border-radius: 8px; font-size: 12px; color: #6c757d; }
        .data-table { width: 100%; border-collapse: collapse; margin: 15px 0; }
        .data-table th, .data-table td { border: 1px solid #ddd; padding: 8px; text-align: left; }
        .data-table th { background-color: #f8f9fa; }
    </style>
</head>
<body>
    <div class="header ${getAlertClass(type, data)}">
        <h1>${subject}</h1>
        <p>Generated at: ${new Date().toISOString()}</p>
    </div>
    
    <div class="content">
        ${getTypeSpecificHTML(type, data)}
    </div>
    
    <div class="footer">
        <p>This is an automated notification from MassRides Security Monitoring System.</p>
        <p>Please do not reply to this email. For support, contact your system administrator.</p>
    </div>
</body>
</html>`

  return baseHTML
}

function getAlertClass(type: string, data: any): string {
  if (type === 'security_alert') {
    const riskScore = data.risk_score || 0
    if (riskScore >= 8) return 'alert-critical'
    if (riskScore >= 6) return 'alert-high'
    if (riskScore >= 4) return 'alert-medium'
    return 'alert-low'
  }
  return 'alert-medium'
}

function getTypeSpecificHTML(type: string, data: any): string {
  switch (type) {
    case 'security_alert':
      return `
        <h2>Security Event Details</h2>
        <table class="data-table">
          <tr><th>Event Type</th><td>${data.event_type || 'Unknown'}</td></tr>
          <tr><th>Risk Score</th><td>${data.risk_score || 0}/10</td></tr>
          <tr><th>Blocked</th><td>${data.blocked ? 'Yes' : 'No'}</td></tr>
          <tr><th>Time</th><td>${data.created_at || new Date().toISOString()}</td></tr>
          <tr><th>User ID</th><td>${data.user_id || 'N/A'}</td></tr>
          <tr><th>Transaction ID</th><td>${data.transaction_id || 'N/A'}</td></tr>
        </table>
        
        <h3>Additional Details</h3>
        <pre style="background: #f8f9fa; padding: 15px; border-radius: 4px; overflow-x: auto;">
${JSON.stringify(data.metadata || {}, null, 2)}
        </pre>
      `

    case 'payment_notification':
      return `
        <h2>Payment Transaction Details</h2>
        <table class="data-table">
          <tr><th>Transaction ID</th><td>${data.transaction_id || 'N/A'}</td></tr>
          <tr><th>Amount</th><td>$${data.amount || '0.00'}</td></tr>
          <tr><th>Currency</th><td>${data.currency || 'USD'}</td></tr>
          <tr><th>Status</th><td>${data.status || 'Unknown'}</td></tr>
          <tr><th>Customer</th><td>${data.customer_email || 'N/A'}</td></tr>
          <tr><th>Time</th><td>${data.created_at || new Date().toISOString()}</td></tr>
        </table>
      `

    case 'system_health':
      return `
        <h2>System Health Status</h2>
        <table class="data-table">
          <tr><th>Health Score</th><td>${data.score || 0}/100</td></tr>
          <tr><th>Status</th><td>${data.status || 'Unknown'}</td></tr>
          <tr><th>Uptime</th><td>${data.uptime_percentage || 'N/A'}%</td></tr>
          <tr><th>Last Check</th><td>${new Date().toISOString()}</td></tr>
        </table>
        
        ${data.message ? `<p><strong>Message:</strong> ${data.message}</p>` : ''}
      `

    case 'order_update':
      return `
        <h2>Order Status Update</h2>
        <table class="data-table">
          <tr><th>Order Number</th><td>${data.order_number || 'N/A'}</td></tr>
          <tr><th>New Status</th><td>${data.status || 'Unknown'}</td></tr>
          <tr><th>Customer</th><td>${data.customer_name || 'N/A'}</td></tr>
          <tr><th>Email</th><td>${data.customer_email || 'N/A'}</td></tr>
          <tr><th>Amount</th><td>$${data.total_amount || '0.00'}</td></tr>
          <tr><th>Updated</th><td>${data.updated_at || new Date().toISOString()}</td></tr>
        </table>
      `

    default:
      return `
        <h2>Notification Data</h2>
        <pre style="background: #f8f9fa; padding: 15px; border-radius: 4px; overflow-x: auto;">
${JSON.stringify(data, null, 2)}
        </pre>
      `
  }
}