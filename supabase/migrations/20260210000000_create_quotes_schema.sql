-- Migration: Create Quotes Schema
-- Description: Tables for Quotes and Quote Items with RLS and Triggers

BEGIN;

-- 1. Create quotes table
CREATE TABLE IF NOT EXISTS public.quotes (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    quote_number text NOT NULL,
    client_id uuid REFERENCES public.user_profiles(id),
    vendor_id uuid REFERENCES public.user_profiles(id),
    status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'accepted', 'rejected', 'revised', 'cancelled')),
    total_amount numeric DEFAULT 0,
    notes text,
    valid_until timestamp with time zone,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    CONSTRAINT quotes_pkey PRIMARY KEY (id)
);

-- 2. Create quote_items table
CREATE TABLE IF NOT EXISTS public.quote_items (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    quote_id uuid NOT NULL REFERENCES public.quotes(id) ON DELETE CASCADE,
    spare_part_id uuid REFERENCES public.spare_parts(id), -- Assuming spare_parts table exists
    product_name text, -- Snapshot name in case product is deleted
    quantity numeric NOT NULL DEFAULT 1,
    price numeric NOT NULL DEFAULT 0, -- Snapshot unit price
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    CONSTRAINT quote_items_pkey PRIMARY KEY (id)
);

-- 3. Enable RLS
ALTER TABLE public.quotes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quote_items ENABLE ROW LEVEL SECURITY;

-- 4. RLS Policies for Quotes
-- Clients can see their own quotes
CREATE POLICY "Clients can view own quotes" ON public.quotes
    FOR SELECT USING (auth.uid() IN (SELECT user_id FROM public.user_profiles WHERE id = client_id));

-- Vendors can see quotes assigned to them (or all if open marketplace? Assuming assigned for now or created by them?)
-- For now, allow vendors to see quotes where they are the vendor_id
CREATE POLICY "Vendors can view assigned quotes" ON public.quotes
    FOR SELECT USING (auth.uid() IN (SELECT user_id FROM public.user_profiles WHERE id = vendor_id));

-- Admins can view all quotes
CREATE POLICY "Admins can view all quotes" ON public.quotes
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.user_profiles 
            WHERE user_id = auth.uid() AND role IN ('admin', 'super_admin')
        )
    );

-- Clients can create quotes
CREATE POLICY "Clients can create quotes" ON public.quotes
    FOR INSERT WITH CHECK (
        auth.uid() IN (SELECT user_id FROM public.user_profiles WHERE id = client_id)
    );

-- Vendors/Admins can update quotes (e.g. status, total)
CREATE POLICY "Vendors and Admins can update quotes" ON public.quotes
    FOR UPDATE USING (
        (auth.uid() IN (SELECT user_id FROM public.user_profiles WHERE id = vendor_id)) OR
        EXISTS (
            SELECT 1 FROM public.user_profiles 
            WHERE user_id = auth.uid() AND role IN ('admin', 'super_admin')
        )
    );

-- 5. RLS Policies for Quote Items
-- Viewable if user can view the parent quote
CREATE POLICY "View quote items if access to quote" ON public.quote_items
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.quotes 
            WHERE id = quote_items.quote_id 
            AND (
                -- Client access
                client_id IN (SELECT id FROM public.user_profiles WHERE user_id = auth.uid()) OR
                -- Vendor access
                vendor_id IN (SELECT id FROM public.user_profiles WHERE user_id = auth.uid()) OR
                -- Admin access
                EXISTS (SELECT 1 FROM public.user_profiles WHERE user_id = auth.uid() AND role IN ('admin', 'super_admin'))
            )
        )
    );

-- Create items if client creates quote
CREATE POLICY "Clients can add items to own quotes" ON public.quote_items
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.quotes 
            WHERE id = quote_items.quote_id 
            AND client_id IN (SELECT id FROM public.user_profiles WHERE user_id = auth.uid())
        )
    );

-- 6. Updated_at Trigger
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_quotes_updated_at
    BEFORE UPDATE ON public.quotes
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_quote_items_updated_at
    BEFORE UPDATE ON public.quote_items
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

COMMIT;
