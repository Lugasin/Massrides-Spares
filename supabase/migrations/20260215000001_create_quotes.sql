-- Create Quotes Table
CREATE TABLE IF NOT EXISTS public.quotes (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
    items jsonb DEFAULT '[]',
    status text DEFAULT 'pending' CHECK (status IN ('pending', 'reviewed', 'accepted', 'rejected')),
    total_estimated_amount numeric DEFAULT 0,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.quotes ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Users can view own quotes" ON public.quotes
    FOR SELECT TO authenticated
    USING (user_id = auth.uid());

CREATE POLICY "Users can create quotes" ON public.quotes
    FOR INSERT TO authenticated
    WITH CHECK (user_id = auth.uid());

CREATE POLICY "Admins can view all quotes" ON public.quotes
    FOR SELECT TO authenticated
    USING (public.has_role('admin') OR public.has_role('super_admin'));
