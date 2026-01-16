-- Create a specific Test Order for Verification
-- Run this in SQL Editor and copy the returned ID.

-- 0. Ensure Guest Session Exists (to satisfy FK)
INSERT INTO guest_sessions (session_id)
VALUES ('test-session-123')
ON CONFLICT (session_id) DO NOTHING;

-- 1. Insert Order
INSERT INTO orders (
    user_id, 
    guest_token, 
    total, 
    subtotal, 
    fees, 
    order_status, 
    payment_status, 
    customer_info, 
    delivery_address
) VALUES (
    NULL, -- guest
    'test-session-123',
    150.00,
    140.00,
    10.00,
    'awaiting_payment',
    'pending',
    '{"email": "eplacehub@gmail.com", "firstName": "Test", "lastName": "User"}'::jsonb,
    '{"city": "Lusaka", "line1": "123 Farm Rd"}'::jsonb
)
RETURNING id;


-- OPTIONAL: Robust block for Order + Payment together
-- If you want a fresh unique one every time, run this block:

DO $$
DECLARE
    new_order_id uuid;
    new_session_id text := 'test-session-manual-' || extract(epoch from now());
BEGIN
    -- Create Session
    INSERT INTO guest_sessions(session_id) VALUES (new_session_id);

    -- Create Order
    INSERT INTO orders (
        user_id, 
        guest_token, 
        total, 
        subtotal, 
        fees, 
        order_status, 
        payment_status, 
        customer_info, 
        delivery_address
    ) VALUES (
        NULL, 
        new_session_id,
        150.00,
        140.00,
        10.00,
        'awaiting_payment',
        'pending',
        '{"email": "eplacehub@gmail.com", "firstName": "Test", "lastName": "User"}'::jsonb,
        '{"city": "Lusaka", "line1": "123 Farm Rd"}'::jsonb
    )
    RETURNING id INTO new_order_id;

    -- Create Payment
    INSERT INTO payments (
        order_id,
        amount,
        currency,
        payment_status,
        vesicash_transaction_id
    ) VALUES (
        new_order_id,
        150.00, 
        'ZMW', 
        'pending', 
        'tx_test_' || extract(epoch from now()) 
    );

    -- Output ID (for manual copy, look at Messages/Results if supported, otherwise just query last order)
    RAISE NOTICE 'Created Order ID: %', new_order_id;
END $$;
