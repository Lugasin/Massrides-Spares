import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
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

    // Get user from Authorization header.
    const authHeader = req.headers.get('Authorization')!
    const userSupabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } }
    )
    const { data: { user } } = await userSupabase.auth.getUser();

    if (!user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 401,
        }
      )
    }

    // Check if the user is an admin or super_admin
    const { data: profile, error: profileError } = await supabase
      .from('user_profiles')
      .select('role')
      .eq('user_id', user.id)
      .single();

    if (profileError || !['admin', 'super_admin'].includes(profile.role)) {
        return new Response(
            JSON.stringify({ error: 'Forbidden' }),
            {
              headers: { ...corsHeaders, 'Content-Type': 'application/json' },
              status: 403,
            }
        )
    }

    // Fetch stats
    const [usersResponse, productsResponse, ordersResponse, quotesResponse] = await Promise.all([
        supabase.from('user_profiles').select('id', { count: 'exact' }),
        supabase.from('spare_parts').select('id', { count: 'exact' }),
        supabase.from('orders').select('id, total_amount', { count: 'exact' }),
        supabase.from('quotes').select('id', { count: 'exact' }).eq('status', 'pending')
    ]);

    // Calculate total revenue
    const totalRevenue = ordersResponse.data?.reduce((sum, order) => sum + (order.total_amount || 0), 0) || 0;

    const stats = {
      totalUsers: usersResponse.count || 0,
      totalProducts: productsResponse.count || 0,
      totalOrders: ordersResponse.count || 0,
      pendingQuotes: quotesResponse.count || 0,
      totalRevenue
    };

    // Fetch recent users
    const { data: recentUsers } = await supabase
      .from('user_profiles')
      .select('id, email, full_name, role, created_at')
      .order('created_at', { ascending: false })
      .limit(10);

    // Fetch recent products
    const { data: recentProducts } = await supabase
      .from('spare_parts')
      .select('id, name, price, availability_status, featured')
      .order('created_at', { ascending: false })
      .limit(10);

    const dashboardData = {
        stats,
        recentUsers,
        recentProducts
    };

    return new Response(
      JSON.stringify({ dashboardData }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    )
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
    )
  }
})
