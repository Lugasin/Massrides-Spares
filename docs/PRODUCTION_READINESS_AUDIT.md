# Production Readiness Audit (Massrides-Spares)

Date: 2026-02-19  
Scope: authentication, role model, CRUD/RLS posture, inventory, cart/checkout, Vesicash/payment lifecycle, refunds/reversals/blocking controls, financial dashboards, and super-admin monitoring.

## Executive Summary

The codebase contains strong building blocks (Supabase RLS migrations, payment/security monitoring pages, activity logging utilities, and webhook handlers), but **is not production-ready yet** because critical controls are inconsistent across paths.

Top blockers before production:
1. **Webhook trust and payment state integrity are inconsistent** across duplicate webhook handlers and mixed status fields (`status` vs `payment_status`).
2. **Role enforcement is split between UI checks and backend logic**, with at least one UI path updating roles directly instead of using guarded server function.
3. **Checkout/order flow has schema drift and error semantics problems** (legacy table names in one function, HTTP 200 returned on failure in another).
4. **Operational monitoring exists but control-plane functions it calls appear missing** (e.g. manual settlement / lookup endpoints).

## What Was Audited

- Frontend auth/role/monitoring flows in `src/context`, `src/pages`, and `src/lib`.
- Supabase Edge Functions for checkout, payment session creation, webhooks, role updates, and security monitoring.
- SQL migrations for schema, inventory reservation lifecycle, and RLS policy coverage.

## Domain Findings

### 1) Authentication & Session Handling

**What is good**
- Auth context initializes from Supabase session and subscribes to auth-state updates.
- Explicit cleanup on sign-out/token refresh failure helps prevent stale auth state.

**Gaps / risks**
- `userPermissions` is exposed in auth context but not loaded/populated, so permission checks are effectively role-only.
- Auth context upserts profile rows during auth change; role overwrite was intentionally avoided (good), but this still means profile writes occur on auth events and should be constrained via DB policy.

**Risk level:** Medium (can become High when combined with weak backend authorization).

### 2) Roles & Authorization Model

**What is good**
- Dedicated `update-user-role` edge function validates caller auth and restricts role assignment (`admin` cannot grant `super_admin`).
- Security monitoring function enforces `super_admin` role server-side before returning sensitive telemetry.

**Gaps / risks**
- `UserManagement` page writes directly to `user_profiles` table for role changes instead of invoking `update-user-role`; this bypasses centralized business checks and relies entirely on RLS correctness.
- Role checks are often implemented in UI (`if userRole !== ...`) which is not a security boundary.

**Risk level:** High.

### 3) CRUD / Data Access / RLS

**What is good**
- RLS migration enables policies on core tables (`profiles`, `vendors`, `products`, `orders`, `payments`, `notifications`).
- Audit trigger function records data changes for high-value tables.

**Gaps / risks**
- RLS migration appears to represent an older schema (`profiles/vendors`) while runtime code heavily uses `user_profiles`; this indicates likely policy drift between active schema and app paths.
- Multiple functions use service-role clients for convenience. This is normal for backend tasks, but each call path must have explicit caller authorization checks.

**Risk level:** High.

### 4) Inventory Management

**What is good**
- SQL functions exist for reserve/release/commit inventory and perform stock checks and reservation arithmetic.
- Reservation cleanup function references release RPC for expired orders.

**Gaps / risks**
- Reservation/commit flow is present in SQL and some webhook paths, but checkout/order code paths are inconsistent across legacy/new functions; race-safe guarantees are only as strong as adoption consistency.
- No clear end-to-end idempotency contract documented for repeated webhook deliveries and repeated checkout submissions.

**Risk level:** Medium-High.

### 5) Cart Flow & Checkout

**What is good**
- Guest and authenticated cart flows are both implemented with merge logic.
- `validate-checkout` validates JWT and calls a DB RPC to create order from cart.

**Gaps / risks**
- `create-order` function references legacy `carts` schema while other parts use `user_carts`/`guest_carts`, indicating dual-path schema mismatch risk.
- `create-order` returns HTTP `200` on failure (with `success: false`), which complicates observability/retries and can mask production errors in clients and API gateways.
- `validate-checkout` includes verbose token/header diagnostics logs that should be reduced in production to avoid sensitive metadata leakage.

**Risk level:** High.

### 6) Vesicash Integration

**What is good**
- Vesicash payment initialization implemented with environment-based keys.
- One webhook handler (`handle-vesicash-webhook`) verifies HMAC signature.

**Gaps / risks**
- There are **two** Vesicash webhook handlers with different security levels and status update logic; one explicitly does not verify signature and trusts payload.
- Payment creation/update fields are inconsistent (`payment_status`, `status`, and provider-specific columns), increasing risk of split-brain payment state.
- Hard-coded webhook URL in checkout function should be environment-driven to avoid deployment drift.

**Risk level:** Critical.

### 7) Payment States, Refunds, Reversals, Blocking

**What is good**
- Payment monitoring UI tracks status classes and offers settlement/reversal interactions.
- Activity/security logging utility supports risk scoring and blocked-event semantics.

**Gaps / risks**
- Monitoring page invokes `tj-manual-settlement` and `tj-lookup`, but corresponding functions are not present in this repository tree.
- Refund/reversal lifecycle is not consistently represented across schema/functions (e.g., no clear canonical payment state machine with allowed transitions and idempotent reversal/refund handlers).
- Transaction blocking appears modeled in logs (`blocked` flags in security logs) but needs enforceable execution hooks at payment decision points.

**Risk level:** High.

### 8) Financial Dashboards & Super Admin Auditing

**What is good**
- `security-monitoring` function aggregates security, payment, and system metrics for super-admin usage.
- Payment monitoring and admin dashboards provide operational visibility.

**Gaps / risks**
- Some system-health metrics are placeholders (e.g., uptime set to constant), reducing trust for incident response.
- No explicit tamper-evident audit trail controls documented (e.g., immutable append-only ledger strategy for financial events).
- Super-admin observability is present, but governance controls (dual-approval on reversals/refunds, reason codes, audit signatures) are not enforced end-to-end.

**Risk level:** Medium-High.

## Prioritized Production Hardening Plan

### P0 (Must complete before production)
1. **Unify payment webhook path**
   - Keep one handler only.
   - Enforce signature verification, replay protection, and idempotency keys.
   - Standardize status mapping into one canonical state machine.
2. **Canonical payment schema contract**
   - Choose one source of truth (`payments.status` + strict enum).
   - Migrate all code paths to use same fields and transition rules.
3. **Role update hardening**
   - Remove direct table role updates from UI.
   - Route all role mutations through guarded edge function with immutable audit entry.
4. **Checkout error semantics**
   - Return proper non-2xx status on failures.
   - Remove verbose JWT diagnostics from production logs.
5. **Schema/RLS alignment review**
   - Reconcile `profiles` vs `user_profiles`, `carts` vs `user_carts/guest_carts`.
   - Generate and validate a single authoritative migration set.

### P1 (Immediately after P0)
1. **Refund/reversal control framework**
   - Add explicit workflow states (`refund_requested`, `refund_approved`, `refund_settled`, `reversal_blocked`, etc.).
   - Require maker-checker approvals for high-value reversals.
2. **Transaction blocking enforcement**
   - Convert high-risk findings into real-time policy decisions before provider call.
3. **Monitoring completeness**
   - Implement missing operational functions referenced by dashboards or remove dead actions.

### P2 (Stability and governance)
1. **Financial audit quality**
   - Introduce immutable financial event table (append-only with hash chain optional).
   - Reconcile orders/payments/payouts daily with exception dashboard.
2. **Runbooks and SLOs**
   - Incident runbooks for webhook outage, stuck `pending` payments, inventory drift.
   - SLOs for payment success, webhook processing latency, and reconciliation age.

## Suggested Control Checklist for “Go Live”

- [ ] Single webhook handler deployed and signed verification tested.
- [ ] Payment state transition tests (including duplicate webhook and retry storms).
- [ ] RLS policy tests for each role (customer/vendor/admin/super_admin/anonymous).
- [ ] End-to-end checkout tests (guest + authenticated) with inventory contention.
- [ ] Refund/reversal dual-approval and audit logging tests.
- [ ] Security dashboard metrics sourced from real telemetry, no placeholders.

## Bottom Line

You have strong foundational components, but production readiness currently depends on resolving consistency and control-plane integrity gaps first (especially payment/webhook/state-machine alignment and role mutation hardening). Complete P0 before any real-money launch.
