import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': Deno.env.get('CORS_ORIGIN') ?? 'https://massridesspares.netlify.app',
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

    // Check user role from 'profiles' (was user_profiles)
    const { data: userProfile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();
    
    const isSuperAdmin = userProfile?.role === 'super_admin' || userProfile?.role === 'admin';
    const isVendor = userProfile?.role === 'vendor';

    if (!isVendor && !isSuperAdmin) {
       return new Response(
         JSON.stringify({ error: 'Forbidden: Vendor access required' }),
         { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 403 }
       );
    }

    let vendorId = user.id;
    
    // If super admin wants to view a specific vendor dashboard, they might pass a param, 
    // but for now let's assume they view their own or the system's if they are one.
    // Use the user's ID as the vendor ID since we unified vendors into auth.users + profiles.
    
    // 1. Get vendor's products from 'products' table
    const { data: products, error: productsError } = await supabase
      .from('products')
      .select('id')
      .eq('vendor_id', vendorId);

    if (productsError) throw productsError;

    const productIds = products.map(p => p.id);

    // 2. Get orders containing vendor's products
    // Use 'product_id' instead of 'spare_part_id'
    let uniqueOrders: any[] = [];
    let totalRevenue = 0;

    if (productIds.length > 0) {
        const { data: orderItems, error: orderItemsError } = await supabase
        .from('order_items')
        .select('*, order:orders(*)')
        .in('product_id', productIds);

        if (orderItemsError) throw orderItemsError;

        const validItems = orderItems.filter(item => item.order);
        uniqueOrders = [...new Map(validItems.map(item => [item.order.id, item.order])).values()];
        
        // 3. Calculate total revenue (price * quantity)
        // Note: price in order_items is a number, quantity is a number
        totalRevenue = validItems.reduce((sum, item) => sum + (Number(item.price_snapshot) || 0) * (item.quantity || 0), 0);
    }

    // 4. Get recent orders
    const recentOrders = uniqueOrders
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
      .slice(0, 5);

    // 5. Get low stock products from 'inventory'
    const { data: lowStockInv, error: lowStockError } = await supabase
      .from('inventory')
      .select('quantity, product:products(id, name)') // Note: 'name' not 'title' in products table based on seed.sql
      .eq('vendor_id', vendorId)
      .lt('quantity', 10)
      .order('quantity', { ascending: true });

    if (lowStockError) throw lowStockError;
    
    // Map to expected format
    const lowStockProducts = lowStockInv.map(inv => ({
      id: inv.product?.id,
      name: inv.product?.name,
      stock_quantity: inv.quantity
    }));

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
