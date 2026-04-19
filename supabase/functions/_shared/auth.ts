import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

interface AuthResult {
  userId: string
  profile: any
  role: string
}

// SECURITY DEFINER function to bypass RLS recursion
export async function assertAdminOrSuperAdmin(authHeader: string, supabaseUrl: string, supabaseKey: string): Promise<AuthResult> {
  const token = authHeader.replace('Bearer ', '')
  if (!token) {
    throw new Error('No authorization token provided')
  }

  const supabase = createClient(supabaseUrl, supabaseKey, {
    global: {
      headers: { Authorization: `Bearer ${token}` }
    }
  })
  if (!token) {
    throw new Error('No authorization token provided')
  }

  // Verify the JWT and get user
  const { data: { user }, error: authError } = await supabase.auth.getUser(token)
  if (authError || !user) {
    throw new Error('Invalid or expired token')
  }

  // Use SECURITY DEFINER function to get role without RLS issues
  const { data: roleData, error: roleError } = await supabase
    .rpc('current_user_role', { user_id: user.id })

  if (roleError) {
    console.error('Role check error:', roleError)
    throw new Error('Failed to verify user permissions')
  }

  const role = roleData || 'guest'

  if (role !== 'admin' && role !== 'super_admin') {
    throw new Error('Access denied: Admin or Super Admin role required')
  }

  // Get full profile
  const { data: profile, error: profileError } = await supabase
    .from('user_profiles')
    .select('*')
    .eq('user_id', user.id)
    .single()

  if (profileError) {
    console.error('Profile fetch error:', profileError)
    throw new Error('Failed to load user profile')
  }

  return {
    userId: user.id,
    profile,
    role
  }
}

export async function getCurrentUser(authHeader: string, supabaseUrl: string, supabaseKey: string): Promise<AuthResult> {
  const token = authHeader.replace('Bearer ', '')
  if (!token) {
    throw new Error('No authorization token provided')
  }

  const supabase = createClient(supabaseUrl, supabaseKey, {
    global: {
      headers: { Authorization: `Bearer ${token}` }
    }
  })
  if (!token) {
    throw new Error('No authorization token provided')
  }

  const { data: { user }, error: authError } = await supabase.auth.getUser(token)
  if (authError || !user) {
    throw new Error('Invalid or expired token')
  }

  // Use SECURITY DEFINER function for role
  const { data: roleData, error: roleError } = await supabase
    .rpc('current_user_role', { user_id: user.id })

  if (roleError) {
    console.error('Role check error:', roleError)
    throw new Error('Failed to verify user permissions')
  }

  const role = roleData || 'guest'

  const { data: profile, error: profileError } = await supabase
    .from('user_profiles')
    .select('*')
    .eq('user_id', user.id)
    .single()

  if (profileError) {
    console.error('Profile fetch error:', profileError)
    throw new Error('Failed to load user profile')
  }

  return {
    userId: user.id,
    profile,
    role
  }
}