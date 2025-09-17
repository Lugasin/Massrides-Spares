# Migration Execution Guide

## Overview
This guide provides step-by-step instructions for executing the idempotent SQL migrations safely in production.

## Prerequisites

### 1. Database Backup
```bash
# Create full database backup before migration
pg_dump -h your-host -U postgres -d your-database > backup_$(date +%Y%m%d_%H%M%S).sql

# Or using Supabase CLI
supabase db dump --file backup_$(date +%Y%m%d_%H%M%S).sql
```

### 2. Test Environment Setup
```bash
# Create staging database from backup
psql -h staging-host -U postgres -d staging-database < backup.sql

# Test migrations on staging first
supabase migration up --environment staging
```

## Migration Execution Order

### Phase 1: Core Infrastructure (REQUIRED)
```bash
# Execute in this exact order:
supabase migration up --file 001_create_core_tables.sql
supabase migration up --file 002_create_order_system.sql
supabase migration up --file 003_create_communication_system.sql
```

### Phase 2: Payment and Audit Systems
```bash
supabase migration up --file 004_create_payment_system.sql
supabase migration up --file 005_create_audit_system.sql
```

### Phase 3: Advanced Features
```bash
supabase migration up --file 006_migrate_product_data.sql
supabase migration up --file 007_enable_realtime.sql
supabase migration up --file 008_create_admin_roles.sql
```

## Validation After Each Migration

### 1. Check Migration Status
```sql
-- Verify migration was applied
SELECT * FROM supabase_migrations.schema_migrations 
ORDER BY version DESC LIMIT 5;
```

### 2. Validate Table Structure
```sql
-- Check if all tables exist
SELECT table_name, table_type 
FROM information_schema.tables 
WHERE table_schema = 'public'
ORDER BY table_name;

-- Check if all functions exist
SELECT routine_name, routine_type
FROM information_schema.routines 
WHERE routine_schema = 'public'
ORDER BY routine_name;
```

### 3. Test RLS Policies
```sql
-- Test as authenticated user
SET ROLE authenticated;
SELECT * FROM user_profiles LIMIT 1;

-- Test as anonymous user
SET ROLE anon;
SELECT * FROM categories LIMIT 1;

-- Reset role
RESET ROLE;
```

### 4. Verify Indexes
```sql
-- Check if all indexes were created
SELECT indexname, tablename
FROM pg_indexes 
WHERE schemaname = 'public'
AND indexname LIKE 'idx_%'
ORDER BY tablename, indexname;
```

## Error Handling

### Common Issues and Solutions

#### 1. Migration Fails Due to Existing Objects
```sql
-- Check what already exists
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public' AND table_name = 'your_table_name';

-- Drop and recreate if necessary (CAUTION: Data loss)
DROP TABLE IF EXISTS your_table_name CASCADE;
```

#### 2. RLS Policy Conflicts
```sql
-- List existing policies
SELECT schemaname, tablename, policyname, cmd, qual
FROM pg_policies 
WHERE schemaname = 'public'
ORDER BY tablename, policyname;

-- Drop conflicting policy
DROP POLICY IF EXISTS "policy_name" ON table_name;
```

#### 3. Function Already Exists
```sql
-- Check existing functions
SELECT routine_name, routine_type
FROM information_schema.routines 
WHERE routine_schema = 'public'
AND routine_name = 'your_function_name';

-- Drop and recreate
DROP FUNCTION IF EXISTS your_function_name CASCADE;
```

## Performance Validation

### 1. Query Performance Testing
```sql
-- Test key queries with EXPLAIN ANALYZE
EXPLAIN ANALYZE SELECT * FROM spare_parts WHERE name ILIKE '%engine%';
EXPLAIN ANALYZE SELECT * FROM orders WHERE user_id = 'user-uuid';
EXPLAIN ANALYZE SELECT * FROM notifications WHERE user_id = 'user-uuid' AND read_at IS NULL;
```

### 2. Index Usage Verification
```sql
-- Check index usage statistics
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

## Rollback Procedures

### Emergency Rollback
If critical issues occur, use the rollback procedures in `rollback_procedures.sql`:

```bash
# Rollback specific migration
psql -f rollback_procedures.sql -v migration_number=008

# Complete database restore (EMERGENCY ONLY)
psql -h your-host -U postgres -d your-database < backup_file.sql
```

### Selective Rollback
```sql
-- Rollback specific table (example)
DROP TABLE IF EXISTS public.admin_roles CASCADE;

-- Rollback specific function (example)
DROP FUNCTION IF EXISTS public.has_admin_permission CASCADE;
```

## Post-Migration Tasks

### 1. Update Application Configuration
```bash
# Update environment variables if needed
supabase secrets set NEW_FEATURE_ENABLED=true
```

### 2. Deploy Edge Functions
```bash
# Deploy updated edge functions
supabase functions deploy
```

### 3. Test Application Functionality
- [ ] User registration and login
- [ ] Product catalog browsing
- [ ] Cart operations
- [ ] Order placement
- [ ] Payment processing
- [ ] Admin dashboard access
- [ ] Real-time notifications

### 4. Monitor System Health
```sql
-- Check for any errors in logs
SELECT * FROM activity_logs 
WHERE activity_type LIKE '%error%' 
AND created_at > now() - interval '1 hour';

-- Monitor system performance
SELECT * FROM system_metrics 
WHERE recorded_at > now() - interval '1 hour'
ORDER BY recorded_at DESC;
```

## Success Criteria

### ✅ Migration Success Indicators
- [ ] All tables created without errors
- [ ] All indexes created successfully
- [ ] All functions execute without errors
- [ ] RLS policies allow appropriate access
- [ ] Triggers fire correctly
- [ ] Sample data inserted successfully
- [ ] Application connects to database
- [ ] All user flows work end-to-end

### ⚠️ Warning Signs
- Query performance degradation
- RLS policies blocking legitimate access
- Missing foreign key relationships
- Trigger errors in logs
- Real-time subscription failures

### 🚨 Rollback Triggers
- Data corruption detected
- Critical application functionality broken
- Performance degradation > 50%
- Security vulnerabilities introduced
- User authentication failures

## Support and Troubleshooting

### Database Connection Issues
```sql
-- Check active connections
SELECT count(*) FROM pg_stat_activity;

-- Check for blocking queries
SELECT * FROM pg_stat_activity WHERE state = 'active';
```

### Performance Issues
```sql
-- Check slow queries
SELECT query, mean_time, calls, total_time
FROM pg_stat_statements 
ORDER BY total_time DESC 
LIMIT 10;
```

### RLS Issues
```sql
-- Test RLS policies
SET ROLE authenticated;
SET request.jwt.claims = '{"sub": "user-uuid", "role": "authenticated"}';
SELECT * FROM your_table LIMIT 1;
```

For additional support, contact the database administration team with:
- Migration file name and version
- Error messages (full text)
- Database logs from time of execution
- Current database state (table/function listings)