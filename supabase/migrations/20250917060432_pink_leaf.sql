/*
  # Admin Role Management System

  1. New Tables
    - `admin_roles` - Granular admin role assignments with expiration
    
  2. Security
    - Enable RLS on admin role tables
    - Add policies for super admin management only
    - Implement role validation

  3. Features
    - Granular permission system
    - Role expiration and audit trail
    - Super admin oversight
*/

-- =====================================================
-- ADMIN ROLE MANAGEMENT
-- =====================================================

-- Admin Roles Table for granular permissions
CREATE TABLE IF NOT EXISTS public.admin_roles (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid REFERENCES public.user_profiles(id) ON DELETE CASCADE NOT NULL,
    role_type text NOT NULL CHECK (role_type IN ('user_management', 'product_management', 'order_management', 'payment_management', 'system_management', 'security_management')),
    granted_by uuid REFERENCES public.user_profiles(id) ON DELETE SET NULL,
    granted_at timestamptz DEFAULT now(),
    expires_at timestamptz,
    is_active boolean DEFAULT true
);

-- =====================================================
-- INDEXES FOR ADMIN ROLES
-- =====================================================

CREATE INDEX IF NOT EXISTS idx_admin_roles_user_id ON public.admin_roles(user_id);
CREATE INDEX IF NOT EXISTS idx_admin_roles_role_type ON public.admin_roles(role_type);
CREATE INDEX IF NOT EXISTS idx_admin_roles_granted_by ON public.admin_roles(granted_by);
CREATE INDEX IF NOT EXISTS idx_admin_roles_is_active ON public.admin_roles(is_active);
CREATE INDEX IF NOT EXISTS idx_admin_roles_expires_at ON public.admin_roles(expires_at);

-- =====================================================
-- ROW LEVEL SECURITY
-- =====================================================

ALTER TABLE public.admin_roles ENABLE ROW LEVEL SECURITY;

-- Only super admins can manage admin roles
DROP POLICY IF EXISTS "Super admins can manage admin roles" ON public.admin_roles;
CREATE POLICY "Super admins can manage admin roles"
    ON public.admin_roles FOR ALL
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.user_profiles up
            WHERE up.user_id = auth.uid() 
            AND up.role = 'super_admin'
        )
    );

-- Users can read their own admin roles
DROP POLICY IF EXISTS "Users can read own admin roles" ON public.admin_roles;
CREATE POLICY "Users can read own admin roles"
    ON public.admin_roles FOR SELECT
    TO authenticated
    USING (
        user_id IN (
            SELECT id FROM public.user_profiles 
            WHERE user_id = auth.uid()
        )
    );

-- =====================================================
-- ADMIN ROLE FUNCTIONS
-- =====================================================

-- Function to check if user has specific admin permission
CREATE OR REPLACE FUNCTION public.has_admin_permission(
    p_permission text,
    p_user_id uuid DEFAULT auth.uid()
)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
AS $$
    SELECT EXISTS (
        SELECT 1 
        FROM public.user_profiles up
        LEFT JOIN public.admin_roles ar ON up.id = ar.user_id
        WHERE up.user_id = p_user_id
        AND (
            up.role IN ('admin', 'super_admin') OR
            (ar.role_type = p_permission AND ar.is_active = true AND (ar.expires_at IS NULL OR ar.expires_at > now()))
        )
    );
$$;

-- Function to grant admin role
CREATE OR REPLACE FUNCTION public.grant_admin_role(
    p_user_id uuid,
    p_role_type text,
    p_expires_at timestamptz DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    role_id uuid;
    granter_id uuid;
BEGIN
    -- Check if current user is super admin
    IF NOT public.is_super_admin() THEN
        RAISE EXCEPTION 'Only super admins can grant admin roles';
    END IF;
    
    -- Get granter profile ID
    SELECT id INTO granter_id 
    FROM public.user_profiles 
    WHERE user_id = auth.uid();
    
    -- Insert or update admin role
    INSERT INTO public.admin_roles (
        user_id, role_type, granted_by, expires_at
    ) VALUES (
        p_user_id, p_role_type, granter_id, p_expires_at
    ) 
    ON CONFLICT (user_id, role_type) 
    DO UPDATE SET
        granted_by = granter_id,
        granted_at = now(),
        expires_at = p_expires_at,
        is_active = true
    RETURNING id INTO role_id;
    
    RETURN role_id;
END;
$$;

-- Function to revoke admin role
CREATE OR REPLACE FUNCTION public.revoke_admin_role(
    p_user_id uuid,
    p_role_type text
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- Check if current user is super admin
    IF NOT public.is_super_admin() THEN
        RAISE EXCEPTION 'Only super admins can revoke admin roles';
    END IF;
    
    UPDATE public.admin_roles
    SET is_active = false
    WHERE user_id = p_user_id AND role_type = p_role_type;
    
    RETURN FOUND;
END;
$$;

-- =====================================================
-- TRIGGERS FOR ADMIN ROLE AUTOMATION
-- =====================================================

-- Function to log admin role changes
CREATE OR REPLACE FUNCTION public.log_admin_role_change()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
    granter_email text;
    user_email text;
BEGIN
    -- Get emails for logging
    SELECT email INTO granter_email 
    FROM public.user_profiles 
    WHERE id = COALESCE(NEW.granted_by, OLD.granted_by);
    
    SELECT email INTO user_email 
    FROM public.user_profiles 
    WHERE id = COALESCE(NEW.user_id, OLD.user_id);
    
    -- Log the role change
    INSERT INTO public.activity_logs (
        user_id,
        user_email,
        logged_by,
        activity_type,
        resource_type,
        additional_details,
        risk_score,
        log_source
    ) VALUES (
        COALESCE(NEW.user_id, OLD.user_id),
        user_email,
        COALESCE(NEW.granted_by, OLD.granted_by),
        CASE 
            WHEN TG_OP = 'INSERT' THEN 'admin_role_granted'
            WHEN TG_OP = 'UPDATE' THEN 'admin_role_updated'
            WHEN TG_OP = 'DELETE' THEN 'admin_role_revoked'
        END,
        'admin_role',
        jsonb_build_object(
            'role_type', COALESCE(NEW.role_type, OLD.role_type),
            'granted_by_email', granter_email,
            'expires_at', COALESCE(NEW.expires_at, OLD.expires_at),
            'operation', TG_OP
        ),
        CASE WHEN TG_OP = 'DELETE' THEN 5 ELSE 3 END,
        'admin_action'
    );
    
    RETURN COALESCE(NEW, OLD);
END;
$$;

-- Trigger for admin role changes
DROP TRIGGER IF EXISTS log_admin_role_changes ON public.admin_roles;
CREATE TRIGGER log_admin_role_changes
    AFTER INSERT OR UPDATE OR DELETE ON public.admin_roles
    FOR EACH ROW
    EXECUTE FUNCTION public.log_admin_role_change();

-- =====================================================
-- CLEANUP FUNCTIONS
-- =====================================================

-- Function to cleanup expired admin roles
CREATE OR REPLACE FUNCTION public.cleanup_expired_admin_roles()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    expired_count integer;
BEGIN
    UPDATE public.admin_roles
    SET is_active = false
    WHERE expires_at < now() AND is_active = true;
    
    GET DIAGNOSTICS expired_count = ROW_COUNT;
    
    -- Log cleanup action
    INSERT INTO public.activity_logs (
        activity_type,
        resource_type,
        additional_details,
        log_source
    ) VALUES (
        'admin_roles_cleanup',
        'system',
        jsonb_build_object('expired_roles_count', expired_count),
        'system_maintenance'
    );
    
    RETURN expired_count;
END;
$$;

-- =====================================================
-- COMMENTS FOR DOCUMENTATION
-- =====================================================

COMMENT ON TABLE public.admin_roles IS 'Granular admin role assignments with expiration support';
COMMENT ON FUNCTION public.has_admin_permission IS 'Checks if user has specific admin permission';
COMMENT ON FUNCTION public.grant_admin_role IS 'Grants admin role to user (super admin only)';
COMMENT ON FUNCTION public.revoke_admin_role IS 'Revokes admin role from user (super admin only)';
COMMENT ON FUNCTION public.cleanup_expired_admin_roles IS 'Deactivates expired admin roles';