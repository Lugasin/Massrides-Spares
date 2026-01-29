import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  );

  try {
    // 1. Get User (Optional)
    const authHeader = req.headers.get('Authorization');
    let user = null;
    if (authHeader) {
      const { data: { user: authUser } } = await supabase.auth.getUser(authHeader.replace('Bearer ', ''));
      user = authUser;
    }

    const { delivery_address, customer_info, guest_session_id } = await req.json();

    // 2. Reuse logic from create-order
    // (In a real app, you'd share this code via a shared folder or library)
    // For now, I'll just make validate-checkout call create-order or duplicate if necessary.
    // Better: redirect this to create-order + create-payment-session flow.

    console.log("Validating checkout...");

    const orderRes = await supabase.functions.invoke('create-order', {
        body: {
            customer_info: customer_info || {
                email: user?.email || '',
                firstName: user?.user_metadata?.full_name?.split(' ')[0] || 'Customer',
                lastName: user?.user_metadata?.full_name?.split(' ').slice(1).join(' ') || '',
                address: delivery_address?.address || '',
                city: delivery_address?.city || '',
                phone: user?.phone || ''
            },
            shipping_info: delivery_address,
            guest_session_id
        },
        headers: authHeader ? { Authorization: authHeader } : {}
    });

    if (orderRes.error) throw new Error(`Order creation failed: ${orderRes.error.message}`);
    const { order } = orderRes.data;

    const paymentRes = await supabase.functions.invoke('create-payment-session', {
        body: {
            order_id: order.id,
            return_url: `${Deno.env.get('SITE_URL')}/checkout/success?order=${order.order_number}`
        }
    });

    if (paymentRes.error) throw new Error(`Payment session failed: ${paymentRes.error.message}`);
    const { checkout_url } = paymentRes.data;

    return new Response(
      JSON.stringify({
        order_id: order.id,
        order_number: order.order_number,
        payment_link: checkout_url,
        message: "Checkout validated and initialized",
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error: any) {
    console.error("Checkout validation error:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});