import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1";
import { corsHeaders } from "../_shared/cors.ts";

console.log("Check-Email Function Invoked");

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { email } = await req.json();

    if (!email) {
      throw new Error("Missing email");
    }

    // Use Admin API to list users by email
    const { data: users, error } = await supabase.auth.admin.listUsers();
    
    // Note: listUsers() lists all, but we can't filter by email in listUsers params in earlier versions?
    // Actually, generating types shows no search param.
    // However, getUserById exists. 
    // Wait, listUsers might be slow if many users.
    // Better: use getUser() effectively? No, need admin privs.
    
    // Alternative: Try to select from a private `profiles` table or `auth.users` via SQL if RLS allowed? No.
    // Best way: supabase.rpc? No.
    
    // Actually `supabase.auth.admin.listUsers` allows pagination but not filtering by email directly in JS v2?
    // Let's check docs mentally:  listUsers({ page: 1, perPage: 1000 })
    // If we have many users this is bad. 
    // BUT, we can use `supabase.from('user_profiles').select('id').eq('email', email).single()` 
    // assuming `user_profiles` is kept in sync and we use Service Role (bypassing RLS).
    
    // Let's check `user_profiles` table.
    // Users are automatically added to `user_profiles` via trigger usually?
    // I recall `user_profiles` has `email` column.
    
    const { data: profile, error: profileError } = await supabase
        .from('user_profiles')
        .select('id')
        .eq('email', email)
        .maybeSingle();

    if (profileError) {
        throw profileError;
    }
    
    // If profile exists, user exists?
    // What if they are in auth.users but not profiles? (Edge case).
    // Let's assume sync is good. Profiles is safest.

    return new Response(
      JSON.stringify({ exists: !!profile }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error("Error:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
