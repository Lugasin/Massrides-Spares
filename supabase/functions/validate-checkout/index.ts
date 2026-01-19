import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1";

// Inline CORS to prevent import errors during deploy
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

console.log("Validate-Checkout Function Invoked");

serve(async (req) => {
  // Handle CORS preflight request
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
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } }
    );

    // 2. Validate User
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
         console.error("Auth Error:", authError);
         throw { reason: 'UNAUTHORIZED', message: "User not authenticated" };
    }

    const { delivery_address, payment_method } = await req.json();

    console.log(`Validating checkout for User: ${user.id}`);

    // 3. Fetch Cart (Using .maybeSingle() to prevent 406 Error)
    const { data: cart } = await supabase
      .from('carts')
      .select('id')
      .eq('user_id', user.id)
      .maybeSingle();

    if (!cart) {
         throw { reason: 'CART_NOT_FOUND', message: "No active cart found for user" };
    }

    // 4. Fetch Cart Items
    const { data: items } = await supabase
      .from('cart_items')
      .select(`
        quantity,
        product:products (id, title, price, main_image)
      `)
      .eq('cart_id', cart.id);

    if (!items || items.length === 0) {
         throw { reason: 'CART_ITEMS_EMPTY', message: "Cart has no items" };
    }

    // 5. Map & Calculate
    const validItems = items.filter((i: any) => i.product && i.quantity > 0);
    const cartItems = validItems.map((i: any) => ({
        id: i.product.id,
        name: i.product.title,
        price: i.product.price,
        quantity: i.quantity,
        image: i.product.main_image || ''
    }));

    // 5. Calculate Total in USD (Database Currency)
    let subtotal = 0;
    cartItems.forEach((item: any) => {
        subtotal += Number(item.price) * item.quantity;
    });

    const shipping = 0; 
    const fees = 0;
    const totalUSD = subtotal + shipping + fees;

    // 6. Create Order (Status: awaiting_payment)
    const orderPayload = {
      user_id: user.id,
      subtotal,
      total: totalUSD, 
      fees,
      order_status: 'awaiting_payment',
      payment_status: 'pending',
      currency: 'USD', // Database keeps USD
      shipping_address: delivery_address || {},
      payment_method: payment_method || 'vesicash'
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

    const { error: itemsError } = await supabase.from('order_items').insert(orderItemsPayload);
    if (itemsError) throw { reason: 'ORDER_ITEMS_FAILED', message: itemsError.message };

    // 8. Initiate Vesicash Payment
    let paymentLink = null;
    const paymentReference = `ORD-${order.id}-${Date.now()}`;

    if (payment_method === 'vesicash') {
        const vesicashSecret = Deno.env.get('VESICASH_PRIVATE_KEY');
        const vesicashPublic = Deno.env.get('VESICASH_PUBLIC_KEY');

        // ✅ Fallback to origin or your production URL
        const origin = req.headers.get('origin') || 'https://massridesspares.netlify.app';
        // ✅ Correct Callback URL
        const callbackUrl = `${origin}/checkout/success`; 

        // Currency Conversion (Option A: Charge in Kwacha)
        const EXCHANGE_RATE = 28.5; 
        const totalZMW = Math.ceil(totalUSD * EXCHANGE_RATE); 

        if (!vesicashSecret) {
            console.warn("VESICASH_PRIVATE_KEY not set. Using Mock Link.");
            paymentLink = `${origin}/checkout/success?mock_ref=${paymentReference}`;
        } else {
            // Real Vesicash Call
            const vesicashRes = await fetch('https://sandbox.api.vesicash.com/v1/payment/pay', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'v-private-key': vesicashSecret,
                    'v-public-key':  vesicashPublic || ''
                },
                body: JSON.stringify({
                    amount: totalZMW, // ✅ Send converted Kwacha amount
                    currency: 'ZMW',  // ✅ Tell Vesicash this is Kwacha
                    email: user.email,
                    phone_number: user.phone || '0977000000',
                    reference: paymentReference,
                    callback_url: callbackUrl, 
                    metadata: { 
                        order_id: order.id,
                        cart_id: cart.id,
                        original_amount_usd: totalUSD
                    }
                })
            });

            const vesicashData = await vesicashRes.json();

            
            if (!vesicashRes.ok) {
                 console.error("Vesicash Error:", vesicashData);
                 throw { reason: 'PAYMENT_GATEWAY_ERROR', message: vesicashData.message || "Failed to init payment" };
            }

            paymentLink = vesicashData.link || vesicashData.payment_url;
        }
    }

    // 9. Return Success
    return new Response(
      JSON.stringify({ 
        order_id: order.id, 
        total, 
        payment_link: paymentLink,
        message: 'Order created successfully' 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error("Validation Error:", error);
    return new Response(
      JSON.stringify({
        error: "CHECKOUT_VALIDATION_FAILED",
        reason: error.reason || "UNKNOWN_ERROR",
        message: error.message || String(error)
      }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
