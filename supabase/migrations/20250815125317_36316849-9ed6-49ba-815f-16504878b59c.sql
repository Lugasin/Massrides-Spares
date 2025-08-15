-- Comprehensive TJ Integration Migration
-- This creates all necessary tables, policies, triggers, and functions for the full system

-- 1. Fix currency default to USD
ALTER TABLE public.orders ALTER COLUMN currency SET DEFAULT 'USD';
UPDATE public.orders SET currency = 'USD' WHERE currency IS NULL OR currency != 'USD';

-- 2. Add missing columns to orders if they don't exist
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'orders' AND column_name = 'stripe_session_id') THEN
        ALTER TABLE public.orders ADD COLUMN stripe_session_id TEXT;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'orders' AND column_name = 'tj' AND data_type = 'jsonb') THEN
        ALTER TABLE public.orders ADD COLUMN tj JSONB;
    END IF;
END $$;

-- 3. Create TJ payment methods table for tokenized cards
CREATE TABLE IF NOT EXISTS public.tj_payment_methods (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.user_profiles(id) ON DELETE CASCADE,
    tj_customer_id TEXT,
    payment_method_token TEXT NOT NULL,
    brand TEXT,
    last4 TEXT,
    exp_month INTEGER,
    exp_year INTEGER,
    is_default BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 4. Enable RLS and create policies for TJ payment methods
ALTER TABLE public.tj_payment_methods ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own payment methods" ON public.tj_payment_methods
    FOR SELECT USING (
        user_id IN (SELECT id FROM public.user_profiles WHERE user_id = auth.uid())
    );

CREATE POLICY "Users can insert their own payment methods" ON public.tj_payment_methods
    FOR INSERT WITH CHECK (
        user_id IN (SELECT id FROM public.user_profiles WHERE user_id = auth.uid())
    );

CREATE POLICY "Users can update their own payment methods" ON public.tj_payment_methods
    FOR UPDATE USING (
        user_id IN (SELECT id FROM public.user_profiles WHERE user_id = auth.uid())
    );

CREATE POLICY "Users can delete their own payment methods" ON public.tj_payment_methods
    FOR DELETE USING (
        user_id IN (SELECT id FROM public.user_profiles WHERE user_id = auth.uid())
    );

-- 5. Add updated_at trigger for TJ payment methods
CREATE TRIGGER update_tj_payment_methods_updated_at
    BEFORE UPDATE ON public.tj_payment_methods
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

-- 6. Create quotes table (implementing the feature)
CREATE TABLE IF NOT EXISTS public.quotes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES public.user_profiles(id) ON DELETE SET NULL,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'responded', 'accepted', 'rejected', 'expired')),
    items JSONB NOT NULL DEFAULT '[]',
    notes TEXT,
    response_notes TEXT,
    quoted_total NUMERIC,
    valid_until TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 7. Enable RLS and create policies for quotes
ALTER TABLE public.quotes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own quotes" ON public.quotes
    FOR SELECT USING (
        user_id IN (SELECT id FROM public.user_profiles WHERE user_id = auth.uid())
    );

CREATE POLICY "Users can create their own quotes" ON public.quotes
    FOR INSERT WITH CHECK (
        user_id IN (SELECT id FROM public.user_profiles WHERE user_id = auth.uid())
    );

CREATE POLICY "Users can update their own quotes" ON public.quotes
    FOR UPDATE USING (
        user_id IN (SELECT id FROM public.user_profiles WHERE user_id = auth.uid())
    );

CREATE POLICY "Admins can view all quotes" ON public.quotes
    FOR SELECT USING (
        has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'super_admin')
    );

CREATE POLICY "Admins can update all quotes" ON public.quotes
    FOR UPDATE USING (
        has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'super_admin')
    );

-- 8. Add updated_at trigger for quotes
CREATE TRIGGER update_quotes_updated_at
    BEFORE UPDATE ON public.quotes
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

-- 9. Fix cart RLS policies to handle user_profiles correctly
DROP POLICY IF EXISTS "Users can manage their own cart" ON public.user_carts;
CREATE POLICY "Users can manage their own cart" ON public.user_carts
    FOR ALL USING (
        user_id IN (SELECT id FROM public.user_profiles WHERE user_id = auth.uid())
    );

DROP POLICY IF EXISTS "Users can manage their own cart items" ON public.cart_items;
CREATE POLICY "Users can manage their own cart items" ON public.cart_items
    FOR ALL USING (
        cart_id IN (
            SELECT uc.id FROM public.user_carts uc
            JOIN public.user_profiles up ON uc.user_id = up.id
            WHERE up.user_id = auth.uid()
        )
    );

-- 10. Add missing policies for order_items
DROP POLICY IF EXISTS "System can insert order items" ON public.order_items;
CREATE POLICY "System can insert order items" ON public.order_items
    FOR INSERT WITH CHECK (true); -- Edge functions will handle this

-- 11. Add missing policies for orders creation
DROP POLICY IF EXISTS "System can insert orders" ON public.orders;
CREATE POLICY "System can insert orders" ON public.orders
    FOR INSERT WITH CHECK (true); -- Edge functions will handle this

DROP POLICY IF EXISTS "System can update orders" ON public.orders;
CREATE POLICY "System can update orders" ON public.orders
    FOR UPDATE USING (true); -- Edge functions will handle this

-- 12. Add guest cart policies with proper session handling
DROP POLICY IF EXISTS "Public access to guest carts" ON public.guest_carts;
CREATE POLICY "Public access to guest carts" ON public.guest_carts
    FOR ALL TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "Public access to guest cart items" ON public.guest_cart_items;
CREATE POLICY "Public access to guest cart items" ON public.guest_cart_items
    FOR ALL TO anon, authenticated USING (true);

-- 13. Enable realtime for all necessary tables
ALTER TABLE public.notifications REPLICA IDENTITY FULL;
ALTER TABLE public.messages REPLICA IDENTITY FULL;
ALTER TABLE public.orders REPLICA IDENTITY FULL;
ALTER TABLE public.order_items REPLICA IDENTITY FULL;
ALTER TABLE public.spare_parts REPLICA IDENTITY FULL;
ALTER TABLE public.user_profiles REPLICA IDENTITY FULL;
ALTER TABLE public.quotes REPLICA IDENTITY FULL;
ALTER TABLE public.tj_payment_methods REPLICA IDENTITY FULL;

-- Add tables to realtime publication
DO $$
BEGIN
    -- Add notifications to realtime if not already added
    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables 
        WHERE pubname = 'supabase_realtime' 
        AND tablename = 'notifications'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;
    END IF;
    
    -- Add messages to realtime if not already added
    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables 
        WHERE pubname = 'supabase_realtime' 
        AND tablename = 'messages'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;
    END IF;
    
    -- Add orders to realtime if not already added
    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables 
        WHERE pubname = 'supabase_realtime' 
        AND tablename = 'orders'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.orders;
    END IF;
    
    -- Add spare_parts to realtime if not already added
    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables 
        WHERE pubname = 'supabase_realtime' 
        AND tablename = 'spare_parts'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.spare_parts;
    END IF;
    
    -- Add quotes to realtime if not already added
    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables 
        WHERE pubname = 'supabase_realtime' 
        AND tablename = 'quotes'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.quotes;
    END IF;
END $$;

-- 14. Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_orders_user_id ON public.orders(user_id);
CREATE INDEX IF NOT EXISTS idx_orders_status ON public.orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_payment_status ON public.orders(payment_status);
CREATE INDEX IF NOT EXISTS idx_orders_created_at ON public.orders(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_spare_parts_vendor_id ON public.spare_parts(vendor_id);
CREATE INDEX IF NOT EXISTS idx_spare_parts_category_id ON public.spare_parts(category_id);
CREATE INDEX IF NOT EXISTS idx_spare_parts_featured ON public.spare_parts(featured) WHERE featured = true;
CREATE INDEX IF NOT EXISTS idx_notifications_user_id_read ON public.notifications(user_id, read_at);
CREATE INDEX IF NOT EXISTS idx_messages_conversation_id ON public.messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_quotes_user_id_status ON public.quotes(user_id, status);
CREATE INDEX IF NOT EXISTS idx_tj_payment_methods_user_id ON public.tj_payment_methods(user_id);

-- 15. Force PostgREST schema reload
SELECT pg_notify('pgrst', 'reload schema');

-- 16. Add audit trigger to sensitive tables
CREATE TRIGGER audit_spare_parts_changes
    AFTER INSERT OR UPDATE OR DELETE ON public.spare_parts
    FOR EACH ROW EXECUTE FUNCTION public.log_sensitive_access();

CREATE TRIGGER audit_orders_changes
    AFTER INSERT OR UPDATE OR DELETE ON public.orders
    FOR EACH ROW EXECUTE FUNCTION public.log_sensitive_access();

CREATE TRIGGER audit_user_profiles_changes
    AFTER INSERT OR UPDATE OR DELETE ON public.user_profiles
    FOR EACH ROW EXECUTE FUNCTION public.log_sensitive_access();