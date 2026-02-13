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
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'No authorization header' }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 401,
        }
      )
    }

    const { data: { user }, error: authError } = await supabase.auth.getUser(authHeader.replace('Bearer ', ''));
    
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 401,
        }
      )
    }

    // Check user role from public.user_profiles
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('id, role')
      .eq('user_id', user.id)
      .single();
    
    // Check if user is vendor or admin
    if (!profile || !['vendor', 'admin', 'super_admin'].includes(profile.role)) {
       return new Response(
        JSON.stringify({ error: 'Forbidden' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 403 }
      )
    }

    const ProfileId = profile.id; // Correct ID to filter by
    
    // 1. Get vendor's spare parts stats
    let productsQuery = supabase
      .from('spare_parts')
      .select('id, name, price, stock_quantity, low_stock_threshold');
    
    // If not admin, restrict to own parts
    if (profile.role === 'vendor') {
      productsQuery = productsQuery.eq('vendor_id', ProfileId);
    }
    
    const { data: products, error: productsError } = await productsQuery;

    if (productsError) throw productsError;

    const lowStockProducts = products.filter((p: any) => p.stock_quantity <= (p.low_stock_threshold || 5));

    // 2. Get vendor orders via order_items
    // We need order items where spare_part.vendor_id = me
    // Since we queried spare_parts above, we have their IDs.
    const productIds = products.map((p: any) => p.id);
    
    if (productIds.length > 0) {
      const { data: orderItems, error: itemsError } = await supabase
        .from('order_items')
        .select(`
          order_id,
          quantity,
          price,
          created_at,
          orders (
            order_number,
            status,
            created_at
          )
        `)
        .in('spare_part_id', productIds)
        .order('created_at', { ascending: false });

      if (itemsError) throw itemsError;

      // Calculate Total Revenue
      const totalRevenue = orderItems.reduce((sum: number, item: any) => sum + (Number(item.price) * item.quantity), 0);
      
      // Calculate Unique Orders Count
      const uniqueOrderIds = new Set(orderItems.map((item: any) => item.order_id));
      const totalOrders = uniqueOrderIds.size;

      // Group items by order for Recent Orders list
      // Since one order can have multiple items from this vendor, we group them.
      const recentOrdersMap = new Map();
      
      orderItems.forEach((item: any) => {
        if (!recentOrdersMap.has(item.order_id)) {
          recentOrdersMap.set(item.order_id, {
            id: item.order_id,
            order_number: item.orders?.order_number || 'Unknown',
            created_at: item.orders?.created_at || item.created_at,
            status: item.orders?.status || 'pending',
            total_amount: 0 // Sum of my items only
          });
        }
        const order = recentOrdersMap.get(item.order_id);
        order.total_amount += (Number(item.price) * item.quantity);
      });

      const recentOrders = Array.from(recentOrdersMap.values()).slice(0, 5);

      const dashboardData = {
        totalRevenue,
        totalOrders,
        recentOrders,
        lowStockProducts: lowStockProducts.slice(0, 5),
        totalProducts: products.length,
        currency: 'ZMW'
      };

      return new Response(
        JSON.stringify({ dashboardData }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
      );
    } else {
      // No products found for vendor
      return new Response(
        JSON.stringify({ 
          dashboardData: { 
            totalRevenue: 0, totalOrders: 0, recentOrders: [], lowStockProducts: [], totalProducts: 0, currency: 'ZMW' 
          } 
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
      );
    }

  } catch (error: any) {
    console.error('get-vendor-dashboard-data error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
    )
  }
})
