/*
  # Order Management System

  1. New Tables
    - `orders` - Order management with payment tracking
    - `order_items` - Order line items with pricing
    - `quotes` - Quote requests and responses
    - `quote_items` - Quote line items

  2. Security
    - Enable RLS on all order tables
    - Add policies for user and admin access
    - Ensure proper data isolation

  3. Features
    - Support for both user and guest orders
    - Complete order lifecycle tracking
    - Quote management system
*/

-- =====================================================
-- ORDER TABLES CREATION
-- =====================================================

-- Orders Table
CREATE TABLE IF NOT EXISTS public.orders (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid REFERENCES public.user_profiles(id) ON DELETE SET NULL,
    order_number text NOT NULL UNIQUE,
    status text DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled', 'failed')),
    payment_status text DEFAULT 'pending' CHECK (payment_status IN ('pending', 'processing', 'paid', 'failed', 'refunded', 'authorised', 'settled', 'partially_refunded')),
    total_amount numeric(10,2) NOT NULL CHECK (total_amount >= 0),
    tax_amount numeric(10,2) DEFAULT 0 CHECK (tax_amount >= 0),
    shipping_amount numeric(10,2) DEFAULT 0 CHECK (shipping_amount >= 0),
    discount_amount numeric(10,2) DEFAULT 0 CHECK (discount_amount >= 0),
    currency text DEFAULT 'USD',
    shipping_address jsonb,
    billing_address jsonb,
    notes text,
    tracking_number text,
    payment_intent_id text,
    stripe_session_id text,
    tj jsonb DEFAULT '{}',
    guest_email text,
    guest_name text,
    shipped_at timestamptz,
    delivered_at timestamptz,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

-- Order Items Table
CREATE TABLE IF NOT EXISTS public.order_items (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id uuid REFERENCES public.orders(id) ON DELETE CASCADE NOT NULL,
    spare_part_id uuid REFERENCES public.spare_parts(id) ON DELETE RESTRICT NOT NULL,
    quantity integer NOT NULL CHECK (quantity > 0),
    unit_price numeric(10,2) NOT NULL CHECK (unit_price >= 0),
    total_price numeric(10,2) GENERATED ALWAYS AS (quantity * unit_price) STORED,
    created_at timestamptz DEFAULT now()
);

-- Quotes Table
CREATE TABLE IF NOT EXISTS public.quotes (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid REFERENCES public.user_profiles(id) ON DELETE CASCADE,
    quote_number text NOT NULL UNIQUE,
    client_id uuid REFERENCES public.user_profiles(id) ON DELETE SET NULL,
    vendor_id uuid REFERENCES public.user_profiles(id) ON DELETE SET NULL,
    status text DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'accepted', 'rejected', 'revised', 'cancelled')),
    total_amount numeric(10,2) DEFAULT 0 CHECK (total_amount >= 0),
    notes text,
    response_notes text,
    valid_until timestamptz,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

-- Quote Items Table
CREATE TABLE IF NOT EXISTS public.quote_items (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    quote_id uuid REFERENCES public.quotes(id) ON DELETE CASCADE NOT NULL,
    product_name text NOT NULL,
    quantity integer NOT NULL CHECK (quantity > 0),
    price numeric(10,2) NOT NULL CHECK (price >= 0),
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

-- =====================================================
-- INDEXES FOR ORDER SYSTEM
-- =====================================================

-- Orders Indexes
CREATE INDEX IF NOT EXISTS idx_orders_user_id ON public.orders(user_id);
CREATE INDEX IF NOT EXISTS idx_orders_order_number ON public.orders(order_number);
CREATE INDEX IF NOT EXISTS idx_orders_status ON public.orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_payment_status ON public.orders(payment_status);
CREATE INDEX IF NOT EXISTS idx_orders_payment_intent_id ON public.orders(payment_intent_id);
CREATE INDEX IF NOT EXISTS idx_orders_guest_email ON public.orders(guest_email);
CREATE INDEX IF NOT EXISTS idx_orders_created_at ON public.orders(created_at);

-- Order Items Indexes
CREATE INDEX IF NOT EXISTS idx_order_items_order_id ON public.order_items(order_id);
CREATE INDEX IF NOT EXISTS idx_order_items_spare_part_id ON public.order_items(spare_part_id);

-- Quotes Indexes
CREATE INDEX IF NOT EXISTS idx_quotes_user_id ON public.quotes(user_id);
CREATE INDEX IF NOT EXISTS idx_quotes_client_id ON public.quotes(client_id);
CREATE INDEX IF NOT EXISTS idx_quotes_vendor_id ON public.quotes(vendor_id);
CREATE INDEX IF NOT EXISTS idx_quotes_status ON public.quotes(status);
CREATE INDEX IF NOT EXISTS idx_quotes_quote_number ON public.quotes(quote_number);

-- Quote Items Indexes
CREATE INDEX IF NOT EXISTS idx_quote_items_quote_id ON public.quote_items(quote_id);

-- =====================================================
-- ROW LEVEL SECURITY FOR ORDERS
-- =====================================================

-- Enable RLS
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quotes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quote_items ENABLE ROW LEVEL SECURITY;

-- Orders Policies
DROP POLICY IF EXISTS "Users can read own orders" ON public.orders;
CREATE POLICY "Users can read own orders"
    ON public.orders FOR SELECT
    TO authenticated
    USING (
        user_id IN (
            SELECT id FROM public.user_profiles 
            WHERE user_id = auth.uid()
        )
    );

DROP POLICY IF EXISTS "Users can create orders" ON public.orders;
CREATE POLICY "Users can create orders"
    ON public.orders FOR INSERT
    TO authenticated
    WITH CHECK (
        user_id IN (
            SELECT id FROM public.user_profiles 
            WHERE user_id = auth.uid()
        )
    );

DROP POLICY IF EXISTS "Admins can manage all orders" ON public.orders;
CREATE POLICY "Admins can manage all orders"
    ON public.orders FOR ALL
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.user_profiles up
            WHERE up.user_id = auth.uid() 
            AND up.role IN ('admin', 'super_admin')
        )
    );

-- Order Items Policies
DROP POLICY IF EXISTS "Users can read own order items" ON public.order_items;
CREATE POLICY "Users can read own order items"
    ON public.order_items FOR SELECT
    TO authenticated
    USING (
        order_id IN (
            SELECT o.id FROM public.orders o
            JOIN public.user_profiles up ON o.user_id = up.id
            WHERE up.user_id = auth.uid()
        )
    );

DROP POLICY IF EXISTS "Admins can manage all order items" ON public.order_items;
CREATE POLICY "Admins can manage all order items"
    ON public.order_items FOR ALL
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.user_profiles up
            WHERE up.user_id = auth.uid() 
            AND up.role IN ('admin', 'super_admin')
        )
    );

-- Quotes Policies
DROP POLICY IF EXISTS "Users can manage own quotes" ON public.quotes;
CREATE POLICY "Users can manage own quotes"
    ON public.quotes FOR ALL
    TO authenticated
    USING (
        user_id IN (
            SELECT id FROM public.user_profiles 
            WHERE user_id = auth.uid()
        ) OR
        client_id IN (
            SELECT id FROM public.user_profiles 
            WHERE user_id = auth.uid()
        ) OR
        vendor_id IN (
            SELECT id FROM public.user_profiles 
            WHERE user_id = auth.uid()
        )
    );

DROP POLICY IF EXISTS "Admins can manage all quotes" ON public.quotes;
CREATE POLICY "Admins can manage all quotes"
    ON public.quotes FOR ALL
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.user_profiles up
            WHERE up.user_id = auth.uid() 
            AND up.role IN ('admin', 'super_admin')
        )
    );

-- Quote Items Policies
DROP POLICY IF EXISTS "Users can manage quote items" ON public.quote_items;
CREATE POLICY "Users can manage quote items"
    ON public.quote_items FOR ALL
    TO authenticated
    USING (
        quote_id IN (
            SELECT q.id FROM public.quotes q
            WHERE q.user_id IN (
                SELECT id FROM public.user_profiles 
                WHERE user_id = auth.uid()
            ) OR q.client_id IN (
                SELECT id FROM public.user_profiles 
                WHERE user_id = auth.uid()
            ) OR q.vendor_id IN (
                SELECT id FROM public.user_profiles 
                WHERE user_id = auth.uid()
            )
        )
    );

-- =====================================================
-- TRIGGERS FOR ORDER AUTOMATION
-- =====================================================

-- Add updated_at triggers
DROP TRIGGER IF EXISTS update_orders_updated_at ON public.orders;
CREATE TRIGGER update_orders_updated_at
    BEFORE UPDATE ON public.orders
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_quotes_updated_at ON public.quotes;
CREATE TRIGGER update_quotes_updated_at
    BEFORE UPDATE ON public.quotes
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_quote_items_updated_at ON public.quote_items;
CREATE TRIGGER update_quote_items_updated_at
    BEFORE UPDATE ON public.quote_items
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

-- Function to generate order numbers
CREATE OR REPLACE FUNCTION public.generate_order_number()
RETURNS text
LANGUAGE plpgsql
AS $$
DECLARE
    order_num text;
    counter integer;
BEGIN
    -- Generate order number: ORD-YYYYMMDD-NNNN
    SELECT COALESCE(MAX(CAST(SUBSTRING(order_number FROM 'ORD-\d{8}-(\d{4})') AS integer)), 0) + 1
    INTO counter
    FROM public.orders
    WHERE order_number LIKE 'ORD-' || TO_CHAR(CURRENT_DATE, 'YYYYMMDD') || '-%';
    
    order_num := 'ORD-' || TO_CHAR(CURRENT_DATE, 'YYYYMMDD') || '-' || LPAD(counter::text, 4, '0');
    
    RETURN order_num;
END;
$$;

-- Function to generate quote numbers
CREATE OR REPLACE FUNCTION public.generate_quote_number()
RETURNS text
LANGUAGE plpgsql
AS $$
DECLARE
    quote_num text;
    counter integer;
BEGIN
    -- Generate quote number: QUO-YYYYMMDD-NNNN
    SELECT COALESCE(MAX(CAST(SUBSTRING(quote_number FROM 'QUO-\d{8}-(\d{4})') AS integer)), 0) + 1
    INTO counter
    FROM public.quotes
    WHERE quote_number LIKE 'QUO-' || TO_CHAR(CURRENT_DATE, 'YYYYMMDD') || '-%';
    
    quote_num := 'QUO-' || TO_CHAR(CURRENT_DATE, 'YYYYMMDD') || '-' || LPAD(counter::text, 4, '0');
    
    RETURN quote_num;
END;
$$;

-- =====================================================
-- COMMENTS FOR DOCUMENTATION
-- =====================================================

COMMENT ON TABLE public.orders IS 'Order management with support for both authenticated and guest users';
COMMENT ON TABLE public.order_items IS 'Individual line items within orders';
COMMENT ON TABLE public.quotes IS 'Quote requests and responses between customers and vendors';
COMMENT ON TABLE public.quote_items IS 'Individual line items within quotes';

COMMENT ON FUNCTION public.generate_order_number() IS 'Generates unique order numbers in format ORD-YYYYMMDD-NNNN';
COMMENT ON FUNCTION public.generate_quote_number() IS 'Generates unique quote numbers in format QUO-YYYYMMDD-NNNN';