-- Create system_settings table
CREATE TABLE IF NOT EXISTS public.system_settings (
    key TEXT PRIMARY KEY,
    value JSONB NOT NULL DEFAULT '{}'::jsonb,
    updated_by UUID REFERENCES auth.users(id),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Seed with initial currency config
INSERT INTO public.system_settings (key, value)
VALUES ('currency', '{"primary": "ZMW", "secondary": "USD", "exchange_rate": 28, "auto_fetch": false}')
ON CONFLICT (key) DO NOTHING;

-- Create vendor_wallets table
CREATE TABLE IF NOT EXISTS public.vendor_wallets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    vendor_id UUID NOT NULL REFERENCES public.vendors(id) UNIQUE,
    balance NUMERIC NOT NULL DEFAULT 0,
    currency TEXT DEFAULT 'ZMW',
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Create payout_requests table
CREATE TABLE IF NOT EXISTS public.payout_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    vendor_id UUID NOT NULL REFERENCES public.vendors(id),
    amount NUMERIC NOT NULL CHECK (amount > 0),
    currency TEXT DEFAULT 'ZMW',
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'paid')),
    bank_details JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Create refunds table
CREATE TABLE IF NOT EXISTS public.refunds (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id BIGINT NOT NULL REFERENCES public.orders(id),
    payment_id BIGINT REFERENCES public.payments(id),
    amount NUMERIC NOT NULL CHECK (amount > 0),
    currency TEXT DEFAULT 'ZMW',
    reason TEXT,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Create reviews table
CREATE TABLE IF NOT EXISTS public.reviews (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id),
    product_id BIGINT NOT NULL REFERENCES public.products(id),
    rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
    comment TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Create support_tickets table
CREATE TABLE IF NOT EXISTS public.support_tickets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id),
    subject TEXT NOT NULL,
    description TEXT,
    status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'in_progress', 'resolved', 'closed')),
    priority TEXT DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Ensure activity_logs exists (it was in initial schema, but just in case)
CREATE TABLE IF NOT EXISTS public.activity_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id),
    action TEXT NOT NULL,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- RLS Policies
ALTER TABLE public.system_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vendor_wallets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payout_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.refunds ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.support_tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.activity_logs ENABLE ROW LEVEL SECURITY;

-- system_settings: Read by all, update by admin/super_admin
CREATE POLICY "Public read system_settings" ON public.system_settings FOR SELECT USING (true);
CREATE POLICY "Admin update system_settings" ON public.system_settings FOR UPDATE
USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'super_admin')));

-- vendor_wallets: Vendor views own, admin views all
CREATE POLICY "Vendor view own wallet" ON public.vendor_wallets FOR SELECT
USING (vendor_id IN (SELECT id FROM public.vendors WHERE owner_id = auth.uid()) OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'super_admin')));

-- payout_requests: Vendor views/creates own, admin views/updates all
CREATE POLICY "Vendor manage own payout_requests" ON public.payout_requests FOR SELECT
USING (vendor_id IN (SELECT id FROM public.vendors WHERE owner_id = auth.uid()) OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'super_admin')));
CREATE POLICY "Vendor create payout_requests" ON public.payout_requests FOR INSERT
WITH CHECK (vendor_id IN (SELECT id FROM public.vendors WHERE owner_id = auth.uid()));

-- reviews: Read by all, create by authenticated
CREATE POLICY "Public read reviews" ON public.reviews FOR SELECT USING (true);
CREATE POLICY "Auth users create reviews" ON public.reviews FOR INSERT WITH CHECK (auth.uid() = user_id);

-- support_tickets: User views/creates own, admin manages all
CREATE POLICY "User manage own support_tickets" ON public.support_tickets FOR SELECT
USING (user_id = auth.uid() OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'super_admin')));
CREATE POLICY "User create support_tickets" ON public.support_tickets FOR INSERT WITH CHECK (auth.uid() = user_id);

-- activity_logs: Admin/Super Admin only
CREATE POLICY "Admin view activity_logs" ON public.activity_logs FOR SELECT
USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'super_admin')));

GRANT ALL ON public.system_settings TO authenticated;
GRANT ALL ON public.system_settings TO service_role;
GRANT ALL ON public.vendor_wallets TO authenticated;
GRANT ALL ON public.vendor_wallets TO service_role;
GRANT ALL ON public.payout_requests TO authenticated;
GRANT ALL ON public.payout_requests TO service_role;
GRANT ALL ON public.refunds TO authenticated;
GRANT ALL ON public.refunds TO service_role;
GRANT ALL ON public.reviews TO authenticated;
GRANT ALL ON public.reviews TO service_role;
GRANT ALL ON public.support_tickets TO authenticated;
GRANT ALL ON public.support_tickets TO service_role;
GRANT ALL ON public.activity_logs TO authenticated;
GRANT ALL ON public.activity_logs TO service_role;
