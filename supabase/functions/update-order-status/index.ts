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

    const { data: actorProfile, error: actorProfileError } = await supabase
      .from('user_profiles')
      .select('id, role')
      .eq('user_id', user.id)
      .single();

    if (actorProfileError || !actorProfile) {
      throw new Error(actorProfileError?.message || 'User profile not found');
    }

    const { orderId, status } = await req.json();
    const requestedStatus = String(status ?? '').trim().toLowerCase();
    const nextStatus = requestedStatus === 'completed' ? 'delivered' : requestedStatus;
    const validStatuses = ['pending', 'processing', 'shipped', 'delivered', 'cancelled', 'failed'];

    if (!validStatuses.includes(nextStatus)) {
      throw new Error('Invalid order status');
    }

    const { data: order, error: orderLookupError } = await supabase
      .from('orders')
      .select('id, order_number, status, payment_status, user_id, vendor_id')
      .eq('id', orderId)
      .single();

    if (orderLookupError || !order) {
      throw new Error(orderLookupError?.message || 'Order not found');
    }

    const actorRole = actorProfile.role;

    if (actorRole !== 'super_admin') {
      return new Response(
        JSON.stringify({ error: 'Forbidden' }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 403,
        }
      )
    }

    if (order.status === nextStatus || (order.status === 'completed' && nextStatus === 'delivered')) {
      return new Response(
        JSON.stringify({ order }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200,
        }
      )
    }

    const { data: updatedOrder, error } = await supabase
      .from('orders')
      .update({ status: nextStatus })
      .eq('id', orderId)
      .select()
      .single();

    if (error) {
      throw error;
    }

    await supabase.from('activity_logs').insert({
      user_id: user.id,
      action: 'order_status_updated',
      metadata: {
        order_id: order.id,
        order_number: order.order_number,
        actor_role: actorRole,
        previous_status: order.status,
        next_status: nextStatus,
      },
    });

    if (order.user_id) {
      await supabase.from('notifications').insert({
        user_id: order.user_id,
        title: `Order ${order.order_number} updated`,
        message: `Your order status is now ${nextStatus}.`,
        type: 'order',
        link: '/orders',
      });
    }

    return new Response(
      JSON.stringify({ order: updatedOrder }),
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
