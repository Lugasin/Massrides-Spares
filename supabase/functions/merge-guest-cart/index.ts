// merge-guest-cart/index.ts
// Updated to work with RELATIONAL TABLES (cart_items, guest_cart_items)

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
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Authenticate User
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) throw new Error('Missing Authorization header')
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser(authHeader.replace('Bearer ', ''))
    
    if (userError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    const { guest_session_id } = await req.json()
    if (!guest_session_id) {
       return new Response(JSON.stringify({ success: true, message: "No guest session provided" }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    // 1. Fetch Guest Cart
    const { data: guestCart } = await supabaseClient
      .from('guest_carts')
      .select('id')
      .eq('session_id', guest_session_id)
      .single()

    if (!guestCart) {
      return new Response(JSON.stringify({ success: true, message: "No guest cart found" }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    // 2. Fetch Guest Items
    const { data: guestItems } = await supabaseClient
      .from('guest_cart_items')
      .select('product_id, quantity')
      .eq('guest_cart_id', guestCart.id)

    if (!guestItems || guestItems.length === 0) {
      return new Response(JSON.stringify({ success: true, message: "Empty guest cart" }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    // 3. Find/Create User Cart
    // Note: We use 'user_profiles' view or just trust we have user.id. Tables use user_id directly usually.
    // The carts table schema uses user_id.
    let { data: userCart } = await supabaseClient
      .from('carts')
      .select('id')
      .eq('user_id', user.id)
      .single()

    if (!userCart) {
      const { data: newCart, error: insertError } = await supabaseClient
        .from('carts')
        .insert({ user_id: user.id })
        .select('id')
        .single()
      if (insertError) throw insertError
      userCart = newCart
    }

    // 4. Merge Items into cart_items
    for (const item of guestItems) {
      // Check for existing item
      const { data: existing } = await supabaseClient
        .from('cart_items')
        .select('id, quantity')
        .eq('cart_id', userCart.id)
        .eq('product_id', item.product_id)
        .single()

      if (existing) {
        await supabaseClient
          .from('cart_items')
          .update({ quantity: existing.quantity + item.quantity })
          .eq('id', existing.id)
      } else {
        await supabaseClient
          .from('cart_items')
          .insert({
            cart_id: userCart.id,
            product_id: item.product_id,
            quantity: item.quantity
          })
      }
    }

    // 5. Cleanup Guest Cart (Cascades delete to items)
    await supabaseClient
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

  } catch (error: any) {
    console.error('Merge Cart Error:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
    )
  }
})
