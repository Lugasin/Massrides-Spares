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

    const { data: profile, error: profileError } = await supabase
      .from('user_profiles')
      .select('id, role')
      .eq('user_id', user.id)
      .single();

    if (profileError || !profile) {
      throw new Error(profileError?.message || 'User profile not found');
    }

    let ordersQuery = supabase
      .from('orders')
      .select(`
        id,
        order_number,
        created_at,
        payment_status,
        shipping_address,
        status,
        total_amount,
        user_id,
        vendor_id,
        order_items (
          id,
          quantity,
          price_snapshot,
          products (
            name,
            main_image
          )
        )
      `)
      .order('created_at', { ascending: false });

    if (profile.role === 'vendor') {
      ordersQuery = ordersQuery.eq('vendor_id', profile.id);
    } else if (profile.role !== 'admin' && profile.role !== 'super_admin') {
      ordersQuery = ordersQuery.eq('user_id', user.id);
    }

    const { data: orders, error } = await ordersQuery;

    if (error) {
      throw error;
    }

    const mappedOrders = (orders || []).map((order: any) => {
      const shippingAddress = order.shipping_address || {};

      return {
        id: String(order.id),
        order_number: order.order_number,
        status: order.status,
        payment_status: order.payment_status,
        total_amount: Number(order.total_amount || 0),
        created_at: order.created_at,
        updated_at: order.created_at,
        shipping_address: shippingAddress,
        billing_address: null,
        guest_email: shippingAddress.email || null,
        order_items: (order.order_items || []).map((item: any) => ({
          id: item.id,
          quantity: item.quantity,
          unit_price: Number(item.price_snapshot || 0),
          products: item.products
            ? {
                name: item.products.name,
                main_image: item.products.main_image || null,
              }
            : null,
        })),
      };
    });

    return new Response(
      JSON.stringify({ orders: mappedOrders }),
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
