-- Temporary Audit Migration
-- This script creates a table to store system audit results and populates it.

-- 1. Create audit_log table
CREATE TABLE IF NOT EXISTS audit_log (
  check_name text PRIMARY KEY,
  status text,
  details jsonb,
  checked_at timestamptz DEFAULT now()
);

-- Grant access to anon so we can read results via REST
GRANT SELECT ON audit_log TO anon;

-- 2. Populate Audit Data
DO $$
DECLARE
    v_vsh_count int;
    v_paid_count int;
    v_pending_count int;
    v_cancelled_count int;
    v_admin_role text;
    v_has_email_col boolean;
    v_has_notifications boolean;
BEGIN
    -- A. Reconciled Orders Check
    SELECT count(*) INTO v_vsh_count FROM orders WHERE order_number LIKE 'VSH-%';
    SELECT count(*) INTO v_paid_count FROM orders WHERE order_number LIKE 'VSH-%' AND status = 'paid';
    SELECT count(*) INTO v_pending_count FROM orders WHERE order_number LIKE 'VSH-%' AND status = 'pending';
    SELECT count(*) INTO v_cancelled_count FROM orders WHERE order_number LIKE 'VSH-%' AND status = 'cancelled';
    
    INSERT INTO audit_log (check_name, status, details)
    VALUES ('reconciliation_data', 'complete', jsonb_build_object(
        'total_vsh_orders', v_vsh_count,
        'paid', v_paid_count,
        'pending', v_pending_count,
        'cancelled', v_cancelled_count
    ))
    ON CONFLICT (check_name) DO UPDATE SET status = EXCLUDED.status, details = EXCLUDED.details, checked_at = now();

    -- B. Schema Check
    SELECT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'orders' AND column_name = 'customer_email'
    ) INTO v_has_email_col;
    
    SELECT EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_name = 'notifications' AND table_schema = 'public'
    ) INTO v_has_notifications;

    INSERT INTO audit_log (check_name, status, details)
    VALUES ('schema_verification', 
            CASE WHEN v_has_email_col AND v_has_notifications THEN 'pass' ELSE 'fail' END,
            jsonb_build_object(
                'customer_email_exists', v_has_email_col,
                'notifications_table_exists', v_has_notifications
            ))
    ON CONFLICT (check_name) DO UPDATE SET status = EXCLUDED.status, details = EXCLUDED.details, checked_at = now();

    -- C. Admin Check
    SELECT role INTO v_admin_role FROM profiles WHERE email = 'mambwemwila1@gmail.com';
    
    INSERT INTO audit_log (check_name, status, details)
    VALUES ('admin_role_check', 
            CASE WHEN v_admin_role = 'super_admin' THEN 'pass' ELSE 'fail' END,
            jsonb_build_object(
                'email', 'mambwemwila1@gmail.com',
                'current_role', COALESCE(v_admin_role, 'not found')
            ))
    ON CONFLICT (check_name) DO UPDATE SET status = EXCLUDED.status, details = EXCLUDED.details, checked_at = now();

END $$;
