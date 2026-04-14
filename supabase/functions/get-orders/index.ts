import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

type OrderItemRow = {
  id: number;
  quantity: number;
  price_snapshot: number | null;
  products: {
    name: string;
    main_image: string | null;
  } | null;
};

type PaymentRow = {
  id: number;
  provider: string | null;
  status: string | null;
  created_at: string | null;
  completed_at: string | null;
  vesicash_payment_id: string | null;
  vesicash_transaction_id: string | null;
  base_currency: string | null;
  quote_currency: string | null;
  exchange_rate: number | null;
  fx_rate_provider: string | null;
  fx_rate_source: string | null;
  fx_rate_fetched_at: string | null;
  fx_rate_locked_at: string | null;
  amount_usd: number | null;
  amount_zmw: number | null;
  fx_rate_payload: Record<string, unknown> | null;
};

type OrderRow = {
  id: number;
  order_number: string | null;
  created_at: string | null;
  payment_status: string | null;
  shipping_address: Record<string, unknown> | null;
  billing_address: Record<string, unknown> | null;
  status: string | null;
  total_amount: number | null;
  user_id: string | null;
  vendor_id: string | null;
  order_items: OrderItemRow[] | null;
  payment: PaymentRow | null;
};

type ProfileRow = {
  user_id: string | null;
  full_name: string | null;
  email: string | null;
  phone: string | null;
};

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

    const { data: profile, error: profileError } = await supabase
      .from('user_profiles')
      .select('id, role')
      .eq('user_id', user.id)
      .single();

    if (profileError || !profile) {
      throw new Error(profileError?.message || 'User profile not found');
    }

    const ownerIds = Array.from(new Set([profile.id, user.id].filter(Boolean))) as string[];

    let ordersQuery = supabase
      .from('orders')
      .select(`
        id,
        order_number,
        created_at,
        payment_status,
        shipping_address,
        billing_address,
        status,
        total_amount,
        user_id,
        vendor_id,
        payment:payments (
          id,
          provider,
          status,
          created_at,
          completed_at,
          vesicash_payment_id,
          vesicash_transaction_id,
          base_currency,
          quote_currency,
          exchange_rate,
          fx_rate_provider,
          fx_rate_source,
          fx_rate_fetched_at,
          fx_rate_locked_at,
          amount_usd,
          amount_zmw,
          fx_rate_payload
        ),
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
      ordersQuery = ordersQuery.in('vendor_id', ownerIds);
    } else if (profile.role !== 'admin' && profile.role !== 'super_admin') {
      ordersQuery = ordersQuery.in('user_id', ownerIds);
    }

    const { data: orders, error } = await ordersQuery;

    if (error) {
      throw error;
    }

    const orderRows = (orders || []) as OrderRow[];

    const userIds = Array.from(
      new Set(orderRows.map((order) => order.user_id).filter(Boolean))
    ) as string[];

    let profileMap = new Map<string, { full_name: string | null; email: string | null; phone: string | null }>();
    if (userIds.length > 0) {
      const { data: profiles } = await supabase
        .from('user_profiles')
        .select('user_id, full_name, email, phone')
        .in('user_id', userIds);

      profileMap = new Map(
        ((profiles || []) as ProfileRow[]).map((profile) => [
          String(profile.user_id),
          { full_name: profile.full_name || null, email: profile.email || null, phone: profile.phone || null }
        ])
      );
    }

    const mappedOrders = orderRows.map((order) => {
      const shippingAddress = order.shipping_address || {};
      const billingAddress = order.billing_address || {};
      const profile = order.user_id ? profileMap.get(String(order.user_id)) : null;
      const customerFirstName = billingAddress.firstName || shippingAddress.firstName || '';
      const customerLastName = billingAddress.lastName || shippingAddress.lastName || '';
      const customerName = billingAddress.full_name
        || profile?.full_name
        || `${customerFirstName} ${customerLastName}`.trim()
        || null;
      const customerEmail = billingAddress.email || shippingAddress.email || profile?.email || null;
      const customerPhone = billingAddress.phone || shippingAddress.phone || profile?.phone || null;

      return {
        id: String(order.id),
        order_number: order.order_number,
        status: order.status,
        payment_status: order.payment_status,
        total_amount: Number(order.total_amount || 0),
        created_at: order.created_at,
        updated_at: order.created_at,
        shipping_address: shippingAddress,
        billing_address: billingAddress,
        customer_name: customerName,
        customer_email: customerEmail,
        customer_phone: customerPhone,
        guest_email: customerEmail,
        payment: order.payment ? {
          id: order.payment.id,
          provider: order.payment.provider,
          status: order.payment.status,
          created_at: order.payment.created_at,
          completed_at: order.payment.completed_at,
          vesicash_payment_id: order.payment.vesicash_payment_id,
          vesicash_transaction_id: order.payment.vesicash_transaction_id,
          base_currency: order.payment.base_currency,
          quote_currency: order.payment.quote_currency,
          exchange_rate: order.payment.exchange_rate,
          fx_rate_provider: order.payment.fx_rate_provider,
          fx_rate_source: order.payment.fx_rate_source,
          fx_rate_fetched_at: order.payment.fx_rate_fetched_at,
          fx_rate_locked_at: order.payment.fx_rate_locked_at,
          amount_usd: order.payment.amount_usd,
          amount_zmw: order.payment.amount_zmw,
          fx_rate_payload: order.payment.fx_rate_payload,
        } : null,
        order_items: (order.order_items || []).map((item) => ({
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
