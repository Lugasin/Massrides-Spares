import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS'
}

interface LogRequest {
  activity_type: string;
  resource_type?: string;
  resource_id?: string;
  additional_details?: any;
}

interface RetrieveRequest {
  page?: number;
  pageSize?: number;
  action?: string;
  search?: string;
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

    const url = new URL(req.url)
    const action = url.searchParams.get('action') || 'log'

    if (action === 'log') {
      // Handle logging activity
      const authHeader = req.headers.get('Authorization')
      if (!authHeader) {
        throw new Error('Authorization header required')
      }

      // Get user from auth header
      const { data: { user }, error: authError } = await supabase.auth.getUser(
        authHeader.replace('Bearer ', '')
      )
      if (authError || !user) throw new Error('Invalid token')

      // Get user profile
      const { data: profile } = await supabase
        .from('user_profiles')
        .select('id, email')
        .eq('user_id', user.id)
        .single()

      const body: LogRequest = await req.json()
      
      // Extract client info
      const userAgent = req.headers.get('user-agent') || 'Unknown'
      const xForwardedFor = req.headers.get('x-forwarded-for')
      const ipAddress = xForwardedFor?.split(',')[0] || req.headers.get('x-real-ip') || 'Unknown'

      // Calculate basic risk score
      let riskScore = 0
      if (body.activity_type.includes('delete') || body.activity_type.includes('admin')) {
        riskScore += 50
      }
      if (body.additional_details?.suspicious_pattern) {
        riskScore += 30
      }

      // Insert activity log
      const { error: insertError } = await supabase
        .from('activity_logs')
        .insert({
          user_id: profile?.id,
          user_email: profile?.email || user.email,
          logged_by: profile?.id,
          activity_type: body.activity_type,
          resource_type: body.resource_type,
          resource_id: body.resource_id,
          additional_details: body.additional_details,
          ip_address: ipAddress,
          user_agent: userAgent,
          risk_score: riskScore,
          log_source: 'user_action'
        })

      if (insertError) throw insertError

      return new Response(
        JSON.stringify({ success: true, message: 'Activity logged' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )

    } else if (action === 'retrieve') {
      // Handle retrieving activity logs
      const authHeader = req.headers.get('Authorization')
      if (!authHeader) {
        throw new Error('Authorization header required')
      }

      // Get user and check permissions
      const { data: { user }, error: authError } = await supabase.auth.getUser(
        authHeader.replace('Bearer ', '')
      )
      if (authError || !user) throw new Error('Invalid token')

      // Check if user has admin permissions
      const { data: hasAdminRole } = await supabase.rpc('has_role', { 
        _user_id: user.id, 
        _role: 'admin' 
      })
      const { data: hasSuperAdminRole } = await supabase.rpc('has_role', { 
        _user_id: user.id, 
        _role: 'super_admin' 
      })

      if (!hasAdminRole && !hasSuperAdminRole) {
        throw new Error('Insufficient permissions')
      }

      // Parse query parameters
      const page = parseInt(url.searchParams.get('page') || '1')
      const pageSize = parseInt(url.searchParams.get('pageSize') || '50')
      const activityFilter = url.searchParams.get('activity_type')
      const search = url.searchParams.get('search')

      // Build query
      let query = supabase
        .from('activity_logs')
        .select(`
          id,
          activity_type,
          resource_type,
          resource_id,
          user_email,
          ip_address,
          user_agent,
          additional_details,
          risk_score,
          created_at
        `, { count: 'exact' })
        .order('created_at', { ascending: false })

      // Apply filters
      if (activityFilter) {
        query = query.eq('activity_type', activityFilter)
      }
      if (search) {
        query = query.or(`activity_type.ilike.%${search}%,user_email.ilike.%${search}%,resource_type.ilike.%${search}%`)
      }

      // Apply pagination
      const from = (page - 1) * pageSize
      query = query.range(from, from + pageSize - 1)

      const { data, error, count } = await query

      if (error) throw error

      return new Response(
        JSON.stringify({
          success: true,
          data: data || [],
          pagination: {
            page,
            pageSize,
            total: count || 0,
            totalPages: Math.ceil((count || 0) / pageSize)
          }
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )

    } else if (action === 'suspicious-activity') {
      // Handle suspicious activity detection (super admin only)
      const authHeader = req.headers.get('Authorization')
      if (!authHeader) {
        throw new Error('Authorization header required')
      }

      const { data: { user }, error: authError } = await supabase.auth.getUser(
        authHeader.replace('Bearer ', '')
      )
      if (authError || !user) throw new Error('Invalid token')

      const { data: hasSuperAdminRole } = await supabase.rpc('has_role', { 
        _user_id: user.id, 
        _role: 'super_admin' 
      })

      if (!hasSuperAdminRole) {
        throw new Error('Super admin access required')
      }

      // Get high risk activities
      const { data, error } = await supabase
        .from('activity_logs')
        .select('*')
        .gte('risk_score', 50)
        .order('created_at', { ascending: false })
        .limit(100)

      if (error) throw error

      return new Response(
        JSON.stringify({
          success: true,
          data: data || []
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )

    } else {
      throw new Error('Invalid action')
    }

  } catch (error) {
    console.error('Activity tracker error:', error)
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