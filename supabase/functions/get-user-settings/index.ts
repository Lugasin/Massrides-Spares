import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: req.headers.get('Authorization')! } } }
    );

    const { data: { user }, error: userError } = await supabase.auth.getUser();

    // ✅ CORRECTED DEFAULTS (Matching DB Schema)
    const defaultSettings = { 
      theme: 'light', 
      currency: 'ZMW',
      language: 'en',
      timezone: 'Africa/Lusaka',
      email_notifications: true,
      push_notifications: true,
      marketing_emails: false,
      order_updates: true
    };

    if (userError || !user) {
      return new Response(JSON.stringify(defaultSettings), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const { data: settings } = await supabase
      .from('user_settings')
      .select('*')
      .eq('user_id', user.id)
      .maybeSingle();

    // Return DB settings OR defaults if row missing
    return new Response(JSON.stringify(settings || defaultSettings), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    // Fallback defaults
    return new Response(JSON.stringify({ 
      theme: 'light', 
      currency: 'ZMW',
      language: 'en',
      email_notifications: true,
      push_notifications: true,
      marketing_emails: false,
      order_updates: true
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});
