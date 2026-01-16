import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface CreateOrderRequest {
  customer_info: {
    email: string;
    phone?: string;
    firstName: string;
    lastName: string;
    company?: string;
    address?: string;
    city?: string;
    state?: string;
    zipCode?: string;
    country?: string;
  };
  shipping_info?: {
    firstName?: string;
    lastName?: string;
    company?: string;
    address?: string;
    city?: string;
    state?: string;
    zipCode?: string;
    country?: string;
  };
  guest_session_id?: string;
  send_receipt?: boolean;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

    // Variables declared outside try block for scope access
    let user = null
    let profile = null
    let cartItems: any[] = []
    let sourceCartId: string | null = null;
    let sourceIsGuest = false;

    let guest_session_id: string | undefined; // ensure this is also available

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Try to get authenticated user (may be null for guest checkout)
    const authHeader = req.headers.get('Authorization')
    
    if (authHeader) {
      const userSupabase = createClient(
        Deno.env.get('SUPABASE_URL') ?? '',
        Deno.env.get('SUPABASE_ANON_KEY') ?? '',
        {
          global: { headers: { Authorization: authHeader } },
          auth: { persistSession: false }
        }
      )
      
      const { data: { user: authUser } } = await userSupabase.auth.getUser()
      user = authUser
      
      if (user) {
        const { data: userProfile } = await supabase
          .from('user_profiles')
          .select('id')
          .eq('user_id', user.id)
          .single()
        profile = userProfile
      }
    }

    const body: CreateOrderRequest = await req.json()
    const { customer_info, shipping_info, guest_session_id: gs_id } = body
    guest_session_id = gs_id;

    // Get cart items (either from user cart or guest cart)
    
    console.log(`Processing order for: User=${user?.id}, GuestSession=${guest_session_id}`);

    if (user && profile) {
      // Get user cart items
      const { data: cart } = await supabase
        .from('carts')
        .select('id')
        .eq('user_id', profile.id)
        .single()
      
      console.log('User ID found:', user.id, 'Cart:', cart);

      if (cart) {
        sourceCartId = cart.id;
        const { data: userCartItems } = await supabase
          .from('cart_items')
          .select(`
            id,
            product_id,
            quantity,
            product:products(*)
          `)
          .eq('cart_id', cart.id)

        cartItems = userCartItems || []
      }
    } 
    
    // Fallback: If no user items found (or user not logged in), check guest cart
    if (cartItems.length === 0 && guest_session_id) {
      // Get guest cart items
      console.log('Searching for guest cart with session:', guest_session_id);
      
      const { data: guestCart, error: guestCartError } = await supabase
        .from('guest_carts')
        .select('id')
        .eq('session_id', guest_session_id)
        .single()
      
      console.log('Guest Cart Result:', { guestCart, error: guestCartError });

      if (guestCart) {
        sourceCartId = guestCart.id;
        sourceIsGuest = true;
        const { data: guestCartItems, error: itemsError } = await supabase
          .from('guest_cart_items')
          .select(`
            id,
            product_id,
            quantity,
            product:products(*)
          `)
          .eq('guest_cart_id', guestCart.id)
        
        console.log('Guest Cart Items Result:', { count: guestCartItems?.length, error: itemsError });

        cartItems = guestCartItems || []
      }
    }

    if (!cartItems || cartItems.length === 0) {
      console.error('Cart Empty Check Failed. Items:', cartItems);
      throw new Error('Cart is empty')
    }

    // Calculate totals
    const subtotal = cartItems.reduce((sum, item) => sum + (item.product.price * item.quantity), 0)
    const taxAmount = subtotal * 0.15 // 15% tax rate
    const shippingAmount = subtotal > 50000 ? 0 : 2500 // Free shipping over $500
    const totalAmount = subtotal + taxAmount + shippingAmount

    // Generate order number
    const orderNumber = `ORD-${Date.now()}-${Math.random().toString(36).substring(2, 8).toUpperCase()}`

    // Create order
    const orderData = {
      user_id: profile?.id || null,
      order_number: orderNumber,
      status: 'pending',
      payment_status: 'pending',
      total_amount: totalAmount,
      
      shipping_address: {
        firstName: shipping_info?.firstName || customer_info.firstName,
        lastName: shipping_info?.lastName || customer_info.lastName,
        company: shipping_info?.company || customer_info.company,
        address: shipping_info?.address || customer_info.address || "",
        city: shipping_info?.city || customer_info.city || "",
        state: shipping_info?.state || customer_info.state || "",
        zipCode: shipping_info?.zipCode || customer_info.zipCode || "",
        country: shipping_info?.country || customer_info.country || "Zambia"
      },
      
      billing_address: {
        firstName: customer_info.firstName,
        lastName: customer_info.lastName,
        company: customer_info.company,
        address: customer_info.address || "",
        city: customer_info.city || "",
        state: customer_info.state || "",
        zipCode: customer_info.zipCode || "",
        country: customer_info.country || "Zambia",
        email: customer_info.email,
        phone: customer_info.phone
      }
    }

    const { data: order, error: orderError } = await supabase
      .from('orders')
      .insert(orderData)
      .select()
      .single()

    if (orderError) {
      throw new Error(`Failed to create order: ${orderError.message}`)
    }

    // Create order items
    const orderItems = cartItems.map(item => ({
      order_id: order.id,
      product_id: item.product.id,
      quantity: item.quantity,
      price: item.product.price
    }))

    const { error: itemsError } = await supabase
      .from('order_items')
      .insert(orderItems)

    if (itemsError) {
      throw new Error(`Failed to create order items: ${itemsError.message}`)
    }



    // Send notification if user is logged in
    if (user && profile) {
      await supabase.from('notifications').insert({
        user_id: profile.id,
        title: 'Order Created',
        message: `Your order ${orderNumber} has been created and is pending payment.`,
        type: 'info'
      })
    }

    // Clear cart items
    if (sourceCartId) {
        if (sourceIsGuest) {
            await supabase.from('guest_cart_items').delete().eq('guest_cart_id', sourceCartId);
        } else {
            await supabase.from('cart_items').delete().eq('cart_id', sourceCartId);
        }
    }


    return new Response(
      JSON.stringify({
        success: true,
        order: {
          id: order.id,
          order_number: orderNumber,
          total_amount: totalAmount,
          items: orderItems.length
        }
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    )

  } catch (error) {
    console.error('Error creating order:', error)
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message,
        debug: {
            user_id: user?.id,
            guest_session_id,
            sourceCartId,
            sourceIsGuest
        }
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200, // Return 200 to allow client to parse error message
      }
    )
  }
})