import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

/**
 * Guest Checkout: Payment First, Account Later
 * 
 * This function creates orders WITHOUT requiring authentication.
 * - For guests: user_id = null, store guest_email/guest_phone on order
 * - For authenticated users: user_id = auth.uid()
 * 
 * Account creation happens AFTER payment success, optionally via OTP.
 */

interface CreateOrderRequest {
  // Guest checkout fields (required for guests)
  guest_email: string;
  guest_phone?: string;
  guest_name: string;
  
  // Shipping info
  shipping_info: {
    firstName: string;
    lastName: string;
    address: string;
    city: string;
    state?: string;
    zipCode?: string;
    country: string;
  };
  
  // Optional guest session for cart lookup
  guest_session_id?: string;
  
  // Options
  send_receipt?: boolean;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  // Variables declared outside try block for scope access
  let user = null;
  let cartItems: any[] = [];
  let sourceCartId: string | null = null;
  let sourceIsGuest = false;

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Try to get authenticated user (OPTIONAL - guests won't have this)
    const authHeader = req.headers.get('Authorization');
    
    if (authHeader) {
      const userSupabase = createClient(
        Deno.env.get('SUPABASE_URL') ?? '',
        Deno.env.get('SUPABASE_ANON_KEY') ?? '',
        {
          global: { headers: { Authorization: authHeader } },
          auth: { persistSession: false }
        }
      );
      
      const { data: { user: authUser } } = await userSupabase.auth.getUser();
      user = authUser;
    }

    const body: CreateOrderRequest = await req.json();
    const { 
      guest_email, 
      guest_phone, 
      guest_name, 
      shipping_info, 
      guest_session_id,
      send_receipt = true 
    } = body;

    // Validate required fields for guest checkout
    if (!user && !guest_email) {
      throw new Error('Guest checkout requires email address');
    }

    if (!shipping_info || !shipping_info.address) {
      throw new Error('Shipping address is required');
    }

    console.log(`Processing order: User=${user?.id || 'GUEST'}, Email=${guest_email}`);

    // ==========================================
    // 1. Get Cart Items
    // ==========================================
    
    if (user) {
      // Authenticated user: get from cart_items table
      const { data: userCartItems, error: cartError } = await supabase
        .from('cart_items')
        .select(`
          id,
          spare_part_id,
          quantity,
          spare_part:spare_parts(id, name, price, images, vendor_id)
        `)
        .eq('user_id', user.id);

      if (cartError) {
        console.error('Cart fetch error:', cartError);
        throw new Error(`Failed to fetch cart: ${cartError.message}`);
      }
      
      cartItems = userCartItems || [];
      sourceCartId = user.id; // For clearing cart later
      sourceIsGuest = false;
      
    } else if (guest_session_id) {
      // Guest: get from guest_cart_items table
      console.log('Fetching guest cart for session:', guest_session_id);
      
      const { data: guestCartItems, error: guestCartError } = await supabase
        .from('guest_cart_items')
        .select(`
          id,
          spare_part_id,
          quantity,
          spare_part:spare_parts(id, name, price, images, vendor_id)
        `)
        .eq('guest_session_id', guest_session_id);

      if (guestCartError) {
        console.error('Guest cart fetch error:', guestCartError);
        throw new Error(`Failed to fetch guest cart: ${guestCartError.message}`);
      }
      
      cartItems = guestCartItems || [];
      sourceCartId = guest_session_id;
      sourceIsGuest = true;
    }

    if (!cartItems || cartItems.length === 0) {
      throw new Error('Cart is empty');
    }

    console.log(`Found ${cartItems.length} items in cart`);

    // ==========================================
    // 2. Calculate Totals
    // ==========================================
    
    const subtotal = cartItems.reduce((sum, item) => {
      const price = item.spare_part?.price || 0;
      return sum + (price * item.quantity);
    }, 0);
    
    // ... (lines 162-220)

    const orderItems = cartItems.map(item => ({
      order_id: order.id,
      spare_part_id: item.spare_part?.id || item.spare_part_id,
      quantity: item.quantity,
      price_snapshot: item.spare_part?.price || 0
    }));

    // ... (lines 228-243)
    
    for (const item of cartItems) {
      const vendorId = item.spare_part?.vendor_id;
      if (vendorId) {
        if (!vendorOrdersMap.has(vendorId)) {
          vendorOrdersMap.set(vendorId, {
            vendor_id: vendorId,
            order_id: order.id,
            status: 'pending',
            subtotal: 0
          });
        }
        const vo = vendorOrdersMap.get(vendorId);
        vo.subtotal += (item.spare_part?.price || 0) * item.quantity;
      }
    }

    if (vendorOrdersMap.size > 0) {
      const { error: voError } = await supabase
        .from('vendor_orders')
        .insert(Array.from(vendorOrdersMap.values()));
      
      if (voError) {
        console.warn('Vendor orders creation warning:', voError);
        // Non-fatal, continue
      }
    }

    // ==========================================
    // 7. Clear Cart
    // ==========================================
    
    if (sourceCartId) {
      if (sourceIsGuest) {
        await supabase
          .from('guest_cart_items')
          .delete()
          .eq('guest_session_id', sourceCartId);
      } else {
        await supabase
          .from('cart_items')
          .delete()
          .eq('user_id', sourceCartId);
      }
      console.log('Cart cleared');
    }

    // ==========================================
    // 8. Send Notification (if user is logged in)
    // ==========================================
    
    if (user) {
      await supabase.from('notifications').insert({
        user_id: user.id,
        title: 'Order Created',
        message: `Your order ${orderNumber} has been created and is pending payment.`,
        type: 'info'
      });
    }

    // ==========================================
    // 9. Log Activity
    // ==========================================
    
    await supabase.from('activity_logs').insert({
      user_id: user?.id || null,
      action: 'ORDER_CREATED',
      metadata: {
        order_id: order.id,
        order_number: orderNumber,
        total: totalAmount,
        items_count: cartItems.length,
        is_guest: !user,
        guest_email: guest_email
      }
    });

    // ==========================================
    // Return Success
    // ==========================================
    
    return new Response(
      JSON.stringify({
        success: true,
        order: {
          id: order.id,
          order_number: orderNumber,
          total_amount: totalAmount,
          currency: 'ZMW',
          items: orderItems.length,
          status: 'pending'
        },
        // Include email for payment page
        customer_email: guest_email || user?.email,
        send_receipt
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );

  } catch (error: any) {
    console.error('Error creating order:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message,
        debug: {
          user_id: user?.id,
          sourceCartId,
          sourceIsGuest
        }
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
    );
  }
});