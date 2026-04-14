-- Create SECURITY DEFINER functions to bypass RLS recursion issues
-- These functions run with elevated privileges to check user roles

-- Function to get current user's role
CREATE OR REPLACE FUNCTION public.current_user_role(user_id uuid)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    user_role text;
BEGIN
    -- This function runs with elevated privileges, bypassing RLS
    SELECT role INTO user_role
    FROM public.user_profiles
    WHERE user_id = $1;

    RETURN COALESCE(user_role, 'guest');
END;
$$;

-- Function to check if user has admin/super_admin role
CREATE OR REPLACE FUNCTION public.is_admin_or_super_admin(user_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    user_role text;
BEGIN
    SELECT role INTO user_role
    FROM public.user_profiles
    WHERE user_id = $1;

    RETURN user_role IN ('admin', 'super_admin');
END;
$$;

-- Function to check if user has specific role
CREATE OR REPLACE FUNCTION public.has_role(user_id uuid, required_role text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    user_role text;
BEGIN
    SELECT role INTO user_role
    FROM public.user_profiles
    WHERE user_id = $1;

    RETURN user_role = required_role;
END;
$$;

-- Grant execute permissions to authenticated users
GRANT EXECUTE ON FUNCTION public.current_user_role(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_admin_or_super_admin(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, text) TO authenticated;