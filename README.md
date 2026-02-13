# MassRides Agricultural Spare Parts PWA

A comprehensive Progressive Web Application for agricultural spare parts e-commerce with real-time features, vendor management, and Vesicash payment integration.

## 🚀 Features

### Core E-commerce
- **Product Catalog**: Browse agricultural spare parts with advanced filtering
- **Shopping Cart**: Real-time sync for users, localStorage for guests
- **Guest Checkout**: Payment-first flow (no account required to pay)
- **User Accounts**: Complete registration, login, and profile management
- **Order Management**: Full lifecycle tracking with real-time updates

### Payment Processing
- **Vesicash Integration**: Secure payment flow with mobile money support
- **Payment Monitoring**: Real-time transaction tracking for admins
- **Webhook Handling**: Idempotent webhook processing with audit trails
- **Unified Payment States**: `pending` → `initiated` → `processing` → `paid`/`failed`

### Admin & Vendor Tools
- **Admin Dashboard**: Comprehensive system control and monitoring
- **Vendor Management**: Complete inventory CRUD operations with dedicated tables
- **User Management**: Role-based access control and user administration
- **Security Dashboard**: Real-time threat detection and monitoring
- **Activity Logging**: Comprehensive audit trail for compliance

### Real-time Features
- **Live Notifications**: Real-time updates via Supabase Realtime
- **System Monitoring**: Live health checks and performance metrics
- **Order Updates**: Real-time status changes and notifications
- **Role-Based Broadcasts**: Notifications targeting user roles

### PWA Features
- **Offline Support**: Service worker with intelligent caching
- **Install Prompt**: Custom `beforeinstallprompt` handler with banner
- **Responsive Design**: Mobile-first, works on all devices

## 🛠 Technology Stack

### Frontend
- **React 18** with TypeScript
- **Tailwind CSS** for styling
- **Shadcn UI** component library
- **React Router** for navigation
- **TanStack Query** for data fetching
- **Sonner** for toast notifications

### Backend
- **Supabase** (PostgreSQL, Auth, Realtime, Storage, Edge Functions)
- **Vesicash** for payment processing (mobile money + cards)
- **Row Level Security** for data protection
- **37 Edge Functions** for server-side logic

## 📋 Database Schema

### Core Tables
| Table | Purpose |
|-------|---------|
| `profiles` | User information and roles |
| `products` | Product catalog with specifications |
| `orders` | Order management with payment tracking |
| `order_items` | Order line items |
| `categories` | Product categorization |

### Cart Management
| Table | Purpose |
|-------|---------|
| `cart_items` | Authenticated user carts |
| `guest_cart_items` | Guest shopping carts |

### Vendor Tables (NEW)
| Table | Purpose |
|-------|---------|
| `vendors` | Vendor profiles with owner relationship |
| `vendor_users` | Vendor team members (junction) |
| `vendor_orders` | Per-vendor order tracking |
| `inventory_logs` | Stock change audit trail |

### Payment & Email
| Table | Purpose |
|-------|---------|
| `payments` | Payment records (provider-agnostic) |
| `email_logs` | Email sending history |
| `notifications` | User + role-based notifications |
| `activity_logs` | Comprehensive audit trail |

## 🔧 Setup Instructions

### 1. Clone and Install
```bash
git clone <repository-url>
cd massrides-agri-pwa-44
npm install
```

### 2. Environment Configuration
Create `.env`:
```env
VITE_SUPABASE_URL=your_supabase_project_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

### 3. Configure Vesicash
Set up credentials in Supabase secrets:
```bash
supabase secrets set VESICASH_SECRET_KEY="your_secret_key"
supabase secrets set VESICASH_PUBLIC_KEY="your_public_key"
supabase secrets set VESICASH_WEBHOOK_SECRET="your_webhook_secret"
```

### 4. Optional: Email Provider
```bash
supabase secrets set RESEND_API_KEY="your_resend_key"
supabase secrets set FROM_EMAIL="noreply@massrides.co.zm"
```

### 5. Deploy Edge Functions
```bash
supabase functions deploy
```

### 6. Apply Migrations
```bash
supabase db push
```

### 7. Start Development
```bash
npm run dev
```

## 👥 User Roles & Permissions

| Role | Permissions |
|------|-------------|
| **Guest** | Browse, cart, checkout (no account needed) |
| **Customer** | Full shopping, order tracking, profile |
| **Vendor** | Product CRUD, inventory, order fulfillment |
| **Admin** | User management, payment monitoring |
| **Super Admin** | Full system control, security monitoring |

## 🔐 Security Features

### Authentication
- Email/password authentication
- Phone OTP (SMS) primary
- OAuth providers (Google)
- Email OTP fallback

### Authorization
- Row Level Security (RLS) on all tables
- Role-based access control
- API endpoint protection

## 📊 Edge Functions

### Payment Flow
| Function | Purpose |
|----------|---------|
| `create-order` | Create orders (guest + auth) |
| `create-payment-session` | Initialize Vesicash payment |
| `handle-vesicash-webhook` | Process payment webhooks |
| `attach-order-to-user` | Link guest orders to new accounts |

### Communication
| Function | Purpose |
|----------|---------|
| `send-email` | Provider-agnostic email sending |
| `real-time-notifications` | Push notifications |

### Vendor Management
| Function | Purpose |
|----------|---------|
| `get-vendor-dashboard-data` | Vendor analytics |
| `get-vendor-inventory` | Inventory management |
| `process-vendor-payout` | Vendor payouts |

## 🚀 Deployment

### Production Build
```bash
npm run build
```

### Deploy
The application can be deployed to:
- Netlify
- Vercel
- AWS S3 + CloudFront

## 📱 PWA Installation

Users see a custom install banner after 3 seconds:
1. Visit the website
2. See "Install MassRides" banner
3. Click "Install" to add to home screen

## Architecture

```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   React PWA     │    │   Supabase       │    │   Vesicash      │
│                 │    │                  │    │                 │
│ • 48 Pages      │◄──►│ • PostgreSQL     │    │ • Mobile Money  │
│ • 41+ Components│    │ • Auth           │    │ • Cards         │
│ • Contexts      │    │ • Realtime       │◄──►│ • Webhooks      │
│ • Service Worker│    │ • 37 Edge Funcs  │    │                 │
└─────────────────┘    └──────────────────┘    └─────────────────┘
```

---

## Quick Start

```bash
# Development
npm run dev

# Build
npm run build

# Deploy functions
supabase functions deploy

# Apply migrations
supabase db push
```

---

© 2024-2026 MassRides Company Limited. All rights reserved.