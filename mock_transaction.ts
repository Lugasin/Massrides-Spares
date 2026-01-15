
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();
dotenv.config({ path: '.env.local', override: true });

const SUB_URL = process.env.VITE_PUBLIC_SUPABASE_URL;
const SUB_KEY = process.env.VITE_PUBLIC_SUPABASE_ANON_KEY;

if (!SUB_URL || !SUB_KEY) {
    console.error("Missing VITE_PUBLIC_SUPABASE_URL or VITE_PUBLIC_SUPABASE_ANON_KEY");
    process.exit(1);
}

const supabase = createClient(SUB_URL, SUB_KEY);

async function runTest() {
    console.log("🚀 Starting End-to-End Payment Test (Guest w/ Ref Mode)");

    // 1. Create Guest Session
    const guestToken = `ref_guest_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
    console.log(`\n1. Creating Guest Session: ${guestToken}`);
    
    const { error: guestError } = await supabase
        .from('guest_sessions')
        .insert({ token: guestToken, email: 'ref_test@example.com' });

    if (guestError) {
        console.error("❌ Failed to create guest session:", guestError.message);
        process.exit(1);
    }

    // 2. Create Dummy Order (As Guest, no Select because RLS blocks read-back)
    const orderRef = `REF-${Date.now()}`;
    console.log(`\n2. Creating Order (Blind Insert): ${orderRef}`);
    
    const { error: orderError } = await supabase
        .from('orders')
        .insert({
            guest_token: guestToken,
            total: 50.00,
            subtotal: 45.00,
            status: 'pending',
            currency: 'USD',
            payment_provider: 'vesicash',
            order_reference: orderRef,
            customer_email: 'ref_test@example.com'
        });

    if (orderError) {
        console.error("❌ Failed to create order:", orderError.message);
        process.exit(1);
    }
    console.log("✅ Order Created (Blind)");

    // 3. Initiate Payment (By Reference)
    console.log(`\n3. Calling create-payment-session (via fetch)`);
    
    const funcUrl = `${SUB_URL}/functions/v1/create-payment-session`;
    const res = await fetch(funcUrl, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${SUB_KEY}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ order_reference: orderRef, return_url: 'http://localhost:3000/checkout/success' })
    });

    if (!res.ok) {
        const errText = await res.text();
        console.error(`❌ Function Error (${res.status}):`, errText);
        process.exit(1);
    }
    
    const sessionData = await res.json();
    const paymentUrl = sessionData?.payment_url;
    const merchantRef = sessionData?.merchant_reference;
    
    console.log("✅ Session Created!");
    console.log("   URL:", paymentUrl);
    console.log("   Ref:", merchantRef);

    // 4. Mock Webhook (Vesicash calls back)
    console.log(`\n4. Simulating Webhook (Success)`);
    
    const webhookPayload = {
        event: 'payment.success',
        data: {
            reference: merchantRef,
            amount: 50.00,
            currency: 'USD',
            id: `evt_ref_${Date.now()}`
        }
    };

    const { data: webhookRes, error: webhookError } = await supabase.functions.invoke('handle-vesicash-webhook', {
        body: webhookPayload
    });

    if (webhookError) {
        console.error("❌ Webhook Failed:", webhookError);
    } else {
        console.log("✅ Webhook Processed:", webhookRes);
    }

    console.log("\n---------------------------------------------------");
    console.log("🎉 TEST COMPLETE via Guest Ref Mode");
    console.log("   Please verify the transaction in the Super Admin Dashboard.");
    console.log(`   Look for Merchant Ref: ${merchantRef}`);
    console.log(`   Order Ref: ${orderRef}`);
    console.log("---------------------------------------------------");
}

runTest();
