# Database Alignment Strategy

## Current vs Required Schema Comparison

### ✅ Existing Tables (Properly Aligned)
1. **user_profiles** - User information and roles ✓
2. **categories** - Product categories ✓
3. **spare_parts** - Product catalog ✓
4. **orders** - Order management ✓
5. **order_items** - Order line items ✓
6. **notifications** - User notifications ✓
7. **messages** - User messaging ✓
8. **conversations** - Message threads ✓

### ⚠️ Tables Needing Alignment
1. **user_carts** - Missing proper RLS policies
2. **cart_items** - Missing cascade deletes
3. **guest_carts** - Missing cleanup procedures
4. **activity_logs** - Missing proper indexing
5. **tj_transaction_logs** - Missing foreign key constraints

### ❌ Missing Tables (Required for Full PWA)
1. **vendor_media** - For vendor image uploads
2. **product_reviews** - For customer reviews
3. **shipping_zones** - For shipping calculations
4. **tax_rates** - For tax calculations
5. **inventory_alerts** - For low stock notifications

## Frontend-Backend Mismatches

### Authentication Flow
- **Frontend expects**: Immediate profile data after login
- **Backend provides**: Async profile creation via trigger
- **Solution**: Add profile polling after auth state change

### Cart Management
- **Frontend expects**: Real-time cart sync
- **Backend provides**: Manual cart operations
- **Solution**: Add cart sync edge function with realtime updates

### Payment Processing
- **Frontend expects**: Immediate payment status updates
- **Backend provides**: Webhook-based status updates
- **Solution**: Add polling fallback for payment status

### Image Management
- **Frontend expects**: Multiple product images
- **Backend provides**: Single image URL field
- **Solution**: Convert to image array field with Supabase Storage

## Required Schema Modifications

### Phase 1: Core Infrastructure (Low Risk)
```sql
-- Add missing indexes
CREATE INDEX IF NOT EXISTS idx_orders_payment_intent ON orders(payment_intent_id);
CREATE INDEX IF NOT EXISTS idx_cart_items_cart_id ON cart_items(cart_id);
CREATE INDEX IF NOT EXISTS idx_guest_cart_items_guest_cart_id ON guest_cart_items(guest_cart_id);

-- Add missing foreign key constraints
ALTER TABLE order_items ADD CONSTRAINT fk_order_items_order 
  FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE;
ALTER TABLE cart_items ADD CONSTRAINT fk_cart_items_cart 
  FOREIGN KEY (cart_id) REFERENCES user_carts(id) ON DELETE CASCADE;
```

### Phase 2: Payment Integration (Medium Risk)
```sql
-- Add TJ-specific columns
ALTER TABLE orders ADD COLUMN IF NOT EXISTS tj jsonb;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS payment_method_id uuid 
  REFERENCES tj_payment_methods(id);

-- Add payment status constraints
ALTER TABLE orders ADD CONSTRAINT valid_payment_status 
  CHECK (payment_status IN ('pending', 'processing', 'paid', 'failed', 'refunded', 'authorised', 'settled'));
```

### Phase 3: Feature Completion (High Risk)
```sql
-- Convert single image to array
ALTER TABLE spare_parts ALTER COLUMN images TYPE text[] USING ARRAY[images];

-- Add vendor verification
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS vendor_verified_at timestamptz;
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS vendor_verified_by uuid 
  REFERENCES user_profiles(id);
```

## User-to-Database Alignment

### Role Mapping
- **guest** → No database record, localStorage only
- **customer** → user_profiles.role = 'customer'
- **vendor** → user_profiles.role = 'vendor' + vendor-specific tables
- **admin** → user_profiles.role = 'admin' + admin permissions
- **super_admin** → user_profiles.role = 'super_admin' + full access

### Permission Matrix
| Role | Orders | Products | Users | Payments | Security |
|------|--------|----------|-------|----------|----------|
| guest | Read own | Read all | None | None | None |
| customer | CRUD own | Read all | Read own | Read own | None |
| vendor | Read related | CRUD own | Read own | Read own | None |
| admin | CRUD all | CRUD all | CRUD all | Read all | Read all |
| super_admin | CRUD all | CRUD all | CRUD all | CRUD all | CRUD all |

## Migration Execution Plan

### Pre-Migration Checklist
- [ ] Backup production database
- [ ] Test migrations on staging environment
- [ ] Verify all Edge Functions are deployed
- [ ] Check Supabase secrets are configured
- [ ] Validate RLS policies don't break existing functionality

### Migration Order
1. **Core Infrastructure** (fix_core_infrastructure.sql)
2. **TJ Integration** (complete_tj_integration.sql)
3. **Missing Tables** (add_missing_tables.sql)
4. **Performance Optimization** (add_performance_indexes.sql)
5. **Feature Completion** (complete_feature_tables.sql)

### Rollback Procedures
Each migration includes rollback commands:
```sql
-- Example rollback for adding column
-- ALTER TABLE table_name DROP COLUMN IF EXISTS column_name;

-- Example rollback for adding constraint
-- ALTER TABLE table_name DROP CONSTRAINT IF EXISTS constraint_name;

-- Example rollback for creating table
-- DROP TABLE IF EXISTS table_name CASCADE;
```

### Post-Migration Validation
1. **Verify all tables exist**: Check information_schema.tables
2. **Validate RLS policies**: Test with different user roles
3. **Check indexes**: Verify query performance improvements
4. **Test realtime**: Confirm subscriptions work
5. **Validate Edge Functions**: Test all payment flows

## Risk Mitigation

### Data Integrity Protection
- All migrations use `IF NOT EXISTS` / `IF EXISTS`
- Foreign key constraints added with proper cascade rules
- Backup procedures documented for each step
- Rollback scripts prepared for each migration

### Zero-Downtime Deployment
- Migrations designed to run without locking tables
- New columns added with defaults
- Indexes created concurrently where possible
- RLS policies updated atomically

### Performance Considerations
- Indexes added for all frequently queried columns
- Partial indexes for filtered queries
- GIN indexes for full-text search
- Proper foreign key indexes for joins

## Testing Strategy

### Unit Testing
- Test each migration individually
- Verify data integrity after each step
- Check constraint violations
- Validate RLS policy behavior

### Integration Testing
- Test complete user flows after migrations
- Verify payment processing works end-to-end
- Check real-time updates function correctly
- Validate admin dashboards show correct data

### Performance Testing
- Measure query performance before/after indexes
- Test with realistic data volumes
- Monitor memory usage during migrations
- Check for query plan improvements

### Security Testing
- Verify RLS policies prevent unauthorized access
- Test role-based permissions
- Check audit logging captures all events
- Validate webhook signature verification