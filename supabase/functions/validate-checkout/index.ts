import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

console.log("Validate-Checkout Function Invoked");

serve(async (req) => {
  // Handle CORS preflight request
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders, status: 200 });
  }

  // Enforce POST
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method Not Allowed' }), {
      status: 405,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }

  try {
    // 1. Strict Auth Extraction
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
       throw { reason: 'MISSING_AUTH_HEADER', message: "Authorization header missing" };
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } }
    );

    // 2. Validate User (Strict)
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
         console.error("Auth Error:", authError);
         throw { reason: 'UNAUTHORIZED', message: "User not authenticated" };
    }

    const { delivery_address, payment_method } = await req.json();

    console.log(`Validating checkout for User: ${user.id}`);

    // 3. Fetch Cart Items (User Only)
    const { data: items, error: itemsError } = await supabase
      .from('cart_items')
      .select(`
        quantity,
        product:products (id, name, price, main_image)
      `)
      .eq('user_id', user.id);

    if (itemsError) {
        console.error("Cart Fetch Error:", itemsError);
        throw { reason: 'CART_FETCH_FAILED', message: itemsError.message };
    }

    if (!items || items.length === 0) {
         throw { reason: 'CART_ITEMS_EMPTY', message: "Cart has no items" };
    }

    // 4. Map & Calculate
    const validItems = items.filter((i: any) => i.product && i.quantity > 0);
    const cartItems = validItems.map((i: any) => ({
        id: i.product.id,
        name: i.product.name,
        price: i.product.price,
        quantity: i.quantity,
        image: i.product.main_image || ''
    }));

    let subtotal = 0;
    cartItems.forEach((item: any) => {
        subtotal += Number(item.price) * item.quantity;
    });

    const totalUSD = subtotal; 

    // 5. Create Order
    const orderPayload = {
      user_id: user.id,
      subtotal,
      total: totalUSD, 
      fees: 0,
      order_status: 'awaiting_payment',
      payment_status: 'pending',
      currency: 'USD',
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

    // 6. Insert Order Items
    const dbOrderItems = cartItems.map((item: any) => ({
      order_id: order.id,
      product_id: item.id,
      title: item.name,
      price: item.price,
      quantity: item.quantity,
      subtotal: item.price * item.quantity
    }));

    const { error: itemsError } = await supabase.from('order_items').insert(dbOrderItems);
    if (itemsError) throw { reason: 'ORDER_ITEMS_FAILED', message: itemsError.message };

    // 7. Payment Link (Vesicash)
    let paymentLink = null;
    const paymentReference = `ORD-${order.id}-${Date.now()}`;

    if (payment_method === 'vesicash') {
        const vesicashSecret = Deno.env.get('VESICASH_PRIVATE_KEY');
        const vesicashPublic = Deno.env.get('VESICASH_PUBLIC_KEY');
        const origin = req.headers.get('origin') || 'https://massridesspares.netlify.app';
        const callbackUrl = `${origin}/checkout/success`; 
        
        // Convert to ZMW
        const EXCHANGE_RATE = 28.5; 
        const totalZMW = Math.ceil(totalUSD * EXCHANGE_RATE); 

        if (vesicashSecret) {
             const vesicashRes = await fetch('https://sandbox.api.vesicash.com/v1/payment/pay', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'v-private-key': vesicashSecret,
                    'v-public-key':  vesicashPublic || ''
                },
                body: JSON.stringify({
                    amount: totalZMW, 
                    currency: 'ZMW',  
                    email: user.email, // Use authenticated email
                    phone_number: delivery_address?.phone || '0977000000',
                    reference: paymentReference,
                    callback_url: callbackUrl, 
                    metadata: { 
                        order_id: order.id,
                        cart_type: 'user', // Strict
                        original_amount_usd: totalUSD
                    }
                })
            });
            const vData = await vesicashRes.json();
            if (!vesicashRes.ok) {
                 console.error("Vesicash Error:", vData);
                 throw { reason: 'PAYMENT_GATEWAY_ERROR', message: vData.message || "Failed to init payment" };
            }
            paymentLink = vData.link || vData.payment_url;
        } else {
            paymentLink = `${origin}/checkout/success?mock_ref=${paymentReference}`;
        }
    }

    return new Response(
      JSON.stringify({ 
        order_id: order.id, 
        total: totalUSD, 
        payment_link: paymentLink,
        message: 'Order created successfully' 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error("Handler Error:", error);
    return new Response(
      JSON.stringify({
        error: "CHECKOUT_FAILED",
        reason: error.reason || "UNKNOWN",
        message: error.message || String(error)
      }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
