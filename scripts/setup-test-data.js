import { createClient } from '@supabase/supabase-js';
import { v4 as uuidv4 } from 'uuid'; // need uuid logic, but importing 'uuid' might need install.
// simpler: just generate random string
import 'dotenv/config';

// Verify Env
const SUPABASE_URL = process.env.VITE_PUBLIC_SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const SUPABASE_KEY = process.env.VITE_PUBLIC_SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY) {
    console.error("Missing SUPABASE_URL or ANON_KEY in .env");
    process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

function generateUUID() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
        var r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
    });
}

async function createTestData() {
    console.log("Creating Test Order via validate-checkout...");

    // We need a guest cart with items?
    // validate-checkout checks cart items. 
    // If we pass an empty session, it might fail saying "Cart empty".

    // Step 1: Create a Guest Cart and Add Item
    // We need to bypass RLS to add items? 
    // Guest cart RLS allows insert if session_id matches?
    // Let's try to insert a guest cart item.

    const sessionId = generateUUID();
    console.log("Guest Session:", sessionId);

    // 1. Create Guest Cart
    const { data: cart, error: cartError } = await supabase
        .from('guest_carts')
        .insert({ session_id: sessionId })
        .select()
        .single();

    if (cartError) {
        console.error("Error creating guest cart:", cartError);
        return;
    }

    // 2. Add Item (Need a valid Spare Part ID).
    // I need to query one first.
    // NOTE: Table is likely 'products', referenced as spare_part_id in cart.
    const { data: part } = await supabase.from('products').select('id').limit(1).single();
    if (!part) {
        console.error("No products found in DB to add to cart.");
        return;
    }

    const { error: itemError } = await supabase
        .from('guest_cart_items')
        .insert({
            guest_cart_id: cart.id,
            product_id: part.id,
            quantity: 1
        });

    if (itemError) {
        console.error("Error adding item to cart:", itemError);
        return;
    }

    console.log("Cart populated.");

    // 3. Call validate-checkout
    console.log("Invoking validate-checkout...");

    const payload = {
        guest_session_id: sessionId,
        user_id: null,
        customer_info: {
            email: "test_verification@massrides.com",
            firstName: "System",
            lastName: "Verifier",
            address: "123 Ops Rd",
            city: "Lusaka",
            state: "Lusaka",
            zipCode: "10101",
            country: "Zambia"
        },
        shipping_info: {
            firstName: "System",
            lastName: "Verifier",
            address: "123 Ops Rd",
            city: "Lusaka",
            state: "Lusaka",
            zipCode: "10101",
            country: "Zambia"
        }
    };

    // console.log("Payload:", JSON.stringify(payload, null, 2));

    const { data: orderData, error: orderError } = await supabase.functions.invoke('validate-checkout', {
        body: payload
    });

    if (orderError) {
        console.error("INVOKE ERROR:", orderError);
        return;
    }

    if (orderData?.error) {
        console.error("FUNCTION LOGIC ERROR:", orderData.error);
        if (orderData.details) console.error("DETAILS:", orderData.details);
        return;
    }

    if (!orderData?.order_id) {
        console.error("UNKNOWN RESPONSE:", orderData);
        return;
    }

    const orderId = orderData.order_id;
    console.log("Order Created:", orderId);

    // 4. Call create-payment-session
    console.log("Invoking create-payment-session...");
    const { data: paymentSession, error: checkouthError } = await supabase.functions.invoke('create-payment-session', {
        body: {
            order_id: orderId,
            return_url: 'http://localhost:5173/checkout/success'
        }
    });

    if (checkouthError) {
        console.error("Error creating payment session:", checkouthError);
    } else {
        console.log("Payment Session Created.");
    }

    const fs = await import('fs');
    fs.writeFileSync('order_id.txt', orderId);
    console.log("Order ID written to order_id.txt");

    console.log("\n--- TEST READY ---");
    console.log(`Run the webhook test now:`);
    console.log(`node scripts/test-webhook.js ${orderId}`);
}

createTestData();
