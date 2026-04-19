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
    const authHeader = req.headers.get('Authorization') ?? req.headers.get('authorization')
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
    const { data: { user }, error: userError } = await userSupabase.auth.getUser();

    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: userError?.message || 'Unauthorized' }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 401,
        }
      )
    }

    const { data: userProfileByUserId, error: userProfileByUserIdError } = await supabase
      .from('user_profiles')
      .select('id, role')
      .eq('user_id', user.id)
      .maybeSingle();

    if (userProfileByUserIdError) throw userProfileByUserIdError;

    let userProfile = userProfileByUserId;

    if (!userProfile) {
      const { data: userProfileById, error: userProfileByIdError } = await supabase
        .from('user_profiles')
        .select('id, role')
        .eq('id', user.id)
        .maybeSingle();

      if (userProfileByIdError) throw userProfileByIdError;
      userProfile = userProfileById;
    }

    if (!userProfile) {
      return new Response(
        JSON.stringify({ error: 'Vendor profile not found' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 403 }
      );
    }

    const isVendor = userProfile.role === 'vendor';

    if (!isVendor) {
       return new Response(
         JSON.stringify({ error: 'Forbidden: Vendor access required' }),
         { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 403 }
       );
    }

    const vendorIds = [...new Set([userProfile.id, user.id].filter(Boolean))];

    // 1. Get vendor's products from 'products' table
    const { data: products, error: productsError } = await supabase
      .from('products')
      .select('id')
      .in('vendor_id', vendorIds);

    if (productsError) throw productsError;

    const productIds = (products || []).map(p => p.id);

    // 2. Get orders containing vendor's products
    // Use 'product_id' instead of 'spare_part_id'
    let uniqueOrders: any[] = [];
    let totalRevenue = 0;

    if (productIds.length > 0) {
        const { data: orderItems, error: orderItemsError } = await supabase
        .from('order_items')
        .select('quantity, price_snapshot, product:products(currency), order:orders(*)')
        .in('product_id', productIds);

        if (orderItemsError) throw orderItemsError;

        const validItems = (orderItems || []).filter(item => item.order);
        uniqueOrders = [...new Map(validItems.map(item => [item.order.id, item.order])).values()];
        
        // 3. Calculate total revenue grouped by currency
        const revenueMap: Record<string, number> = {};
        validItems.forEach(item => {
          const curr = item.product?.currency || 'USD';
          const lineTotal = (Number(item.price_snapshot) || 0) * (item.quantity || 0);
          revenueMap[curr] = (revenueMap[curr] || 0) + lineTotal;
        });
        totalRevenue = revenueMap as any;
    }

    // 4. Get recent orders
    const recentOrders = uniqueOrders
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
      .slice(0, 5);

    // 5. Get low stock products from 'inventory'
    const { data: inventoryRows, error: lowStockError } = await supabase
      .from('inventory')
      .select('quantity, threshold, product:products(id, name, sku, attributes)')
      .in('vendor_id', vendorIds)
      .order('quantity', { ascending: true });

    if (lowStockError) throw lowStockError;

    const lowStockProducts = (inventoryRows || [])
      .filter((row: any) => {
        const attrs = row.product?.attributes && typeof row.product.attributes === 'object'
          ? row.product.attributes
          : {};
        const minStockLevel = Number(row.threshold ?? attrs.min_stock_level ?? 10);
        return Number(row.quantity ?? 0) <= minStockLevel;
      })
      .map((row: any) => ({
        id: row.product?.id,
        name: row.product?.name ?? row.product?.sku ?? 'Unnamed Product',
        stock_quantity: Number(row.quantity ?? 0)
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
