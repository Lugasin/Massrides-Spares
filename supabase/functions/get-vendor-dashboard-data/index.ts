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

    // Check user role
    const { data: userProfile } = await supabase
      .from('user_profiles')
      .select('role')
      .eq('user_id', user.id)
      .single();
    
    const isSuperAdmin = userProfile?.role === 'super_admin' || userProfile?.role === 'admin';

    // Get vendor profile
    // If super admin, get ANY vendor (first one)
    // If vendor, get OWN vendor
    let vendorQuery = supabase.from('vendors').select('id');
    
    if (!isSuperAdmin) {
       vendorQuery = vendorQuery.eq('owner_id', user.id);
    }

    const { data: vendorRecord, error: vendorError } = await vendorQuery.limit(1).single();

    if (vendorError) {
       console.error('Vendor record not found:', vendorError);
       // Return empty data if not a vendor
       return new Response(
         JSON.stringify({ dashboardData: { 
            totalRevenue: 0, totalOrders: 0, recentOrders: [], lowStockProducts: [], totalProducts: 0 
         }}),
         { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
       );
    }

    const vendorId = vendorRecord.id;
    
    // 1. Get vendor's products from 'products' table
    const { data: products, error: productsError } = await supabase
      .from('products')
      .select('id')
      .eq('vendor_id', vendorId);

    if (productsError) throw productsError;

    const productIds = products.map(p => p.id);

    // 2. Get orders containing vendor's products
    // Use 'product_id' instead of 'spare_part_id'
    const { data: orderItems, error: orderItemsError } = await supabase
      .from('order_items')
      .select('*, order:orders(*)')
      .in('product_id', productIds);

    if (orderItemsError) throw orderItemsError;

    // Filter out items where order might be null (if RLS hides it? Order RLS is strict)
    // Vendors need to see orders for THEIR products.
    // We rely on service_role key?
    // The client is created with `SUPABASE_SERVICE_ROLE_KEY` in line 17?
    // YES! Line 15-18 creates `supabase` with SERVICE_ROLE_KEY.
    // So RLS is bypassed. Great.

    const validItems = orderItems.filter(item => item.order);
    const uniqueOrders = [...new Map(validItems.map(item => [item.order.id, item.order])).values()];

    // 3. Calculate total revenue (price * quantity)
    const totalRevenue = validItems.reduce((sum, item) => sum + (item.price || 0) * (item.quantity || 0), 0);

    // 4. Get recent orders
    const recentOrders = uniqueOrders
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
      .slice(0, 5);

    // 5. Get low stock products from 'inventory'
    const { data: lowStockInv, error: lowStockError } = await supabase
      .from('inventory')
      .select('quantity, product:products(id, title)')
      .eq('vendor_id', vendorId)
      .lt('quantity', 10)
      .order('quantity', { ascending: true });

    if (lowStockError) throw lowStockError;
    
    // Map to expected format
    const lowStockProducts = lowStockInv.map(inv => ({
      id: inv.product?.id,
      name: inv.product?.title,
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
