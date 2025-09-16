# Deployment Guide - Massrides PWA E-commerce Platform

## Pre-Deployment Checklist

### 1. Environment Setup
```bash
# Install Supabase CLI
npm install -g supabase

# Login to Supabase
supabase login

# Link to your project
supabase link --project-ref YOUR_PROJECT_REF
```

### 2. Database Migration
```bash
# Run all migrations in order
supabase db push

# Or run individually
supabase migration up --file fix_core_infrastructure.sql
supabase migration up --file complete_tj_integration.sql
supabase migration up --file add_missing_tables.sql
supabase migration up --file migrate_product_data.sql
```

### 3. Configure Secrets
```bash
# Set Transaction Junction credentials
supabase secrets set TJ_CLIENT_ID="your_tj_client_id"
supabase secrets set TJ_CLIENT_SECRET="your_tj_client_secret"
supabase secrets set TJ_OAUTH_TOKEN_URL="https://api.transactionjunction.com/oauth/token"
supabase secrets set TJ_API_BASE_URL="https://api.transactionjunction.com"
supabase secrets set TJ_WEBHOOK_SECRET="your_webhook_secret"

# Set other required secrets
supabase secrets set RESEND_API_KEY="your_resend_api_key"
```

### 4. Deploy Edge Functions
```bash
# Deploy all functions
supabase functions deploy

# Or deploy individually
supabase functions deploy tj-create-session
supabase functions deploy tj-webhook
supabase functions deploy tj-lookup
supabase functions deploy tj-manual-settlement
supabase functions deploy guest-verification
supabase functions deploy real-time-notifications
```

### 5. Enable Realtime
```bash
# Enable realtime for all tables
supabase realtime enable
```

## Production Configuration

### 1. Environment Variables
Create `.env.production`:
```env
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
VITE_APP_URL=https://your-domain.com
VITE_TJ_ENVIRONMENT=production
```

### 2. Build Configuration
```bash
# Build for production
npm run build

# Test production build locally
npm run preview
```

### 3. PWA Configuration
Ensure these files are properly configured:
- `public/manifest.json` - PWA manifest
- `public/sw.js` - Service worker
- PWA icons in multiple sizes

### 4. Security Configuration
- Enable RLS on all tables
- Configure proper CORS settings
- Set up webhook signature verification
- Enable audit logging

## Testing Procedures

### 1. Database Testing
```sql
-- Test user creation
SELECT * FROM user_profiles LIMIT 5;

-- Test product data
SELECT COUNT(*) FROM spare_parts;

-- Test relationships
SELECT o.order_number, oi.quantity, sp.name 
FROM orders o
JOIN order_items oi ON o.id = oi.order_id
JOIN spare_parts sp ON oi.spare_part_id = sp.id
LIMIT 5;
```

### 2. Function Testing
```bash
# Test each function
curl -X POST "https://your-project.supabase.co/functions/v1/tj-create-session" \
  -H "Authorization: Bearer YOUR_ANON_KEY" \
  -H "Content-Type: application/json" \
  -d '{"test": true}'
```

### 3. Real-time Testing
- Test notifications in browser
- Verify cart sync between devices
- Check order status updates

### 4. Payment Flow Testing
1. Create test order
2. Verify TJ session creation
3. Test webhook handling
4. Confirm order status updates
5. Test manual settlement

## Monitoring & Maintenance

### 1. Health Checks
- Database connectivity
- Edge function response times
- Real-time connection status
- Payment gateway availability

### 2. Performance Monitoring
- Query performance
- Function execution times
- Cache hit rates
- User experience metrics

### 3. Security Monitoring
- Failed login attempts
- Suspicious activity patterns
- Payment fraud detection
- Data access auditing

### 4. Backup Procedures
```bash
# Database backup
supabase db dump --file backup_$(date +%Y%m%d).sql

# Storage backup
supabase storage download --recursive
```

## Troubleshooting

### Common Issues

1. **Migration Failures**
   - Check for existing constraints
   - Verify foreign key relationships
   - Run migrations individually

2. **Function Deployment Issues**
   - Check function logs: `supabase functions logs function-name`
   - Verify environment variables
   - Test locally first

3. **Real-time Connection Issues**
   - Check network connectivity
   - Verify RLS policies
   - Monitor connection status

4. **Payment Integration Issues**
   - Verify TJ credentials
   - Check webhook URL accessibility
   - Monitor transaction logs

### Performance Optimization

1. **Database Optimization**
   - Monitor slow queries
   - Add indexes for frequent queries
   - Optimize RLS policies

2. **Frontend Optimization**
   - Enable code splitting
   - Optimize images
   - Implement lazy loading

3. **Caching Strategy**
   - Configure CDN
   - Implement service worker caching
   - Use Supabase edge caching

## Support & Maintenance

### Regular Tasks
- [ ] Monitor system health daily
- [ ] Review security logs weekly
- [ ] Update dependencies monthly
- [ ] Backup database weekly
- [ ] Review performance metrics monthly

### Emergency Procedures
1. **System Down**
   - Check Supabase status
   - Verify DNS settings
   - Check edge function logs

2. **Payment Issues**
   - Check TJ status
   - Verify webhook connectivity
   - Review transaction logs

3. **Data Issues**
   - Restore from backup
   - Check audit logs
   - Verify data integrity

## Success Metrics

### Technical KPIs
- Uptime: >99.9%
- Page load time: <3 seconds
- Database query time: <500ms
- Function execution time: <5 seconds

### Business KPIs
- User registration rate
- Order completion rate
- Payment success rate
- Customer satisfaction score

### Security KPIs
- Zero data breaches
- <1% failed login rate
- 100% audit coverage
- <24h incident response time