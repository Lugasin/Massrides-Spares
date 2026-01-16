# Enabling Local HTTPS for Vesicash Testing

Vesicash requires a public HTTPS URL to send webhooks. Since `localhost` is not public, you must use a tunneling service.

## 1. Choose a Tunneling Tool
We recommend **ngrok** (easiest) or **Cloudflare Tunnel** (free, persistent).

### Option A: ngrok (Quickest)
1.  **Install**: `npm install -g ngrok` (or download from ngrok.com).
2.  **Authenticate**: Run `ngrok config add-authtoken <YOUR_TOKEN>` (get token from dashboard.ngrok.com).
3.  **Run**:
    ```bash
    # Forward your local Supabase Edge Functions port (usually 54321)
    ngrok http 54321
    ```
4.  **Copy URL**: You will get a forwarding URL like `https://a1b2-c3d4.ngrok-free.app`.

### Option B: Cloudflare Tunnel (Persistent)
1.  Install `cloudflared`.
2.  Run `cloudflared tunnel --url http://localhost:54321`.

## 2. Update Environment Variables
You need to tell your local Edge Functions and Frontend about this public URL.

**File**: `.env.local` (Frontend)
```env
# Change this from http://localhost:54321 to your ngrok URL
VITE_SUPABASE_URL=https://a1b2-c3d4.ngrok-free.app
```

**File**: `.env` (Backend / Supabase)
Ensure your Edge Functions know their own public URL if they generate callback links.

## 3. Configure Vesicash Dashboard
1.  Log in to Vesicash Sandbox Dashboard.
2.  Go to **Developer Settings > Webhooks**.
3.  Update the **Webhook URL** to:
    `https://a1b2-c3d4.ngrok-free.app/functions/v1/handle-payment-webhook`
4.  Update the **Return/Callback URL** (if configured globally) to:
    `https://a1b2-c3d4.ngrok-free.app/checkout/success`

## 4. Test the Integration
1.  **Restart Frontend**: `npm run dev` (to pick up new env vars).
2.  **Restart Supabase**: `npx supabase stop && npx supabase start` (ensures functions are listening).
3.  **Run Tunnel**: `ngrok http 54321`.
4.  **Perform Checkout**:
    *   Go to your local app (e.g., `http://localhost:5173`).
    *   Proceed to checkout.
    *   Vesicash will redirect you to `https://a1b2-c3d4.ngrok-free.app/...` after payment.
    *   Vesicash will POST to `https://a1b2-c3d4.ngrok-free.app/functions/v1/handle-payment-webhook`.
    *   **Result**: Your local Edge Function logs will show the webhook event!

## Troubleshooting
*   **502 Bad Gateway**: Ensure local Supabase is actually running (`npx supabase status`).
*   **CORS Errors**: Ensure your Edge Functions have `cors.ts` configured (we already fixed this!).
*   **URL Changes**: Every time you restart `ngrok`, the URL changes. You must update Vesicash and `.env` each time unless you pay for a reserved domain.
