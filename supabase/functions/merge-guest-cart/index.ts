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

    const { guest_session_id } = await req.json();
    if (!guest_session_id) {
        return new Response(
            JSON.stringify({ error: 'guest_session_id is required' }),
            {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                status: 400,
            }
        )
    }

    const { data: profile } = await supabase
        .from('user_profiles')
        .select('id')
        .eq('user_id', user.id)
        .single()

    if (!profile) return new Response(JSON.stringify({ success: true }));

    // Get guest cart items
    const { data: guestCart } = await supabase
        .from('guest_carts')
        .select('id')
        .eq('session_id', guest_session_id)
        .single()

    if (!guestCart) return new Response(JSON.stringify({ success: true }));

    const { data: guestItems } = await supabase
        .from('guest_cart_items')
        .select('product_id, quantity')
        .eq('guest_cart_id', guestCart.id)

    if (!guestItems || guestItems.length === 0) return new Response(JSON.stringify({ success: true }));

    // Get or create user cart
    let { data: userCart } = await supabase
        .from('user_carts')
        .select('id')
        .eq('user_id', profile.id)
        .single();

    if (!userCart) {
        const { data: newCart } = await supabase
            .from('user_carts')
            .insert({ user_id: profile.id })
            .select('id')
            .single();
        userCart = newCart;
    }

    // Merge items
    for (const item of guestItems) {
        await supabase
        .from('cart_items')
        .upsert({
            cart_id: userCart!.id,
            product_id: item.product_id,
            quantity: item.quantity
        }, { onConflict: 'cart_id,product_id' });
    }

    // Delete guest cart
    await supabase
        .from('guest_carts')
        .delete()
        .eq('id', guestCart.id)

    return new Response(
      JSON.stringify({ success: true }),
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
