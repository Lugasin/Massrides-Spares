import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1";
import { corsHeaders } from "../_shared/cors.ts";

console.log("Validate-Checkout Function Invoked");

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { user_id, guest_session_id } = await req.json();

    if (!user_id && !guest_session_id) {
      throw new Error("Missing user identification");
    }

    let cartItems: any[] = [];
    let guestToken = guest_session_id;

    console.log(`Validating checkout for User: ${user_id}, Guest: ${guest_session_id}`);

    // Fetch Cart Items
    if (user_id) {
      // Authenticated User Cart
      const { data: cart } = await supabase
        .from('carts')
        .select('items')
        .eq('user_id', user_id)
        .single();
      
      // Items are stored as JSONB in 'carts' table for auth users (based on schema view)
      // Or maybe 'cart_items' table?
      // consolidated_init.sql says carts has 'items jsonb'.
      // But verify if there is a 'cart_items' table for auth users?
      // Let's assume 'carts.items' JSONB for now based on init sql.
      // But guest items are in 'guest_cart_items'.
      // If we want consistency, we should check if 'cart_items' exists.
      // For this implementation, I will assume `carts` table logic.
      if (cart && cart.items) {
        cartItems = Array.isArray(cart.items) ? cart.items : [];
      }
    } else if (guest_session_id) {
      // Guest Cart
      // Use guest_cart_items table (restored earlier)
      // First get cart id
      const { data: guestCart } = await supabase
        .from('guest_carts')
        .select('id')
        .eq('session_id', guest_session_id)
        .single();

      if (guestCart) {
        const { data: items } = await supabase
          .from('guest_cart_items')
          .select(`
            *,
            spare_parts (
              id, name, price
            )
          `)
          .eq('guest_cart_id', guestCart.id);
        
        // Map to standard format
        if (items) {
          cartItems = items.map((i: any) => ({
             id: i.product_id, // consistent ID
             name: i.spare_parts?.name,
             price: i.spare_parts?.price,
             quantity: i.quantity,
             image: i.spare_parts?.images?.[0] || '' 
          }));
        }
      }
    }

    if (!cartItems || cartItems.length === 0) {
      return new Response(
        JSON.stringify({ error: "Cart is empty" }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Server-side Total Calculation
    // We should ideally fetch fresh prices from 'products' table to avoid tampering
    // Extract IDs
    const partIds = cartItems.map((i: any) => i.id || i.product_id); // handle both formats
    const { data: parts } = await supabase
      .from('products') // or 'spare_parts' if they are same table
      .select('id, price, title')
      .in('id', partIds);
    
    let subtotal = 0;
    const validatedItems = cartItems.map((item: any) => {
        const part = parts?.find((p: any) => p.id === item.id);
        const price = part ? Number(part.price) : Number(item.price);
        const qty = item.quantity;
        subtotal += price * qty;
        return { ...item, price, name: part?.title || item.name };
    });

    // TODO: Add Fees/Shipping Logic
    const shipping = 0; // standard placeholder
    const fees = 0;
    const total = subtotal + shipping + fees;

    console.log(`Calculated Total: ${total}`);

    // Create Order
    const orderPayload = {
      user_id: user_id || null,
      guest_token: guestToken || null, // storing guest_token
      subtotal,
      total, // storing total
      fees,
      order_status: 'awaiting_payment',
      payment_status: 'pending',
      currency: 'ZMW' // Default
    };

    const { data: order, error: orderError } = await supabase
      .from('orders')
      .insert(orderPayload)
      .select()
      .single();

    if (orderError) throw orderError;

    // Create Order Items
    const orderItemsPayload = validatedItems.map((item: any) => ({
      order_id: order.id,
      product_id: item.id,
      title: item.name,
      price: item.price,
      quantity: item.quantity,
      subtotal: item.price * item.quantity
    }));

    const { error: itemsError } = await supabase
      .from('order_items')
      .insert(orderItemsPayload);

    if (itemsError) throw itemsError;

    // Audit Log
    await supabase.from('audit_logs').insert({
      entity_type: 'order',
      entity_id: String(order.id),
      event_type: 'ORDER_CREATED',
      actor: user_id ? `user:${user_id}` : 'guest',
      metadata: { total, itemCount: validatedItems.length }
    });

    return new Response(
      JSON.stringify({ 
        order_id: order.id, 
        total, 
        order_reference: order.order_reference,
        message: 'Order created successfully' 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error("Error:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
