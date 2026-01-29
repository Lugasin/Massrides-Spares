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

    // Get auth user
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) throw new Error('No authorization header');
    
    const { data: { user } } = await supabase.auth.getUser(authHeader.replace('Bearer ', ''));
    if (!user) throw new Error('Unauthorized');

    // 1. Get Vendor(s) for user
    const { data: vendorUsers, error: vuError } = await supabase
      .from('vendor_users')
      .select('vendor_id')
      .eq('user_id', user.id);

    if (vuError || !vendorUsers || vendorUsers.length === 0) {
      return new Response(
        JSON.stringify({ dashboardData: {
           totalRevenue: 0, totalOrders: 0, recentOrders: [], lowStockProducts: [], totalProducts: 0
        }}),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
      );
    }

    const vendorIds = vendorUsers.map(vu => vu.vendor_id);

    // 2. Get Statistics
    // Get all products for these vendors
    const { data: products } = await supabase
      .from('products')
      .select('id, name, stock_quantity')
      .in('vendor_id', vendorIds);

    const productIds = products?.map(p => p.id) || [];

    // Get order items for these products
    const { data: orderItems } = await supabase
      .from('order_items')
      .select('*, order:orders(*)')
      .in('product_id', productIds);

    const validItems = orderItems?.filter(item => item.order) || [];
    const uniqueOrders = [...new Map(validItems.map(item => [item.order.id, item.order])).values()];
    
    const totalRevenue = validItems.reduce((sum, item) => sum + (Number(item.price_snapshot) * item.quantity), 0);

    // 3. Low stock products
    const lowStockProducts = products?.filter(p => p.stock_quantity < 10) || [];

    const dashboardData = {
      totalRevenue,
      totalOrders: uniqueOrders.length,
      recentOrders: uniqueOrders.sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()).slice(0, 5),
      lowStockProducts: lowStockProducts.slice(0, 5),
      totalProducts: products?.length || 0,
    };

    return new Response(
      JSON.stringify({ dashboardData }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    )

  } catch (error: any) {
    console.error('Vendor Dashboard Data Error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
    )
  }
})