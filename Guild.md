# Massrides PWA Architecture & Flow

## User Flows

### 1. Guest User Flow
1. Browse products.
2. Add to cart (localStorage).
3. Checkout as Guest (Phone/Email required).
4. Edge Function `create-order` called:
   - Validates stock.
   - Creates order with `status='PENDING'`.
5. Edge Function `create-payment-session` called:
   - Initiates Vesicash payment.
   - Creates payment record.
   - Returns payment link.
6. User completes payment.
7. Webhook `handle-vesicash-webhook` updates order to `PAID`.

### 2. Customer Signup & Claiming Orders
1. User signs up via Phone OTP.
2. PostgreSQL trigger `handle_new_user_linking` automatically matches `guest_email` or `guest_phone` with new user.
3. Updates `user_id` on existing orders.

## Core Tables

- `profiles`: User accounts and roles.
- `vendors`: Vendor platform data.
- `products`: Multi-vendor product catalog.
- `orders`: Order management.
- `payments`: Payment tracking.
- `webhook_events`: Audit trail for webhooks.
- `notifications`: In-app alerts.

## Edge Functions

- `create-order`: Secure order creation.
- `create-payment-session`: Vesicash integration.
- `handle-vesicash-webhook`: Payment processing.
- `send-email`: Resend email integration.
- `notify-users`: Real-time notification broadcast.

## Security

- RLS enforced on all tables.
- Service role only in Edge Functions.
- Webhook signature verification.
- Generic activity logging.
