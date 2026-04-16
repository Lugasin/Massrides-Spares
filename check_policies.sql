-- Check current RLS policies to verify fixes were applied
SELECT
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual,
    with_check
FROM pg_policies
WHERE schemaname = 'public'
AND tablename IN ('system_settings', 'inventory', 'activity_logs')
ORDER BY tablename, policyname;