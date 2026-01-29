-- Vendor Payouts Table
-- Support for vendor payment processing

BEGIN;

CREATE TABLE IF NOT EXISTS public.payouts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  vendor_id uuid REFERENCES public.vendors(id) ON DELETE CASCADE,
  amount numeric(12,2) NOT NULL,
  currency text NOT NULL DEFAULT 'ZMW',
  status text NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'PROCESSING', 'PAID', 'FAILED', 'CANCELLED')),
  payout_ref text,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- RLS
ALTER TABLE public.payouts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Vendors view own payouts" ON public.payouts
FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.vendor_users vu WHERE vu.vendor_id = public.payouts.vendor_id AND vu.user_id = auth.uid())
);

CREATE POLICY "Admins manage payouts" ON public.payouts
FOR ALL USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'super_admin'))
);

COMMIT;
