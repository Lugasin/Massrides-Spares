import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';
import fs from 'fs';

// Load env vars from .env.local if exists, otherwise .env
// We manually parse to avoid issues with standard dotenv load order if needed, but config() is usually fine.
// Since we are in ESM, 'dotenv/config' works if file is .env.
// But we prefer .env.local.
if (fs.existsSync('.env.local')) {
    config({ path: '.env.local' });
} else {
    config(); // loads .env
}

const SUPABASE_URL = process.env.VITE_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.VITE_PUBLIC_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    console.error('❌ Error: Missing SUPABASE_URL or SUPABASE_ANON_KEY');
    console.error('   Please verify .env.local exists and has VITE_PUBLIC_SUPABASE_url.');
    process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
const GUEST_ID = 'verify-sys-' + Math.floor(Math.random() * 10000);

async function runVerification() {
    console.log('\n🚀 Starting End-to-End System Verification');
    console.log(`📡 URL: ${SUPABASE_URL}`);
    console.log('-------------------------------------------');

    try {
        // 1. Connectivity Check
        process.stdout.write('1️⃣  Checking Database Connection... ');
        // Simplest query
        const { data: dbData, error: dbError } = await supabase.from('products').select('id, price').limit(1);
        if (dbError) throw dbError;
        if (!dbData || dbData.length === 0) throw new Error('No products found (DB connected but empty?)');
        const product = dbData[0];
        console.log('✅ Connected');

        // 2. Guest Session & Cart
        process.stdout.write('2️⃣  Creating Guest Cart... ');
        
        // Upsert Session
        const { error: sessionError } = await supabase.from('guest_sessions').upsert({ session_id: GUEST_ID }).select();
        if (sessionError) throw new Error(`Guest Session Error: ${sessionError.message}`);

        // Create Cart (if not exists)
        // Note: guest_carts usually linked to session_id.
        // We will try to insert a cart, ignoring conflict
        const { data: cartData, error: cartError } = await supabase.from('guest_carts')
            .upsert({ session_id: GUEST_ID }, { onConflict: 'session_id' })
            .select('id')
            .single();
            
        if (cartError) throw new Error(`Guest Cart Error: ${cartError.message}`);
        const guestCartId = cartData.id;

        // Add Item
        const { error: itemError } = await supabase.from('guest_cart_items').insert({
            guest_cart_id: guestCartId,
            product_id: product.id,
            quantity: 1
        });
        if (itemError) throw new Error(`Add Item Error: ${itemError.message}`);
        
        console.log('✅ Guest Cart Created');


        // 3. Validate Checkout
        process.stdout.write('3️⃣  Invoking validate-checkout... ');
        const { data: orderData, error: fnError } = await supabase.functions.invoke('validate-checkout', {
            body: {
                guest_session_id: GUEST_ID,
                customer_info: {
                    email: "verify_ops@massrides.com",
                    firstName: "System",
                    lastName: "Verifier",
                    address: "123 Ops Rd",
                    city: "Lusaka",
                    state: "LSK",
                    zipCode: "10101",
                    country: "Zambia"
                }
            }
        });

        if (fnError) throw new Error(`Edge Function Invoke Failed: ${fnError.message}`);
        if (orderData?.error) throw new Error(`Validation Logic Failed: ${orderData.error}`);
        
        const orderId = orderData.order_id || orderData.order?.id;
        if (!orderId) throw new Error('No Order ID returned: ' + JSON.stringify(orderData));
        console.log(`✅ Order Created: ${orderId}`);


        // 4. Payment Session
        process.stdout.write('4️⃣  Invoking create-payment-session... ');
        const { data: paymentData, error: payError } = await supabase.functions.invoke('create-payment-session', {
            body: {
                order_id: orderId,
                return_url: 'http://localhost:3000/success'
            }
        });

        if (payError) throw new Error(`Payment Function Invoke Failed: ${payError.message}`);
        if (paymentData?.error) throw new Error(`Payment Creation Failed: ${paymentData.error}`);
        if (!paymentData.checkout_url) throw new Error('No checkout_url returned');
        
        console.log('✅ Payment Session Created');
        console.log(`   🔗 Vesicash URL: ${paymentData.checkout_url}`);
        console.log('   (This confirms Vesicash integration is active)');

        console.log('-------------------------------------------');
        console.log('🎉 SYSTEM VERIFICATION PASSED!');
        console.log('   User Flow: Guest -> Cart -> Order -> Payment Link = SUCCESS');

    } catch (err) {
        console.log('❌ FAILED');
        console.error('\n🛑 Error Details:');
        console.error(err.message || err);
        process.exit(1);
    }
}

runVerification();
