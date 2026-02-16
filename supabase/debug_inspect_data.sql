-- DEBUG SCRIPT: Inspect Cart Data and Function Definition
-- Run this in Supabase SQL Editor to see what's really happening

-- 1. Inspect Cart Data for your user
-- Replace 'YOUR_USER_ID' with '970e4f04-a9eb-4d08-a600-7c51d636cd3a' if needed, 
-- but using auth.uid() is better if running as authenticated user.
-- Since this is SQL Editor (postgres role), we just look at ALL items for that specific ID.

SELECT 'Checking User Carts for 970e...' as check_type;
SELECT * FROM public.user_carts WHERE user_id = '970e4f04-a9eb-4d08-a600-7c51d636cd3a';

SELECT 'Checking Cart Items for 970e...' as check_type;
SELECT ci.* 
FROM public.cart_items ci
JOIN public.user_carts uc ON uc.id = ci.cart_id
WHERE uc.user_id = '970e4f04-a9eb-4d08-a600-7c51d636cd3a';

-- 2. Inspect Function Definition
-- This reveals the source code of the function currently stored in the DB
SELECT 'Function Definition: create_order_from_cart' as check_type;
SELECT pg_get_functiondef(oid) 
FROM pg_proc 
WHERE proname = 'create_order_from_cart';

-- 3. Check Table Column Types (to confirm Schema Mismatch)
SELECT 'Column Types: order_items.product_id' as check_type;
SELECT table_name, column_name, data_type 
FROM information_schema.columns 
WHERE table_name IN ('order_items', 'cart_items', 'inventory') 
AND column_name = 'product_id';
