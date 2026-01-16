import crypto from 'crypto';
// import fetch from 'node-fetch'; // Using native fetch
import 'dotenv/config';

// Use global fetch if available (Node 18+), else fallback
const fetchClient = globalThis.fetch || fetch;

// CONFIGURATION
const WEBHOOK_URL = process.env.WEBHOOK_URL || 'http://localhost:54321/functions/v1/handle-payment-webhook';

// KEY MUST MATCH what is in your .env or Supabase Secrets
const WEBHOOK_SECRET = process.env.VESICASH_WEBHOOK_SECRET || 'test_secret_123';

async function simulateWebhook() {
    const orderId = process.argv[2]; // Pass order UUID as arg
    if (!orderId) {
        console.error("Please provide an Order ID: node scripts/test-webhook.js <ORDER_UUID>");
        return;
    }

    // Mock Payload (Vesicash structure)
    // We use the Order ID as the reference so our updated webhook logic finds it.
    const payload = {
        event_id: `evt_${Date.now()}`,
        event_type: 'payment.success',
        transaction_id: `tx_${Date.now()}`,
        status: 'success',
        amount: 150.00,
        currency: 'USD',
        reference: `ORD-${orderId}-${Date.now()}`, // Format matched by webhook fallback logic
        customer: {
            email: 'test_customer@example.com'
        }
    };

    console.log("Preparing Payload for Reference:", payload.reference);

    // Compute Signature
    const signature = crypto
        .createHmac('sha256', WEBHOOK_SECRET)
        .update(JSON.stringify(payload))
        .digest('hex');

    console.log("Signature:", signature);

    try {
        const response = await fetchClient(WEBHOOK_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'v-signature': signature,
                // 'x-vesicash-signature': signature // Add both if unsure
            },
            body: JSON.stringify(payload)
        });

        const data = await response.text();
        console.log("Response Status:", response.status);
        console.log("Response Body:", data);
    } catch (err) {
        console.error("Error:", err);
    }
}

simulateWebhook();
