-- =====================================================
-- Fix missing RLS helper functions
-- =====================================================
-- This migration creates the helper functions used in RLS policies
-- that were referenced but not found in the active schema

-- Create app_role enum if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'app_role') THEN
        CREATE TYPE public.app_role AS ENUM (
            'customer',
            'vendor',
            'admin',
            'super_admin',
            'support',
            'guest'
        );
    END IF;
END
$$;

-- Drop existing functions CASCADE if they exist
DROP FUNCTION IF EXISTS public.has_role(uuid, text) CASCADE;
DROP FUNCTION IF EXISTS public.is_super_admin(uuid) CASCADE;

-- Create has_role function
CREATE FUNCTION public.has_role(_user_id uuid, _role text)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _user_role text;
BEGIN
  SELECT role INTO _user_role
  FROM public.user_profiles
  WHERE user_id = _user_id
  LIMIT 1;

  RETURN _user_role = _role;
END;
$$;

-- Create is_super_admin function
CREATE FUNCTION public.is_super_admin(_user_id uuid)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1
    FROM public.user_profiles
    WHERE user_id = _user_id
    AND role = 'super_admin'
  );
END;
$$;

-- Create current_profile_id function
CREATE OR REPLACE FUNCTION public.current_profile_id()
RETURNS uuid
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN (
    SELECT id
    FROM public.user_profiles
    WHERE user_id = auth.uid()
    LIMIT 1
  );
END;
$$;

-- Grant execution rights
GRANT EXECUTE ON FUNCTION public.has_role(uuid, text) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.is_super_admin(uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.current_profile_id() TO authenticated, service_role;
