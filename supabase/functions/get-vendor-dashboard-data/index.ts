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

    const authHeader = req.headers.get('Authorization')
    if (!authHeader) throw new Error('Unauthorized')

    const userSupabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } }
    )
    const { data: { user }, error: userError } = await userSupabase.auth.getUser();
    if (userError || !user) throw new Error('Unauthorized')

    const { data: vendor } = await supabase
      .from('vendors')
      .select('id')
      .eq('owner_id', user.id)
      .maybeSingle()

    if (!vendor) throw new Error('Vendor profile not found')

    const [
      { count: totalProducts },
      { data: orders },
      { data: wallet }
    ] = await Promise.all([
      supabase.from('products').select('*', { count: 'exact', head: true }).eq('vendor_id', user.id), // vendor_id in products is user.id
      supabase.from('orders').select('*, payments(*)').eq('vendor_id', vendor.id),
      supabase.from('vendor_wallets').select('balance').eq('vendor_id', vendor.id).maybeSingle()
    ])

    const totalRevenue = (orders || [])
      .filter(o => o.payment_status === 'paid')
      .reduce((sum, o) => sum + Number(o.total_amount || 0), 0)

    return new Response(
      JSON.stringify({
        metrics: [
          { label: "My Revenue", value: `$${totalRevenue.toLocaleString()}`, icon: "DollarSign", change: "+5%" },
          { label: "My Orders", value: orders?.length || 0, icon: "ShoppingCart", change: "+2" },
          { label: "My Products", value: totalProducts || 0, icon: "Package", change: "0" },
          { label: "Wallet Balance", value: `K${(wallet?.balance || 0).toLocaleString()}`, icon: "DollarSign", change: "—" }
        ],
        recentOrders: orders?.slice(0, 5) || []
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
