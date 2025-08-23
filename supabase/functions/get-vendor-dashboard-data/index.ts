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

    // Get vendor profile
    const { data: vendorProfile, error: profileError } = await supabase
      .from('user_profiles')
      .select('id')
      .eq('user_id', user.id)
      .single();

    if (profileError) throw profileError;

    const vendorId = vendorProfile.id;

    // 1. Get vendor's products
    const { data: products, error: productsError } = await supabase
      .from('spare_parts')
      .select('id')
      .eq('vendor_id', vendorId);

    if (productsError) throw productsError;

    const productIds = products.map(p => p.id);

    // 2. Get orders containing vendor's products
    const { data: orderItems, error: orderItemsError } = await supabase
      .from('order_items')
      .select('*, order:orders(*)')
      .in('spare_part_id', productIds);

    if (orderItemsError) throw orderItemsError;

    const uniqueOrders = [...new Map(orderItems.map(item => [item.order.id, item.order])).values()];

    // 3. Calculate total revenue
    const totalRevenue = orderItems.reduce((sum, item) => sum + item.unit_price * item.quantity, 0);

    // 4. Get recent orders
    const recentOrders = uniqueOrders
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
      .slice(0, 5);

    // 5. Get low stock products
    const { data: lowStockProducts, error: lowStockError } = await supabase
      .from('spare_parts')
      .select('*')
      .eq('vendor_id', vendorId)
      .lt('stock_quantity', 10) // Assuming low stock is less than 10
      .order('stock_quantity', { ascending: true });

    if (lowStockError) throw lowStockError;

    const dashboardData = {
      totalRevenue,
      totalOrders: uniqueOrders.length,
      recentOrders,
      lowStockProducts,
      totalProducts: products.length,
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
