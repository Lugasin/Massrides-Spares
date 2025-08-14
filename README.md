# Massrides Agricultural Spare Parts PWA

## Transaction Junction Integration

This application includes Transaction Junction (TJ) Hosted Payment Page integration for secure payment processing.

### Environment Variables Setup

Before using the payment features, you need to configure the following environment variables in Supabase:

```bash
# Set these secrets in Supabase using: supabase secrets set KEY=value

# TODO: Replace these placeholders with your actual TJ credentials
TJ_CLIENT_ID="<replace_with_TJ_client_id>"
TJ_CLIENT_SECRET="<replace_with_TJ_client_secret>"
TJ_OAUTH_TOKEN_URL="<replace_with_TJ_oauth_token_url>"
TJ_API_BASE_URL="<replace_with_TJ_api_base_url>"
TJ_CREATE_SESSION_PATH="/hpp/sessions"
TJ_TRAN_LOOKUP_PATH="/transactions/lookup"
TJ_WEBHOOK_SECRET="<replace_with_webhook_secret_or_leave_empty>"
TJ_MERCHANT_REF_PREFIX="myplatform:order:"
SUPABASE_URL="<replace_with_supabase_url>"
SUPABASE_SERVICE_ROLE_KEY="<replace_with_service_role_key>"
```

### Database Setup

The following tables are automatically created by migrations:

1. **tj_transaction_logs** - Stores all TJ webhook payloads and transaction data
2. **activity_logs** - Tracks all user actions and system events
3. **guest_verifications** - Handles email verification for guest checkout
4. **user_settings** - Stores user preferences
5. **ads** - Vendor advertisements
6. **company_partners** - Partner company information

### Edge Functions

The following Edge Functions handle TJ integration:

1. **tj-create-session** - Creates TJ payment sessions
2. **tj-webhook** - Handles TJ webhook callbacks
3. **tj-lookup** - Fallback transaction lookup
4. **tj-manual-settlement** - Manual settlement controls for admins

### Payment Flow

1. **User/Guest Checkout**: Creates order and initiates TJ session
2. **TJ Redirect**: User completes payment on TJ hosted page
3. **Webhook Processing**: TJ sends webhook to update order status
4. **Order Fulfillment**: Order status updated based on payment result

### Admin Features

- **Payment Monitoring Dashboard**: Real-time payment tracking
- **Manual Settlement**: Settle or reverse authorized transactions
- **Transaction Logs**: Complete audit trail of all TJ interactions
- **Activity Logging**: Track all user and system actions

### Security Features

- **Webhook Signature Verification**: Validates TJ webhook authenticity
- **Idempotent Processing**: Prevents duplicate webhook processing
- **Role-Based Access**: Admin-only access to payment controls
- **Comprehensive Logging**: Full audit trail for compliance

### Usage

1. Configure TJ credentials in Supabase secrets
2. Deploy Edge Functions
3. Run database migrations
4. Test payment flow in sandbox environment
5. Switch to production TJ endpoints when ready

### Development

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Deploy Edge Functions (when ready)
supabase functions deploy
```

## Features

- **Spare Parts Catalog**: Browse agricultural spare parts with advanced filtering
- **Real-time Cart**: Synced cart for logged-in users, localStorage for guests
- **Guest Checkout**: Email verification for secure guest purchases
- **Payment Processing**: Transaction Junction integration with webhook handling
- **Admin Dashboard**: Payment monitoring and manual settlement controls
- **Activity Logging**: Comprehensive audit trail for all actions
- **Real-time Updates**: Live notifications and status updates

## Technologies Used

- **Frontend**: React, TypeScript, Tailwind CSS, Shadcn UI
- **Backend**: Supabase (Database, Auth, Edge Functions, Storage)
- **Payments**: Transaction Junction Hosted Payment Page
- **Real-time**: Supabase Realtime subscriptions
- **Build Tool**: Vite