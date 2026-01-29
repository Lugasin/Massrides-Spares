import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface EmailRequest {
  to: string;
  type: string;
  order_id?: number;
  data?: any;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  );

  try {
    const { to, type, order_id, data }: EmailRequest = await req.json();

    // 1. Log the attempt
    const { data: logEntry, error: logError } = await supabase
      .from('email_logs')
      .insert({
        recipient: to,
        type,
        order_id,
        status: 'PENDING'
      })
      .select()
      .single();

    if (logError) throw logError;

    // 2. Prepare Email Content based on type
    let subject = "Update from Massrides";
    let html = `<p>Hello, this is a notification regarding your request (${type}).</p>`;

    if (type === 'ORDER_CREATED') {
      subject = `Order Confirmation #${data?.order_number}`;
      html = `<h1>Thank you for your order!</h1><p>Your order #${data?.order_number} has been received and is pending payment.</p>`;
    } else if (type === 'PAYMENT_SUCCESS') {
      subject = `Payment Successful - Order #${data?.order_number}`;
      html = `<h1>Payment Received!</h1><p>We have received your payment for order #${data?.order_number}. We are now processing your items.</p>`;
    }

    // 3. Send Email via Resend (Generic implementation)
    const resendKey = Deno.env.get('RESEND_API_KEY');

    if (resendKey) {
      const res = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${resendKey}`
        },
        body: JSON.stringify({
          from: 'Massrides <orders@massrides.co.zm>',
          to: [to],
          subject,
          html
        })
      });

      const result = await res.json();

      if (res.ok) {
        // Update log to SENT
        await supabase
          .from('email_logs')
          .update({ status: 'SENT', sent_at: new Date().toISOString() })
          .eq('id', logEntry.id);
      } else {
        // Update log to FAILED
        await supabase
          .from('email_logs')
          .update({ status: 'FAILED', error: JSON.stringify(result) })
          .eq('id', logEntry.id);
      }
    } else {
      console.warn("RESEND_API_KEY not set. Email logged but not sent.");
      await supabase
        .from('email_logs')
        .update({ status: 'FAILED', error: 'Missing API Key' })
        .eq('id', logEntry.id);
    }

    return new Response(JSON.stringify({ success: true, log_id: logEntry.id }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });

  } catch (error: any) {
    console.error("Email Error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    });
  }
});