-- Ensure table exists if a previous migration rolled back
CREATE TABLE IF NOT EXISTS public.vendor_payouts (
    id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    vendor_id uuid NOT NULL REFERENCES auth.users(id),
    amount numeric NOT NULL CHECK (amount > 0),
    status text NOT NULL DEFAULT 'pending'::text,
    payout_reference text,
    failure_reason text,
    metadata jsonb DEFAULT '{}'::jsonb,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);

-- Ensure vendors can INSERT their own payout requests
DROP POLICY IF EXISTS "Vendors can request payouts" ON public.vendor_payouts;
CREATE POLICY "Vendors can request payouts" ON public.vendor_payouts FOR INSERT WITH CHECK (vendor_id = auth.uid());


