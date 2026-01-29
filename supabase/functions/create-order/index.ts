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

  let user = null
  let cartItems: any[] = []
  let sourceCartId: string | null = null;
  let sourceIsGuest = false;
  let guest_session_id: string | undefined;

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Try to get authenticated user
    const authHeader = req.headers.get('Authorization')
    if (authHeader) {
      const { data: { user: authUser } } = await supabase.auth.getUser(authHeader.replace('Bearer ', ''))
      user = authUser
    }

    const body: CreateOrderRequest = await req.json()
    const { customer_info, shipping_info, guest_session_id: gs_id } = body
    guest_session_id = gs_id;

    console.log(`Processing order for: User=${user?.id}, GuestSession=${guest_session_id}`);

    // 1. Get Cart Items from unified table
    const { data: items, error: cartError } = await supabase
      .from('carts')
      .select('id, product_id, quantity, product:products(*)')
      .eq(user ? 'user_id' : 'guest_session_id', user ? user.id : guest_session_id);

    if (cartError) throw cartError;
    cartItems = items || [];

    if (!cartItems || cartItems.length === 0) {
      throw new Error('Cart is empty')
    }

    // 2. Calculate Totals
    const subtotal = cartItems.reduce((sum, item) => sum + (item.product.price * item.quantity), 0)
    const taxAmount = subtotal * 0.16 // 16% VAT in Zambia
    const shippingAmount = subtotal > 1000 ? 0 : 50
    const totalAmount = subtotal + taxAmount + shippingAmount

    // 3. Create Order record
    const orderData = {
      user_id: user?.id || null,
      guest_email: user ? null : customer_info.email,
      guest_phone: user ? null : customer_info.phone,
      guest_name: user ? null : `${customer_info.firstName} ${customer_info.lastName}`,
      guest_session_id: user ? null : guest_session_id,
      order_number: `ORD-${Date.now()}-${Math.random().toString(36).substring(2, 7).toUpperCase()}`,
      status: 'PENDING',
      payment_status: 'PENDING',
      total_amount: totalAmount,
      tax_amount: taxAmount,
      shipping_amount: shippingAmount,
      currency: 'ZMW',
      shipping_address: {
        firstName: shipping_info?.firstName || customer_info.firstName,
        lastName: shipping_info?.lastName || customer_info.lastName,
        address: shipping_info?.address || customer_info.address || "",
        city: shipping_info?.city || customer_info.city || "",
        country: shipping_info?.country || customer_info.country || "Zambia"
      },
      billing_address: customer_info
    }

    const { data: order, error: orderError } = await supabase
      .from('orders')
      .insert(orderData)
      .select()
      .single()

    if (orderError) throw orderError

    // 4. Create Order Items
    const orderItems = cartItems.map(item => ({
      order_id: order.id,
      product_id: item.product_id,
      quantity: item.quantity,
      price_snapshot: item.product.price
    }))

    const { error: itemsError } = await supabase.from('order_items').insert(orderItems)
    if (itemsError) throw itemsError

    // 5. Create Vendor Orders
    const vendorIds = [...new Set(cartItems.map(item => item.product.vendor_id).filter(id => !!id))];
    if (vendorIds.length > 0) {
        const vendorOrders = vendorIds.map(vId => ({
            vendor_id: vId,
            order_id: order.id,
            status: 'PENDING'
        }));
        await supabase.from('vendor_orders').insert(vendorOrders);
    }

    // 6. Clear Cart
    await supabase.from('carts')
      .delete()
      .eq(user ? 'user_id' : 'guest_session_id', user ? user.id : guest_session_id);

    // 7. Send Email Receipt
    try {
        await supabase.functions.invoke('send-email', {
            body: {
                to: user?.email || customer_info.email,
                type: 'ORDER_CREATED',
                order_id: order.id,
                data: { order_number: order.order_number }
            }
        });
    } catch (e) {
        console.error("Failed to send order email:", e);
    }

    // 8. Notify vendors
    for (const vId of vendorIds) {
        const { data: vUsers } = await supabase.from('vendor_users').select('user_id').eq('vendor_id', vId);
        if (vUsers) {
            const notifications = vUsers.map(vu => ({
                user_id: vu.user_id,
                title: 'New Order Received',
                message: `You have a new order #${order.order_number} for fulfillment.`,
                type: 'info'
            }));
            await supabase.from('notifications').insert(notifications);
        }
    }

    return new Response(
      JSON.stringify({ success: true, order }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error: any) {
    console.error('Create Order Error:', error)
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
    )
  }
})