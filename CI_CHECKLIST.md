# ✅ CI Checklist — Cart Architecture & Checkout Stability

This checklist must pass 100% before merging or deploying.

## 🔒 1. Database & Migration Checks
### 1.1 Migration Integrity
- [ ] All new SQL files are versioned and ordered correctly
  - `20260119000001_cart_architecture_fix.sql`
- [ ] No destructive migrations (DROP TABLE / DROP COLUMN) without approval
- [ ] Migrations run cleanly on:
  - [ ] Local Supabase
  - [ ] Staging
  - [ ] Production (dry-run reviewed)

### 1.2 Trigger Verification
- [ ] `public.handle_new_user()` exists
- [ ] Trigger `on_auth_user_created` exists on `auth.users`
- [ ] Trigger runs with `SECURITY DEFINER`
- [ ] Inserting into `auth.users` auto-creates a row in `public.user_profiles`
  - ***Manual Test:*** `SELECT * FROM public.user_profiles WHERE user_id = '<auth_user_id>';`

### 1.3 Constraint & Index Checks
- [ ] `activity_logs.user_id` allows NULL
- [ ] Partial unique index exists:
  - `one_cart_per_user ON carts(user_id) WHERE user_id IS NOT NULL`
- [ ] No duplicate carts exist for authenticated users

## 🛡️ 2. RLS & Security Checks
### 2.1 Cart RLS Policies
- [ ] Authenticated Users can:
  - [ ] Read their own cart
  - [ ] Insert into their own cart
  - [ ] Update their own cart
- [ ] Guests can:
  - [ ] Insert cart items
  - [ ] Read guest cart (session-based)

### 2.2 Activity Logs RLS
- [ ] Guest activity logging does not fail
- [ ] Authenticated users can read only their own logs
- [ ] No policy references `public.users` without existence checks

## 🧠 3. Frontend Auth & Cart Logic
### 3.1 Auth Flow
- [ ] Login creates `public.user_profiles` row (via trigger)
- [ ] No frontend code manually inserts into `public.user_profiles` (or `users`)
- [ ] Logout clears session-only data safely

### 3.2 Cart Merge Logic
- [ ] Guest cart merges only once after login
- [ ] `cart_merge_done` guard is enforced
- [ ] No infinite merge loops on:
  - [ ] Page refresh
  - [ ] Route change
  - [ ] Token refresh

### 3.3 Cart Creation Safety
- [ ] App checks for existing cart before creating one
- [ ] No duplicate cart creation attempts
- [ ] Partial unique index errors are not thrown in console

## 🧪 4. Functional Tests (Required)
### 4.1 Guest Flow
- [ ] Guest adds item to cart
- [ ] Refresh page → item persists
- [ ] No console errors

### 4.2 Auth Merge Flow
- [ ] Guest adds item
- [ ] User logs in
- [ ] Items merge once into user cart
- [ ] Guest cart is cleared or marked merged

### 4.3 Logged-In Flow
- [ ] Logged-in user adds item
- [ ] Refresh → cart persists
- [ ] Cart ID remains constant

## 💳 5. Checkout & Payment Readiness
### 5.1 Checkout Preconditions
- [ ] Cart exists for authenticated user
- [ ] Address is optional (no blocking validation)
- [ ] Cart total matches line items

### 5.2 Payment (Vesicash)
- [ ] Payment session is created after cart validation
- [ ] HTTPS enforced for payment redirect
- [ ] Test environment works with HTTPS tunnel (if local)
- [ ] No payment attempt without cart ID

## 📡 6. Network & Error Monitoring
### 6.1 Network Health
- [ ] No repeated 403 / 406 requests
- [ ] No transaction rollback errors
- [ ] No FK constraint errors in logs

### 6.2 Observability
- [ ] Console logs are clean
- [ ] Supabase logs show:
  - [ ] No failed inserts to `activity_logs`
  - [ ] No failed cart inserts

## 🚀 7. Release Gate (FINAL)
Deployment is allowed ONLY IF:
- [ ] All above sections pass
- [ ] No open cart-related bugs
- [ ] Manual checkout test passes
- [ ] Rollback plan is documented

---

**Reviewed by:** ___________________
**Date:** ___________________
**Commit SHA:** ___________________

🟢 **Status:** READY FOR PRODUCTION only when all boxes are checked.
