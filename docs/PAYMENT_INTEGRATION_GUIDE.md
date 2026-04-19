# Vesicash MoR Payment Integration Guide

This document outlines the implementation of the Vesicash Merchant of Record (MoR) payment system within the Massrides Agri PWA.

## Overview

The integration uses the **Vesicash MoR API** (`api.mor.vesicash.com`) for handling checkout and vendor payouts. This solution simplifies tax compliance and cross-border payments by acting as the legal merchant for transactions.

## Architecture

### 1. Checkout & Payment Initialization
**Function**: `supabase/functions/validate-checkout`
- **Endpoint**: `POST /v1/payment/init`
- **Headers**:
  - `V-PRIVATE-KEY`: secret key
  - `V-PUBLIC-KEY`: public key
- **Flow**:
  1. Frontend validates stock and user identity.
  2. Edge function calculates FX conversion (USD -> ZMW).
  3. Edge function creates a local `payments` record.
  4. Vesicash `payment/init` returns a hosted checkout URL.
  5. User is redirected to complete payment.

### 2. Webhooks & Reconciliation
**Function**: `supabase/functions/handle-vesicash-webhook`
- **Security**: Verifies `mor-signature` using HMAC-SHA256 with the `VESICASH_WEBHOOK_SECRET`.
- **Status Mapping**:
  | Vesicash Status | Internal Status |
  | :--- | :--- |
  | `success`, `paid` | `paid` |
  | `authorised` | `authorised` |
  | `failed`, `cancelled` | `failed` |
  | `settled` | `settled` |

### 3. Vendor Payouts
**Function**: `supabase/functions/process-vendor-payout`
- **Endpoint**: `POST /v1/payment/payouts/process` (Note: **Plural** `/payouts/`)
- **Headers**: `V-PRIVATE-KEY`, `V-PUBLIC-KEY`
- **Method**: Asynchronous disbursement via Mobile Money (country code dependent).

## Database Tables

| Table | Purpose |
| :--- | :--- |
| `orders` | Main order tracking, total amount, primary currency. |
| `payments` | Detailed transaction records, FX rates, provider references. |
| `payouts` | Grouped vendor disbursements. |
| `financial_audit_logs` | Traceable record of all API interactions and state changes. |

## Reuse Instructions

To reuse this module in another project:
1. Copy the `supabase/functions/_shared/vesicash.ts` configuration loader.
2. Ensure the Supabase Vault (`get_vesicash_config` RPC) contains the necessary keys.
3. Import the `handle-vesicash-webhook` and update the status callback logic for your business rules.
4. Use `RealTimeMetrics.tsx` for currency-agnostic revenue tracking.

## Troubleshooting

- **500 Errors on Checkout**: Usually due to missing keys in Supabase Vault or incorrect `apiBaseUrl`.
- **Signatures Mismatch**: Check that `VESICASH_WEBHOOK_SECRET` matches the value provided in the Vesicash Developer Dashboard.
- **Payouts Stuck**: Check `financial_audit_logs` for specific error payloads from the `/payouts/process` endpoint.
