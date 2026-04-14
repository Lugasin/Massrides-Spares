import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { assertAdminOrSuperAdmin } from '../_shared/auth.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const allowedRoles = ['customer', 'vendor', 'admin', 'super_admin'] as const

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    // Authenticate and authorize user
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Authorization header required' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseKey = Deno.env.get('SUPABASE_ANON_KEY')!

    let authResult
    try {
      authResult = await assertAdminOrSuperAdmin(authHeader, supabaseUrl, supabaseKey)
    } catch (authError) {
      console.error('Auth error:', authError)
      return new Response(
        JSON.stringify({ error: authError.message }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const supabase = createClient(supabaseUrl, supabaseKey)

    const { userId, newRole } = await req.json();
    const nextRole = String(newRole ?? '').trim();

    if (!allowedRoles.includes(nextRole as typeof allowedRoles[number])) {
      return new Response(
        JSON.stringify({ error: 'Invalid role provided' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const { data: targetUser, error: targetUserError } = await supabase
      .from('user_profiles')
      .select('id, user_id, email, full_name, role')
      .eq('id', userId)
      .single();

    if (targetUserError || !targetUser) {
      console.error('Target user lookup error:', targetUserError)
      return new Response(
        JSON.stringify({ error: 'Target user not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (targetUser.user_id === authResult.userId) {
      return new Response(
        JSON.stringify({ error: 'You cannot change your own role' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Prevent admins from creating super_admins
    if (authResult.role === 'admin' && nextRole === 'super_admin') {
        return new Response(
            JSON.stringify({ error: 'Admin users cannot assign Super Admin role' }),
            { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
    }

    if (authResult.role === 'admin' && targetUser.role === 'super_admin') {
      return new Response(
        JSON.stringify({ error: 'Admin users cannot modify Super Admin accounts' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const { data, error } = await supabase
      .from('user_profiles')
      .update({ role: nextRole })
      .eq('id', userId)
      .select()
      .single();

    if (error) {
      console.error('Role update error:', error)
      throw new Error('Failed to update user role')
    }

    // Log the activity
    await supabase.from('activity_logs').insert({
      user_id: authResult.userId,
      action: 'user_role_updated',
      metadata: {
        actor_role: authResult.role,
        target_user_id: targetUser.id,
        target_email: targetUser.email,
        target_name: targetUser.full_name,
        previous_role: targetUser.role,
        next_role: nextRole,
      },
    });

    // Send notification to target user
    await supabase.from('notifications').insert({
      user_id: targetUser.id,
      title: 'Role updated',
      message: `Your account role is now ${nextRole}.`,
      type: 'info',
      link: '/profile',
    });

    return new Response(
      JSON.stringify({ user: data }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    )
  } catch (error) {
    console.error('Update user role error:', error)
    return new Response(
      JSON.stringify({
        error: 'Internal server error',
        details: error.message
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    )
  }
})
