Agri Spare - Supabase Edge Functions

This folder contains Edge Function templates used by the guest→email→checkout flow.

Functions included:
- `create-tj-session` - reserves inventory, creates a payments row, calls TJ to create HPP session.
- `attach-order-to-user` - attaches an order to a user after email verification.
- `tj-webhook` - receives TJ webhooks, verifies signature, updates payments and orders.
- `reservation-cleanup` - scheduled cleanup to cancel expired orders and release inventory.

Deployment:
1. Install `supabase` CLI and login.
2. Deploy each function: `supabase functions deploy <function-name> --project-ref YOUR_PROJECT_REF`.

Required environment variables (set in Supabase project settings for Functions):
- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY` (server-only)
- `TJ_API_KEY`
- `TJ_WEBHOOK_SECRET`
- `APP_RETURN_URL`

Notes:
- Keep `SUPABASE_SERVICE_ROLE_KEY` secret and only in function envs.
- These are templates — confirm Transaction Junction API specifics and adjust accordingly.
