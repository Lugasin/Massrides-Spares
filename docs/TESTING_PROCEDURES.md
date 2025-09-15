# Testing and Rollback Procedures

## Pre-Migration Testing

### 1. Database Backup
```bash
# Create full database backup
pg_dump -h your-host -U postgres -d your-database > backup_$(date +%Y%m%d_%H%M%S).sql

# Or using Supabase CLI
supabase db dump --file backup_$(date +%Y%m%d_%H%M%S).sql
```

### 2. Staging Environment Setup
```bash
# Create staging database from backup
psql -h staging-host -U postgres -d staging-database < backup.sql

# Run migrations on staging first
supabase migration up --environment staging
```

### 3. Migration Validation Script
```sql
-- Check if all required tables exist
SELECT 
  table_name,
  CASE 
    WHEN table_name IN (
      'user_profiles', 'spare_parts', 'orders', 'order_items',
      'user_carts', 'cart_items', 'guest_carts', 'guest_cart_items',
      'notifications', 'messages', 'conversations', 'quotes',
      'activity_logs', 'guest_verifications', 'user_settings',
      'tj_transaction_logs', 'tj_payment_methods', 'tj_security_logs',
      'system_metrics', 'ads', 'company_partners', 'audit_logs'
    ) THEN 'REQUIRED'
    ELSE 'OPTIONAL'
  END as status
FROM information_schema.tables 
WHERE table_schema = 'public'
ORDER BY status, table_name;

-- Check if all required functions exist
SELECT 
  routine_name,
  routine_type
FROM information_schema.routines 
WHERE routine_schema = 'public'
AND routine_name IN (
  'handle_new_user', 'has_role', 'log_security_event', 
  'record_metric', 'audit_trigger'
)
ORDER BY routine_name;

-- Check if all required indexes exist
SELECT 
  indexname,
  tablename
FROM pg_indexes 
WHERE schemaname = 'public'
AND indexname LIKE 'idx_%'
ORDER BY tablename, indexname;
```

## Migration Execution

### 1. Run Migrations in Order
```bash
# Run each migration individually with error checking
supabase migration up --file fix_core_infrastructure.sql
supabase migration up --file complete_tj_integration.sql
supabase migration up --file add_missing_tables.sql
```

### 2. Validate After Each Migration
```sql
-- Check for migration errors
SELECT * FROM supabase_migrations.schema_migrations 
ORDER BY version DESC LIMIT 5;

-- Verify table structure
\d+ table_name

-- Test RLS policies
SET ROLE authenticated;
SELECT * FROM user_profiles LIMIT 1;
```

## Rollback Procedures

### 1. Individual Migration Rollback
```sql
-- Rollback fix_core_infrastructure.sql
DROP TRIGGER IF EXISTS audit_orders ON public.orders;
DROP TRIGGER IF EXISTS audit_spare_parts ON public.spare_parts;
DROP TRIGGER IF EXISTS audit_user_profiles ON public.user_profiles;
DROP FUNCTION IF EXISTS public.audit_trigger();
DROP INDEX IF EXISTS idx_user_profiles_user_id;
DROP INDEX IF EXISTS idx_user_profiles_email;
-- Continue for all created objects...

-- Rollback complete_tj_integration.sql
DROP TABLE IF EXISTS public.tj_security_logs CASCADE;
DROP TABLE IF EXISTS public.tj_payment_methods CASCADE;
DROP TABLE IF EXISTS public.tj_transaction_logs CASCADE;
ALTER TABLE public.orders DROP COLUMN IF EXISTS tj;
DROP FUNCTION IF EXISTS public.log_security_event;
DROP FUNCTION IF EXISTS public.record_metric;

-- Rollback add_missing_tables.sql
DROP TABLE IF EXISTS public.audit_logs CASCADE;
DROP TABLE IF EXISTS public.company_partners CASCADE;
DROP TABLE IF EXISTS public.ads CASCADE;
DROP TABLE IF EXISTS public.system_metrics CASCADE;
```

### 2. Complete Database Restore
```bash
# If rollback is not sufficient, restore from backup
psql -h your-host -U postgres -d your-database < backup_file.sql
```

## Post-Migration Testing

### 1. Functional Testing Checklist
- [ ] User registration and login works
- [ ] Profile creation and updates work
- [ ] Product catalog loads correctly
- [ ] Cart operations function properly
- [ ] Order creation and payment processing works
- [ ] Admin dashboards display correct data
- [ ] Real-time updates function
- [ ] Payment monitoring shows transactions
- [ ] Activity logging captures events

### 2. Performance Testing
```sql
-- Test query performance with EXPLAIN ANALYZE
EXPLAIN ANALYZE SELECT * FROM spare_parts WHERE name ILIKE '%engine%';
EXPLAIN ANALYZE SELECT * FROM orders WHERE user_id = 'user-uuid';
EXPLAIN ANALYZE SELECT * FROM notifications WHERE user_id = 'user-uuid' AND read_at IS NULL;

-- Check index usage
SELECT 
  schemaname,
  tablename,
  indexname,
  idx_scan,
  idx_tup_read,
  idx_tup_fetch
FROM pg_stat_user_indexes 
WHERE schemaname = 'public'
ORDER BY idx_scan DESC;
```

### 3. Security Testing
```sql
-- Test RLS policies with different roles
SET ROLE authenticated;
SET request.jwt.claims = '{"sub": "user-uuid", "role": "authenticated"}';

-- Test customer access
SELECT * FROM orders; -- Should only see own orders
SELECT * FROM spare_parts; -- Should see all active parts
SELECT * FROM user_profiles; -- Should only see own profile

-- Test admin access
SET request.jwt.claims = '{"sub": "admin-uuid", "role": "authenticated"}';
SELECT * FROM orders; -- Should see all orders
SELECT * FROM activity_logs; -- Should see all logs
```

### 4. Real-time Testing
```javascript
// Test real-time subscriptions
const channel = supabase
  .channel('test-realtime')
  .on('postgres_changes', {
    event: '*',
    schema: 'public',
    table: 'orders'
  }, (payload) => {
    console.log('Real-time update:', payload);
  })
  .subscribe();

// Test by creating/updating records
```

## Error Recovery

### Common Issues and Solutions

#### 1. Migration Fails Midway
```bash
# Check migration status
supabase migration list

# Manually fix the issue and continue
supabase migration repair

# Or rollback and retry
supabase migration down
supabase migration up
```

#### 2. RLS Policy Blocks Access
```sql
-- Temporarily disable RLS for debugging
ALTER TABLE table_name DISABLE ROW LEVEL SECURITY;

-- Fix the policy
DROP POLICY "policy_name" ON table_name;
CREATE POLICY "fixed_policy_name" ON table_name ...;

-- Re-enable RLS
ALTER TABLE table_name ENABLE ROW LEVEL SECURITY;
```

#### 3. Performance Degradation
```sql
-- Check for missing indexes
SELECT 
  schemaname,
  tablename,
  attname,
  n_distinct,
  correlation
FROM pg_stats 
WHERE schemaname = 'public'
AND n_distinct > 100
ORDER BY n_distinct DESC;

-- Add missing indexes
CREATE INDEX CONCURRENTLY idx_table_column ON table_name(column_name);
```

#### 4. Edge Function Errors
```bash
# Check function logs
supabase functions logs function-name

# Redeploy function
supabase functions deploy function-name

# Test function locally
supabase functions serve
```

## Monitoring and Alerting

### 1. Database Health Checks
```sql
-- Monitor table sizes
SELECT 
  schemaname,
  tablename,
  pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) as size
FROM pg_tables 
WHERE schemaname = 'public'
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;

-- Monitor query performance
SELECT 
  query,
  calls,
  total_time,
  mean_time,
  rows
FROM pg_stat_statements 
ORDER BY total_time DESC 
LIMIT 10;
```

### 2. Application Health Checks
```javascript
// Frontend health check
const healthCheck = async () => {
  try {
    // Test database connection
    const { data, error } = await supabase.from('user_profiles').select('id').limit(1);
    if (error) throw error;
    
    // Test auth
    const { data: { session } } = await supabase.auth.getSession();
    
    // Test realtime
    const channel = supabase.channel('health-check');
    
    return { status: 'healthy', timestamp: new Date().toISOString() };
  } catch (error) {
    return { status: 'unhealthy', error: error.message };
  }
};
```

### 3. Automated Testing
```bash
# Run automated tests after migration
npm run test:integration
npm run test:e2e

# Check for broken links
npm run test:links

# Validate PWA functionality
npm run test:pwa
```

## Success Criteria

### ✅ Migration Success Indicators
1. All tables exist with correct schema
2. All functions execute without errors
3. RLS policies allow appropriate access
4. Indexes improve query performance
5. Real-time subscriptions work
6. Edge Functions respond correctly
7. Payment flow completes successfully
8. No data loss or corruption

### ⚠️ Warning Signs
1. Query performance degradation
2. RLS policy blocking legitimate access
3. Real-time updates not working
4. Edge Function timeouts
5. Payment webhook failures
6. Missing audit logs

### 🚨 Rollback Triggers
1. Data corruption detected
2. Critical functionality broken
3. Performance degradation > 50%
4. Security vulnerabilities introduced
5. Payment processing failures
6. User authentication broken

## Documentation Updates

After successful migration, update:
1. **API Documentation** - New endpoints and schemas
2. **User Guides** - New features and workflows
3. **Admin Manual** - Payment monitoring and controls
4. **Developer Docs** - Database schema and functions
5. **Security Policies** - Updated access controls