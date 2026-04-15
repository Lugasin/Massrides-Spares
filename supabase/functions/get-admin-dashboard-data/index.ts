import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { assertAdminOrSuperAdmin } from '../_shared/auth.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) throw new Error('Authorization required')

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, serviceKey)

    // Authenticate (Basic check)
    const { data: { user }, error: authError } = await createClient(supabaseUrl, Deno.env.get('SUPABASE_ANON_KEY')!).auth.getUser(authHeader.replace('Bearer ', ''))
    if (authError || !user) throw new Error('Invalid token')

    const [
      { count: totalUsers },
      { count: totalVendors },
      { data: orderStats },
      { data: recentPayments }
    ] = await Promise.all([
      supabase.from('profiles').select('*', { count: 'exact', head: true }),
      supabase.from('vendors').select('*', { count: 'exact', head: true }),
      supabase.from('orders').select('status, total_amount, created_at'),
      supabase.from('payments').select('*, order:orders(order_number)').order('created_at', { ascending: false }).limit(5)
    ])

    const totalRevenue = (orderStats || [])
      .reduce((sum, order) => sum + Number(order.total_amount || 0), 0)

    const pendingOrders = (orderStats || [])
      .filter(o => o.status === 'pending').length

    return new Response(
      JSON.stringify({
        metrics: [
          { label: "Total Revenue", value: `$${totalRevenue.toLocaleString()}`, icon: "DollarSign", change: "+12%" },
          { label: "Active Vendors", value: totalVendors || 0, icon: "Users", change: "+3" },
          { label: "Pending Orders", value: pendingOrders || 0, icon: "ShoppingCart", change: "-5%" },
          { label: "Total Users", value: totalUsers || 0, icon: "Users", change: "+18" }
        ],
        recentPayments
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    )

  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400
    })
  }
})
