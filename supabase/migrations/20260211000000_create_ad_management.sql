-- Migration: Ad Management System
-- Description: Create tables for vendor media and advertisements, and configure storage.
-- Made idempotent: DROP POLICY IF EXISTS before each CREATE POLICY.

-- 1. Create vendor_media table
CREATE TABLE IF NOT EXISTS public.vendor_media (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    vendor_id uuid NOT NULL REFERENCES public.user_profiles(id) ON DELETE CASCADE,
    file_name text NOT NULL,
    file_url text NOT NULL,
    file_type text,
    file_size numeric,
    alt_text text,
    description text,
    tags text[] DEFAULT '{}',
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    CONSTRAINT vendor_media_pkey PRIMARY KEY (id)
);

-- 2. Create ads table
CREATE TABLE IF NOT EXISTS public.ads (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    vendor_id uuid NOT NULL REFERENCES public.user_profiles(id) ON DELETE CASCADE,
    title text NOT NULL,
    description text,
    image_url text NOT NULL,
    target_url text,
    ad_type text DEFAULT 'banner' CHECK (ad_type IN ('banner', 'sidebar', 'featured', 'popup')),
    status text DEFAULT 'pending' CHECK (status IN ('pending', 'active', 'rejected', 'paused', 'expired')),
    start_date timestamp with time zone,
    end_date timestamp with time zone,
    clicks integer DEFAULT 0,
    impressions integer DEFAULT 0,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    CONSTRAINT ads_pkey PRIMARY KEY (id)
);

-- 3. Enable RLS
ALTER TABLE public.vendor_media ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ads ENABLE ROW LEVEL SECURITY;

-- 4. RLS Policies for Vendor Media (idempotent)
DROP POLICY IF EXISTS "Vendors can manage own media" ON public.vendor_media;
CREATE POLICY "Vendors can manage own media" ON public.vendor_media
    FOR ALL USING (
        vendor_id IN (SELECT id FROM public.user_profiles WHERE user_id = auth.uid())
    );

DROP POLICY IF EXISTS "Admins can manage all media" ON public.vendor_media;
CREATE POLICY "Admins can manage all media" ON public.vendor_media
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.user_profiles 
            WHERE user_id = auth.uid() AND role IN ('admin', 'super_admin')
        )
    );

-- 5. RLS Policies for Ads (idempotent)
DROP POLICY IF EXISTS "Vendors can manage own ads" ON public.ads;
CREATE POLICY "Vendors can manage own ads" ON public.ads
    FOR ALL USING (
        vendor_id IN (SELECT id FROM public.user_profiles WHERE user_id = auth.uid())
    );

DROP POLICY IF EXISTS "Admins can manage all ads" ON public.ads;
CREATE POLICY "Admins can manage all ads" ON public.ads
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.user_profiles 
            WHERE user_id = auth.uid() AND role IN ('admin', 'super_admin')
        )
    );

DROP POLICY IF EXISTS "Public can view active ads" ON public.ads;
CREATE POLICY "Public can view active ads" ON public.ads
    FOR SELECT USING (status = 'active');

-- 6. Triggers for Updated At (use CREATE OR REPLACE where possible)
-- First ensure the function exists
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_vendor_media_updated_at ON public.vendor_media;
CREATE TRIGGER update_vendor_media_updated_at
    BEFORE UPDATE ON public.vendor_media
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_ads_updated_at ON public.ads;
CREATE TRIGGER update_ads_updated_at
    BEFORE UPDATE ON public.ads
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- 7. Storage Bucket Configuration (Idempotent)
INSERT INTO storage.buckets (id, name, public)
VALUES ('vendor-media', 'vendor-media', true)
ON CONFLICT (id) DO NOTHING;

-- Storage Policies (idempotent)
DROP POLICY IF EXISTS "Vendors can upload media" ON storage.objects;
CREATE POLICY "Vendors can upload media" ON storage.objects
    FOR INSERT WITH CHECK (
        bucket_id = 'vendor-media' AND
        auth.uid()::text = (storage.foldername(name))[1]
    );

DROP POLICY IF EXISTS "Vendors can update/delete own media" ON storage.objects;
CREATE POLICY "Vendors can update/delete own media" ON storage.objects
    FOR UPDATE USING (
        bucket_id = 'vendor-media' AND
        auth.uid()::text = (storage.foldername(name))[1]
    );

DROP POLICY IF EXISTS "Vendors can update/delete own media delete" ON storage.objects;
CREATE POLICY "Vendors can update/delete own media delete" ON storage.objects
    FOR DELETE USING (
        bucket_id = 'vendor-media' AND
        auth.uid()::text = (storage.foldername(name))[1]
    );

DROP POLICY IF EXISTS "Public can read media" ON storage.objects;
CREATE POLICY "Public can read media" ON storage.objects
    FOR SELECT USING (bucket_id = 'vendor-media');
