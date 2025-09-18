/*
  # Fix Authentication Flow Issues

  1. Authentication Fixes
    - Ensure proper user profile creation triggers
    - Fix email verification flow
    - Add proper error handling for auth operations

  2. Database Verification
    - Check all tables exist and are properly connected
    - Verify indexes are in place
    - Ensure RLS policies are working correctly

  3. Data Integrity
    - Fix any orphaned records
    - Ensure proper foreign key relationships
    - Add missing constraints where needed
*/

-- =====================================================
-- FIX USER PROFILE CREATION TRIGGER
-- =====================================================

-- Ensure the handle_new_user function exists and works properly
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Insert user profile with proper error handling
  INSERT INTO public.user_profiles (
    user_id,
    email,
    full_name,
    phone,
    company_name,
    role,
    is_verified,
    is_active,
    created_at,
    updated_at
  )
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    NEW.raw_user_meta_data->>'phone',
    NEW.raw_user_meta_data->>'company_name',
    COALESCE(NEW.raw_user_meta_data->>'role', 'customer'),
    NEW.email_confirmed_at IS NOT NULL,
    true,
    NOW(),
    NOW()
  )
  ON CONFLICT (user_id) DO UPDATE SET
    email = EXCLUDED.email,
    full_name = COALESCE(EXCLUDED.full_name, user_profiles.full_name),
    phone = COALESCE(EXCLUDED.phone, user_profiles.phone),
    company_name = COALESCE(EXCLUDED.company_name, user_profiles.company_name),
    is_verified = EXCLUDED.is_verified,
    updated_at = NOW();
  
  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    -- Log the error but don't fail the auth operation
    RAISE WARNING 'Failed to create user profile for %: %', NEW.id, SQLERRM;
    RETURN NEW;
END;
$$;

-- Recreate the trigger to ensure it's working
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- Also handle email confirmation updates
CREATE OR REPLACE FUNCTION public.handle_email_confirmation()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Update user profile when email is confirmed
  IF OLD.email_confirmed_at IS NULL AND NEW.email_confirmed_at IS NOT NULL THEN
    UPDATE public.user_profiles
    SET 
      is_verified = true,
      updated_at = NOW()
    WHERE user_id = NEW.id;
  END IF;
  
  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    RAISE WARNING 'Failed to update user profile verification for %: %', NEW.id, SQLERRM;
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_email_confirmed ON auth.users;
CREATE TRIGGER on_auth_user_email_confirmed
  AFTER UPDATE ON auth.users
  FOR EACH ROW
  WHEN (OLD.email_confirmed_at IS DISTINCT FROM NEW.email_confirmed_at)
  EXECUTE FUNCTION public.handle_email_confirmation();

-- =====================================================
-- VERIFY DATABASE SCHEMA INTEGRITY
-- =====================================================

-- Check that all required tables exist
DO $$
DECLARE
  missing_tables text[] := ARRAY[]::text[];
  required_tables text[] := ARRAY[
    'user_profiles', 'categories', 'spare_parts', 'orders', 'order_items',
    'user_carts', 'cart_items', 'guest_carts', 'guest_cart_items',
    'notifications', 'messages', 'conversations', 'quotes',
    'activity_logs', 'guest_verifications', 'user_settings',
    'tj_transaction_logs', 'tj_payment_methods', 'tj_security_logs',
    'system_metrics', 'ads', 'company_partners', 'audit_logs'
  ];
  table_name text;
BEGIN
  FOREACH table_name IN ARRAY required_tables
  LOOP
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.tables 
      WHERE table_schema = 'public' AND table_name = table_name
    ) THEN
      missing_tables := array_append(missing_tables, table_name);
    END IF;
  END LOOP;
  
  IF array_length(missing_tables, 1) > 0 THEN
    RAISE NOTICE 'Missing tables: %', array_to_string(missing_tables, ', ');
  ELSE
    RAISE NOTICE 'All required tables exist';
  END IF;
END $$;

-- Check that all required functions exist
DO $$
DECLARE
  missing_functions text[] := ARRAY[]::text[];
  required_functions text[] := ARRAY[
    'handle_new_user', 'has_role', 'uid', 'is_super_admin',
    'update_updated_at_column', 'log_security_event', 'record_metric'
  ];
  function_name text;
BEGIN
  FOREACH function_name IN ARRAY required_functions
  LOOP
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.routines 
      WHERE routine_schema = 'public' AND routine_name = function_name
    ) THEN
      missing_functions := array_append(missing_functions, function_name);
    END IF;
  END LOOP;
  
  IF array_length(missing_functions, 1) > 0 THEN
    RAISE NOTICE 'Missing functions: %', array_to_string(missing_functions, ', ');
  ELSE
    RAISE NOTICE 'All required functions exist';
  END IF;
END $$;

-- =====================================================
-- ADD MISSING INDEXES IF NOT EXISTS
-- =====================================================

-- Critical indexes for authentication and performance
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_user_profiles_user_id_unique ON public.user_profiles(user_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_user_profiles_email_unique ON public.user_profiles(email);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_user_profiles_role_active ON public.user_profiles(role, is_active);

-- Spare parts indexes for inventory management
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_spare_parts_vendor_active ON public.spare_parts(vendor_id, is_active);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_spare_parts_category_status ON public.spare_parts(category_id, availability_status);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_spare_parts_search_text ON public.spare_parts 
USING gin(to_tsvector('english', name || ' ' || COALESCE(description, '') || ' ' || part_number || ' ' || COALESCE(brand, '')));

-- Cart indexes for performance
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_cart_items_user_lookup ON public.cart_items(cart_id, spare_part_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_guest_cart_items_lookup ON public.guest_cart_items(guest_cart_id, spare_part_id);

-- =====================================================
-- VERIFY AND FIX RLS POLICIES
-- =====================================================

-- Ensure RLS is enabled on critical tables
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.spare_parts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_carts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cart_items ENABLE ROW LEVEL SECURITY;

-- Fix user profiles policies to allow profile creation
DROP POLICY IF EXISTS "Users can insert own profile" ON public.user_profiles;
CREATE POLICY "Users can insert own profile"
  ON public.user_profiles FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Allow service role to manage user profiles (for triggers)
DROP POLICY IF EXISTS "Service role can manage profiles" ON public.user_profiles;
CREATE POLICY "Service role can manage profiles"
  ON public.user_profiles FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- =====================================================
-- CLEAN UP ANY ORPHANED DATA
-- =====================================================

-- Remove any user profiles without corresponding auth users
DELETE FROM public.user_profiles 
WHERE user_id NOT IN (
  SELECT id FROM auth.users
);

-- Ensure all auth users have profiles
INSERT INTO public.user_profiles (user_id, email, role, is_verified, created_at, updated_at)
SELECT 
  id,
  email,
  'customer',
  email_confirmed_at IS NOT NULL,
  created_at,
  NOW()
FROM auth.users
WHERE NOT EXISTS (
  SELECT 1 FROM public.user_profiles WHERE user_profiles.user_id = auth.users.id
)
ON CONFLICT (user_id) DO NOTHING;