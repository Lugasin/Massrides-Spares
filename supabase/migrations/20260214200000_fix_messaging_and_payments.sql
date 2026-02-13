-- Migration: Fix Messaging FKs and Create Payment Methods Table
-- Description: 
-- 1. Align messaging tables FKs to point to user_profiles (matching frontend) instead of profiles.
-- 2. Create missing tj_payment_methods table required by PaymentMethods.tsx.

-- =====================================================
-- 1. Fix Conversation Foreign Keys
-- =====================================================

-- Drop old constraints (referencing public.profiles)
ALTER TABLE public.conversations DROP CONSTRAINT IF EXISTS conversations_participant_1_id_fkey;
ALTER TABLE public.conversations DROP CONSTRAINT IF EXISTS conversations_participant_2_id_fkey;

-- Add new constraints (referencing public.user_profiles)
ALTER TABLE public.conversations 
    ADD CONSTRAINT conversations_participant_1_id_fkey 
    FOREIGN KEY (participant_1_id) REFERENCES public.user_profiles(id) ON DELETE CASCADE;

ALTER TABLE public.conversations 
    ADD CONSTRAINT conversations_participant_2_id_fkey 
    FOREIGN KEY (participant_2_id) REFERENCES public.user_profiles(id) ON DELETE CASCADE;

-- =====================================================
-- 2. Fix Messages Foreign Keys
-- =====================================================

-- Drop old constraints (referencing public.profiles)
ALTER TABLE public.messages DROP CONSTRAINT IF EXISTS messages_sender_id_fkey;
ALTER TABLE public.messages DROP CONSTRAINT IF EXISTS messages_recipient_id_fkey;

-- Add new constraints (referencing public.user_profiles)
ALTER TABLE public.messages 
    ADD CONSTRAINT messages_sender_id_fkey 
    FOREIGN KEY (sender_id) REFERENCES public.user_profiles(id) ON DELETE CASCADE;

ALTER TABLE public.messages 
    ADD CONSTRAINT messages_recipient_id_fkey 
    FOREIGN KEY (recipient_id) REFERENCES public.user_profiles(id) ON DELETE CASCADE;

-- =====================================================
-- 3. Create tj_payment_methods Table
-- =====================================================

CREATE TABLE IF NOT EXISTS public.tj_payment_methods (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL REFERENCES public.user_profiles(id) ON DELETE CASCADE,
    payment_method_token text NOT NULL,
    brand text NOT NULL,
    last4 text NOT NULL,
    exp_month integer NOT NULL,
    exp_year integer NOT NULL,
    is_default boolean DEFAULT false,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    CONSTRAINT tj_payment_methods_pkey PRIMARY KEY (id)
);

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_tj_payment_methods_user_id ON public.tj_payment_methods(user_id);

-- Enable RLS
ALTER TABLE public.tj_payment_methods ENABLE ROW LEVEL SECURITY;

-- Create RLS Policies
DROP POLICY IF EXISTS "Users can manage own payment methods" ON public.tj_payment_methods;
CREATE POLICY "Users can manage own payment methods"
    ON public.tj_payment_methods
    FOR ALL
    TO authenticated
    USING (user_id = (SELECT id FROM public.user_profiles WHERE user_id = auth.uid()))
    WITH CHECK (user_id = (SELECT id FROM public.user_profiles WHERE user_id = auth.uid()));

-- Create Trigger for updated_at
-- (Assuming update_updated_at_column function exists from core schema)
DROP TRIGGER IF EXISTS update_tj_payment_methods_updated_at ON public.tj_payment_methods;
CREATE TRIGGER update_tj_payment_methods_updated_at
    BEFORE UPDATE ON public.tj_payment_methods
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- 4. Grant Permissions (Fix 401s)
-- =====================================================
GRANT ALL ON public.tj_payment_methods TO authenticated;
GRANT ALL ON public.tj_payment_methods TO service_role;
