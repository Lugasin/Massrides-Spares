
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

serve(async (req) => {
  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const targetEmail = "mambwemwila1@gmail.com";
    console.log(`Attempting to promote ${targetEmail}...`);

    // 1. Get user ID from auth.users (via admin API)
    const { data: { users }, error: listError } = await supabase.auth.admin.listUsers();
    if (listError) throw listError;

    const user = users.find(u => u.email === targetEmail);
    if (!user) {
      return new Response(JSON.stringify({ error: "User not found" }), { status: 404 });
    }

    // 2. Update profiles
    const { error: pError } = await supabase
      .from('profiles')
      .upsert({ id: user.id, role: 'super_admin', email: targetEmail }, { onConflict: 'id' });
    if (pError) console.error("Profile error:", pError);

    // 3. Update user_profiles
    const { error: upError } = await supabase
      .from('user_profiles')
      .upsert({ user_id: user.id, role: 'super_admin', email: targetEmail }, { onConflict: 'user_id' });
    if (upError) console.error("User Profile error:", upError);

    return new Response(JSON.stringify({ 
      message: `Successfully promoted ${targetEmail} to super_admin`,
      userId: user.id 
    }), { 
      headers: { "Content-Type": "application/json" },
      status: 200 
    });

  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }
})
