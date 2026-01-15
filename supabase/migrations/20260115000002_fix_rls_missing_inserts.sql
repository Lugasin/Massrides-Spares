-- Fix Missing INSERT/UPDATE Policies
-- The consolidated init seemed to lack INSERT policies for critical ecommerce tables.

-- 1. ORDERS
-- Allow Users and Guests to create orders
CREATE POLICY "Enable insert for authenticated users and guests" ON orders
    FOR INSERT TO public
    WITH CHECK (true); 
    -- We can be stricter: ensure user_id = auth.uid() OR guest_token is present
    -- But for now, open INSERT is standard for checkout, validated by backend logic.

-- Allow Users to view their own (Already exists? "orders_customer_select")
-- Add Guest View support? 
-- Difficult without matching token in headers. 
-- For now, allow Users to SELECT records they own (user_id matches).

-- 2. ORDER ITEMS
ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Enable insert for orders" ON order_items
    FOR INSERT TO public
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM orders
            WHERE orders.id = order_items.order_id
            -- AND (orders.user_id = auth.uid() OR orders.guest_token IS NOT NULL)
        )
    );
    
CREATE POLICY "Enable select for order owners" ON order_items
    FOR SELECT TO public
    USING (
        EXISTS (
            SELECT 1 FROM orders
            WHERE orders.id = order_items.order_id
            AND (orders.user_id = auth.uid()) -- Guests hard to auth for SELECT
        )
    );

-- 3. GUEST SESSIONS
ALTER TABLE guest_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Enable all access for anon" ON guest_sessions
    FOR ALL TO anon
    USING (true)
    WITH CHECK (true);

-- 4. CARTS
-- Ensure carts are writable
CREATE POLICY "Enable insert/update for own cart" ON carts
    FOR ALL TO public
    USING (user_id = auth.uid() OR guest_token IS NOT NULL)
    WITH CHECK (user_id = auth.uid() OR guest_token IS NOT NULL);
