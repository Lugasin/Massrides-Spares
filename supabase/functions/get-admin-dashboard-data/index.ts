import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { assertAdminOrSuperAdmin } from '../_shared/auth.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
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
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

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

    // Use service role for data queries to bypass RLS
    const supabase = createClient(supabaseUrl, serviceKey)

    // Get dashboard metrics
    const [
      { data: userStats, error: userError },
      { data: orderStats, error: orderError },
      { data: productStats, error: productError },
      { data: recentActivity, error: activityError }
    ] = await Promise.all([
      // User statistics
      supabase
        .from('user_profiles')
        .select('role, created_at')
        .order('created_at', { ascending: false }),

      // Order statistics
      supabase
        .from('orders')
        .select('status, payment_status, total_amount, created_at')
        .order('created_at', { ascending: false })
        .limit(100),

      // Product statistics
      supabase
        .from('products')
        .select('id, created_at, vendor_id'),

      // Recent activity (fallback to orders if activity_logs doesn't exist)
      supabase
        .from('activity_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(10)
        .catch(() =>
          supabase
            .from('orders')
            .select('id, order_number, status, created_at, user_id')
            .order('created_at', { ascending: false })
            .limit(10)
        )
    ])

    if (userError) {
      console.error('User stats error:', userError)
    }
    if (orderError) {
      console.error('Order stats error:', orderError)
    }
    if (productError) {
      console.error('Product stats error:', productError)
    }
    if (activityError) {
      console.log('Activity logs not available, using orders as fallback')
    }

    // Process user statistics
    const userRoleCounts = (userStats || []).reduce((acc: any, user: any) => {
      const role = user.role || 'customer'
      acc[role] = (acc[role] || 0) + 1
      return acc
    }, {})

    // Process order statistics
    const orderStatusCounts = (orderStats || []).reduce((acc: any, order: any) => {
      acc[order.status] = (acc[order.status] || 0) + 1
      return acc
    }, {})

    const totalRevenue = (orderStats || [])
      .filter((order: any) => order.payment_status === 'paid')
      .reduce((sum: number, order: any) => sum + (order.total_amount || 0), 0)

    // Process product statistics
    const totalProducts = productStats?.length || 0
    const activeVendors = new Set((productStats || []).map((p: any) => p.vendor_id)).size

    // Format recent activity
    const formattedActivity = (recentActivity || []).map((activity: any) => ({
      id: activity.id,
      action: activity.action || 'Order created',
      user_id: activity.user_id,
      metadata: activity.metadata || {},
      created_at: activity.created_at
    }))

    const dashboardData = {
      userStats: {
        total: userStats?.length || 0,
        byRole: userRoleCounts
      },
      orderStats: {
        total: orderStats?.length || 0,
        byStatus: orderStatusCounts,
        totalRevenue
      },
      productStats: {
        total: totalProducts,
        activeVendors
      },
      recentActivity: formattedActivity
    }

    return new Response(
      JSON.stringify(dashboardData),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      }
    )

  } catch (error) {
    console.error('Dashboard data error:', error)
    return new Response(
      JSON.stringify({
        error: 'Internal server error',
        details: error.message
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500
      }
    )
  }
})
