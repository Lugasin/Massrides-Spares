-- Vesicash Transaction Reconciliation Migration
-- This script adds a customer_email column, makes user_id nullable, 
-- and imports 19 transactions from the Vesicash dashboard logs.

-- 1. Schema Adjustments
ALTER TABLE orders ADD COLUMN IF NOT EXISTS customer_email TEXT;
ALTER TABLE orders ALTER COLUMN user_id DROP NOT NULL;

-- 2. Ensure a generic product exists for historical mapping
INSERT INTO products (id, sku, title, description, price, is_active, stock_quantity, brand, condition, availability_status)
VALUES (9999, 'VSH-HISTORICAL', 'Historical Order Correction', 'Reconciled from Vesicash dashboard', 0, false, 0, 'System', 'used', 'out_of_stock')
ON CONFLICT (id) DO NOTHING;

-- 3. Reconciliation Data Insertion
DO $$
DECLARE
    v_order_id bigint;
    v_user_id uuid;
    
    -- Helper record to iterate through transactions
    -- Format: email, amount, status, reference, timestamp
    t_reconciliation_data text[][] := ARRAY[
        ARRAY['mbitakwenda@gmail.com', '29', 'cancelled', 'VSH-PY_EM_1539d5cc4b', '2026-04-14 11:47:00'],
        ARRAY['mbitakwenda@gmail.com', '29', 'cancelled', 'VSH-PY_EM_55d433bc5e', '2026-04-14 11:45:00'],
        ARRAY['mbitakwenda@gmail.com', '29', 'cancelled', 'VSH-PY_EM_595a2d184d', '2026-04-13 17:00:00'],
        ARRAY['mbitakwenda@gmail.com', '29', 'cancelled', 'VSH-PY_EM_f97660fbfb', '2026-04-13 16:58:00'],
        ARRAY['nkamachidopatrick@gmail.com', '29', 'paid', 'VSH-PY_EM_7015d5c252', '2026-04-13 14:50:00'],
        ARRAY['mambwemwila1@gmail.com', '29', 'cancelled', 'VSH-PY_EM_3f6bf7129a', '2026-04-13 14:15:00'],
        ARRAY['mambwemwila1@gmail.com', '29', 'cancelled', 'VSH-PY_EM_3dfc37903d', '2026-04-13 12:46:00'],
        ARRAY['mambwemwila1@gmail.com', '29', 'cancelled', 'VSH-PY_EM_4d8f024220', '2026-04-13 12:27:00'],
        ARRAY['mambwemwila1@gmail.com', '29', 'cancelled', 'VSH-PY_EM_793244f9ed', '2026-04-13 11:28:00'],
        ARRAY['mambwemwila1@gmail.com', '2223', 'cancelled', 'VSH-PY_EM_026e3e935b', '2026-04-10 09:50:00'],
        ARRAY['natashamusenga13@gmail.com', '998', 'pending', 'VSH-PY_EM_3c144749e8', '2026-04-08 09:03:00'],
        ARRAY['nkamachidopatrick@gmail.com', '998', 'pending', 'VSH-PY_EM_e6b8d12916', '2026-04-08 08:55:00'],
        ARRAY['mambwemwila1@gmail.com', '2708', 'cancelled', 'VSH-PY_EM_9193a936a5', '2026-04-07 07:04:00'],
        ARRAY['nkamachidopatrick@gmail.com', '998', 'cancelled', 'VSH-PY_EM_948564c45c', '2026-04-06 22:40:00'],
        ARRAY['nkamachidopatrick@gmail.com', '2708', 'cancelled', 'VSH-PY_EM_9fbaebff09', '2026-04-06 22:36:00'],
        ARRAY['mambwemwila1@gmail.com', '998', 'pending', 'VSH-PY_EM_924970f63c', '2026-04-06 21:45:00'],
        ARRAY['mambwemwila1@gmail.com', '5273', 'cancelled', 'VSH-PY_EM_a7179d4da3', '2026-04-06 20:39:00'],
        ARRAY['mambwemwila1@gmail.com', '5273', 'cancelled', 'VSH-PY_EM_cae6216832', '2026-04-06 20:37:00'],
        ARRAY['mambwemwila1@gmail.com', '5273', 'cancelled', 'VSH-PY_EM_b2589d279d', '2026-04-06 20:29:00']
    ];
    t char(100); -- Use common length
    entry text[];
BEGIN
    FOREACH entry SLICE 1 IN ARRAY t_reconciliation_data LOOP
        -- A. Find user ID if exists
        SELECT id INTO v_user_id FROM profiles WHERE email = entry[1] LIMIT 1;
        
        -- B. Insert order
        INSERT INTO orders (order_number, user_id, customer_email, total_amount, status, created_at, updated_at)
        VALUES (entry[4], v_user_id, entry[1], entry[2]::numeric, entry[3], entry[5]::timestamptz, entry[5]::timestamptz)
        ON CONFLICT (order_number) DO NOTHING
        RETURNING id INTO v_order_id;
        
        -- C. Insert order item if order was inserted
        IF v_order_id IS NOT NULL THEN
            INSERT INTO order_items (order_id, product_id, quantity, price, created_at)
            VALUES (v_order_id, 9999, 1, entry[2]::numeric, entry[5]::timestamptz);
        END IF;
        
        v_order_id := NULL;
        v_user_id := NULL;
    END LOOP;
END $$;
