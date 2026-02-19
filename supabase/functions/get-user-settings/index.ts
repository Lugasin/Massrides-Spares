import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': Deno.env.get('CORS_ORIGIN') ?? 'https://massridesspares.netlify.app',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Create a Supabase client with the Auth context of the user that called the function.
// This client is used to verify the user's JWT.
const supabase = createClient(
  Deno.env.get("SUPABASE_URL") ?? "",
  Deno.env.get("SUPABASE_ANON_KEY") ?? ""
);

// Create a Supabase admin client to perform database operations.
const supabaseAdmin = createClient(
  Deno.env.get("SUPABASE_URL") ?? "",
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
);

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    /* ----------------------------------
       DIAGNOSTICS
    ----------------------------------- */
    console.log("--- DEBUG START: get-user-settings ---");
    console.log("SUPABASE_URL exists:", !!Deno.env.get("SUPABASE_URL"));
    console.log("ANON_KEY exists:", !!Deno.env.get("SUPABASE_ANON_KEY"));

    const headers: Record<string, string> = {};
    req.headers.forEach((v, k) => {
        if (k.toLowerCase() === 'authorization') {
            headers[k] = v.substring(0, 15) + "...";
        } else {
            headers[k] = v;
        }
    });
    console.log("Request Headers:", JSON.stringify(headers));

    const authHeader = req.headers.get("authorization");
    if (!authHeader) {
      throw new Error("Missing Authorization header");
    }

    const { data: { user }, error: userError } = await supabase.auth.getUser(
      authHeader.replace("Bearer ", "")
    );

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

    const { data: settings } = await supabaseAdmin
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
