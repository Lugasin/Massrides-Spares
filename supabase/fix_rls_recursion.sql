
-- Fix Infinite Recursion in RLS Policies
-- The previous policy caused a loop: Checking "Can I read table?" -> "Check if I am admin" -> "Read table to check role" -> "Can I read table?" ...

-- 1. Drop the problematic recursive policies
DROP POLICY IF EXISTS "Admins and Super Admins can view all profiles" ON public.user_profiles;
DROP POLICY IF EXISTS "Users can view their own profile" ON public.user_profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.user_profiles;
DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON public.user_profiles;

-- 2. Create a secure function to check roles (Bypasses RLS loop)
CREATE OR REPLACE FUNCTION public.is_admin_or_super()
RETURNS BOOLEAN AS $$
BEGIN
  -- This runs with the privileges of the creator (superuser/admin), 
  -- so it doesn't trigger RLS checks on user_profiles for the caller.
  RETURN EXISTS (
    SELECT 1 FROM public.user_profiles
    WHERE user_id = auth.uid() 
    AND role IN ('admin', 'super_admin')
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Re-create the Policies

-- A. Users can view their own profile
CREATE POLICY "Users can view their own profile" ON public.user_profiles
    FOR SELECT
    USING (auth.uid() = user_id);

-- B. Users can update their own profile
CREATE POLICY "Users can update their own profile" ON public.user_profiles
    FOR UPDATE
    USING (auth.uid() = user_id);

-- C. Admins/Super Admins can view ALL profiles (Uses the secure function)
CREATE POLICY "Admins and Super Admins can view all profiles" ON public.user_profiles
    FOR SELECT
    USING (public.is_admin_or_super());

-- D. Initial Insert (for sign up)
CREATE POLICY "Enable insert for authenticated users only" ON public.user_profiles
    FOR INSERT
    WITH CHECK (auth.uid() = user_id);

-- 4. Grant access to the function
GRANT EXECUTE ON FUNCTION public.is_admin_or_super TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_admin_or_super TO anon;
