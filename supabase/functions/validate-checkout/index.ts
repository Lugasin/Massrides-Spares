import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1";
import { corsHeaders } from "../_shared/cors.ts";

console.log("Validate-Checkout Function Invoked");

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // 1. Auth & Client Setup
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
       throw { reason: 'MISSING_AUTH_HEADER', message: "Authorization header missing" };
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } }
    );

    // 2. Validate User
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
         throw { reason: 'UNAUTHORIZED', message: "User not authenticated" };
    }

    const { guest_session_id } = await req.json();

    console.log(`Validating checkout for User: ${user.id}`);

    // 3. Fetch Cart (Strict: Auth User Only for now as per "AUTH-SAFE" rule, but assuming hybrid handling if guest_session_id passed fallback?)
    // User requested: "validate-checkout MUST be AUTH-SAFE... Use supabase.auth.getUser()... Fetch cart using user_id"
    // I will prioritize Authenticated User Cart logic. 

    const { data: cart } = await supabase
      .from('carts')
      .select('id')
      .eq('user_id', user.id)
      .maybeSingle();

    if (!cart) {
         throw { reason: 'CART_NOT_FOUND', message: "No active cart found for user" };
    }

    // 4. Fetch Cart Items from TABLE (Strict: cart_items)
    // Absolute no read from carts.items
    const { data: items } = await supabase
      .from('cart_items')
      .select(`
        quantity,
        product:products (
          id, title, price, main_image
        )
      `)
      .eq('cart_id', cart.id);

    if (!items || items.length === 0) {
         throw { reason: 'CART_ITEMS_EMPTY', message: "Cart has no items" };
    }

    // 5. Map & Calculate
    // Ensure we only process valid items
    const validItems = items.filter((i: any) => i.product && i.quantity > 0);

    if (validItems.length === 0) {
        throw { reason: 'CART_ITEMS_INVALID', message: "Items found but products data missing or quantity 0" };
    }

    const cartItems = validItems.map((i: any) => ({
        id: i.product.id,
        name: i.product.title,
        price: i.product.price,
        quantity: i.quantity,
        image: i.product.main_image || ''
    }));

    // Server-side Total Calculation
    let subtotal = 0;
    cartItems.forEach((item: any) => {
        subtotal += Number(item.price) * item.quantity;
    });

    // TODO: Add Fees/Shipping Logic
    const shipping = 0; 
    const fees = 0;
    const total = subtotal + shipping + fees;

    console.log(`Calculated Total: ${total}`);

    // 6. Create Order
    const orderPayload = {
      user_id: user.id,
      guest_token: null, // Auth user flow
      subtotal,
      total, 
      fees,
      order_status: 'awaiting_payment',
      payment_status: 'pending',
      currency: 'ZMW' 
    };

    const { data: order, error: orderError } = await supabase
      .from('orders')
      .insert(orderPayload)
      .select()
      .single();

    if (orderError) {
         console.error("Order Creation Error:", orderError);
         throw { reason: 'ORDER_CREATION_FAILED', message: orderError.message };
    }

    // 7. Create Order Items
    const orderItemsPayload = cartItems.map((item: any) => ({
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

    if (itemsError) {
        console.error("Order Items Error:", itemsError);
        throw { reason: 'ORDER_ITEMS_FAILED', message: itemsError.message };
    }

    // 8. Audit Log
    await supabase.from('audit_logs').insert({
      entity_type: 'order',
      entity_id: String(order.id),
      event_type: 'ORDER_CREATED',
      actor: `user:${user.id}`,
      metadata: { total, itemCount: cartItems.length }
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

  } catch (error: any) {
    console.error("Validation Error:", error);
    
    // Structured Error Response
    const errorBody = {
        error: "CHECKOUT_VALIDATION_FAILED",
        reason: error.reason || "UNKNOWN_ERROR",
        message: error.message || String(error)
    };

    return new Response(
      JSON.stringify(errorBody),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
