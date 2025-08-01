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
    first_name: string;
    last_name: string;
    company?: string;
    address: string;
    city: string;
    state: string;
    zip_code: string;
    country: string;
  };
  shipping_info?: {
    first_name?: string;
    last_name?: string;
    company?: string;
    address?: string;
    city?: string;
    state?: string;
    zip_code?: string;
    country?: string;
  };
  guest_session_id?: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      }
    )

    // Try to get authenticated user (may be null for guest checkout)
    let user = null
    const authHeader = req.headers.get('Authorization')
    if (authHeader) {
      const { data: { user: authUser } } = await supabase.auth.getUser(authHeader.replace('Bearer ', ''))
      user = authUser
    }

    const body: CreateOrderRequest = await req.json()
    const { customer_info, shipping_info, guest_session_id } = body

    // Rate limiting check
    if (!user) {
      // For guest users, implement basic rate limiting
      // In production, you might want to use Redis or a more sophisticated solution
      console.log('Guest checkout attempt from:', req.headers.get('x-forwarded-for'))
    }

    // Get cart items (either from user cart or guest cart)
    let cartItems: any[] = []
    
    if (user) {
      // Get user cart items
      const { data: userCartItems, error: cartError } = await supabase
        .from('cart_items')
        .select(`
          *,
          product:products(*)
        `)
        .eq('cart_id', (await supabase
          .from('carts')
          .select('id')
          .eq('user_id', user.id)
          .single()
        ).data?.id)

      if (cartError && cartError.code !== 'PGRST116') {
        throw new Error(`Failed to fetch cart: ${cartError.message}`)
      }
      
      cartItems = userCartItems || []
    } else if (guest_session_id) {
      // Get guest cart items
      const { data: guestCartItems, error: cartError } = await supabase
        .from('guest_cart_items')
        .select(`
          *,
          product:products(*)
        `)
        .eq('cart_id', (await supabase
          .from('guest_carts')
          .select('id')
          .eq('session_id', guest_session_id)
          .single()
        ).data?.id)

      if (cartError && cartError.code !== 'PGRST116') {
        throw new Error(`Failed to fetch guest cart: ${cartError.message}`)
      }
      
      cartItems = guestCartItems || []
    }

    if (!cartItems || cartItems.length === 0) {
      throw new Error('Cart is empty')
    }

    // Calculate totals
    const subtotal = cartItems.reduce((sum, item) => sum + (item.price * item.quantity), 0)
    const taxAmount = subtotal * 0.15 // 15% tax rate - adjust as needed
    const shippingAmount = subtotal > 50000 ? 0 : 2500 // Free shipping over $500
    const totalAmount = subtotal + taxAmount + shippingAmount

    // Generate order number
    const orderNumber = `ORD-${Date.now()}-${Math.random().toString(36).substring(2, 8).toUpperCase()}`

    // Create order
    const orderData = {
      user_id: user?.id || null,
      order_number: orderNumber,
      status: 'pending',
      currency: 'USD',
      subtotal,
      tax_amount: taxAmount,
      shipping_amount: shippingAmount,
      total_amount: totalAmount,
      
      customer_email: customer_info.email,
      customer_phone: customer_info.phone,
      
      billing_first_name: customer_info.first_name,
      billing_last_name: customer_info.last_name,
      billing_company: customer_info.company,
      billing_address: customer_info.address,
      billing_city: customer_info.city,
      billing_state: customer_info.state,
      billing_zip_code: customer_info.zip_code,
      billing_country: customer_info.country,
      
      shipping_first_name: shipping_info?.first_name || customer_info.first_name,
      shipping_last_name: shipping_info?.last_name || customer_info.last_name,
      shipping_company: shipping_info?.company || customer_info.company,
      shipping_address: shipping_info?.address || customer_info.address,
      shipping_city: shipping_info?.city || customer_info.city,
      shipping_state: shipping_info?.state || customer_info.state,
      shipping_zip_code: shipping_info?.zip_code || customer_info.zip_code,
      shipping_country: shipping_info?.country || customer_info.country,
      
      payment_status: 'pending'
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
      product_name: item.product.name,
      product_sku: item.product.sku,
      quantity: item.quantity,
      price: item.price,
      total: item.price * item.quantity
    }))

    const { error: itemsError } = await supabase
      .from('order_items')
      .insert(orderItems)

    if (itemsError) {
      throw new Error(`Failed to create order items: ${itemsError.message}`)
    }

    // Clear cart after successful order creation
    if (user) {
      const { data: userCart } = await supabase
        .from('carts')
        .select('id')
        .eq('user_id', user.id)
        .single()

      if (userCart) {
        await supabase
          .from('cart_items')
          .delete()
          .eq('cart_id', userCart.id)
      }
    } else if (guest_session_id) {
      await supabase
        .from('guest_carts')
        .delete()
        .eq('session_id', guest_session_id)
    }

    // Send notification if user is logged in
    if (user) {
      await supabase.from('notifications').insert({
        user_id: user.id,
        title: 'Order Created',
        message: `Your order ${orderNumber} has been created and is pending payment.`,
        type: 'info',
        data: { order_id: order.id, order_number: orderNumber }
      })
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
        error: error.message
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
    )
  }
})