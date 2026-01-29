# Massrides Agricultural Spare Parts PWA

A comprehensive Progressive Web Application for agricultural spare parts e-commerce with real-time features, multi-vendor support, and Vesicash payment integration.

## 🚀 Features

### Core E-commerce
- **Product Catalog**: Browse agricultural products with advanced filtering
- **Shopping Cart**: Real-time sync for users, localStorage for guests
- **Guest Checkout**: "Payment First, Account Later" architecture allowing guests to purchase without immediate registration
- **User Accounts**: Phone OTP (SMS) as primary auth, with automatic linking of previous guest orders
- **Order Management**: Full lifecycle tracking (PENDING, PAID, SHIPPED, etc.)

### Payment Processing
- **Vesicash Integration**: Secure payment link generation via Vesicash
- **Payment Monitoring**: Timeline-based tracking of payment status and transitions
- **Webhook Handling**: Robust webhook processing for status updates with detailed logging
- **Multi-Vendor Payments**: Automatic association of payments with specific vendors

### Admin & Vendor Tools
- **Admin Dashboard**: Comprehensive system control and monitoring
- **Vendor Management**: Complete inventory CRUD operations
- **User Management**: Role-based access control and user administration
- **Security Dashboard**: Real-time threat detection and monitoring
- **Activity Logging**: Comprehensive audit trail for compliance

### Real-time Features
- **Live Notifications**: Real-time updates via Supabase Realtime
- **System Monitoring**: Live health checks and performance metrics
- **Order Updates**: Real-time status changes and notifications
- **Inventory Alerts**: Low stock notifications for vendors

### PWA Features
- **Offline Support**: Service worker with intelligent caching
- **Install Prompt**: Native app-like installation
- **Push Notifications**: Real-time alerts and updates
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
- **Vesicash** for secure payment processing
- **Row Level Security** (RLS) for multi-tenant data protection
- **Edge Functions** for server-side logic (TypeScript/Deno)

### PWA
- **Service Worker** for offline functionality
- **Web App Manifest** for installation
- **Push API** for notifications
- **Cache API** for performance

## 📋 Database Schema

### Core Tables
- `profiles` - User information and roles
- `vendors` - Multi-vendor platform data
- `products` - Product catalog with vendor associations
- `orders` - Order management with payment and vendor tracking
- `order_items` - Order line items

### Payment & Monitoring
- `payments` - Core payment records and status tracking
- `payment_logs` - Detailed history of payment state changes
- `webhook_events` - Raw and processed webhook data for auditing
- `email_logs` - Tracking of all system-sent emails

### System & Security
- `notifications` - In-app alerts and notifications
- `activity_logs` - Generic audit trail for system events
- `inventory_logs` - Tracking of stock movements

## 🔧 Setup Instructions

### 1. Clone and Install
```bash
git clone <repository-url>
cd massrides-pwa
npm install
```

### 2. Environment Configuration
Create `.env.local`:
```env
VITE_SUPABASE_URL=your_supabase_project_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

### 2. Environment Configuration

### 2.1. Environment Variables Setup

1. Copy the example environment file:
```bash
cp .env.example .env
```

2. Edit `.env` and add your Supabase credentials:
   - Get `VITE_SUPABASE_URL` from Supabase Dashboard → Settings → API
   - Get `VITE_SUPABASE_ANON_KEY` from Supabase Dashboard → Settings → API

3. For production deployment, set these as environment variables in your hosting platform:
   - Netlify: Site settings → Environment variables
   - Vercel: Project settings → Environment Variables
   - AWS: Systems Manager → Parameter Store

**Important**: Never commit `.env` to version control. It's already in `.gitignore`.

### 3. Database Setup
```bash
# Run migrations
supabase migration up

# Seed initial data
supabase db reset --linked
```

### 4. Configure Vesicash
Set up Vesicash credentials in Supabase secrets:
```bash
supabase secrets set VESICASH_PRIVATE_KEY="your_private_key"
supabase secrets set VESICASH_PUBLIC_KEY="your_public_key"
supabase secrets set VESICASH_WEBHOOK_SECRET="your_webhook_secret"
supabase secrets set VESICASH_API_URL="https://api.vesicash.com/v1"

# Set Email provider secrets
supabase secrets set RESEND_API_KEY="your_resend_api_key"
```

### 5. Deploy Edge Functions
```bash
supabase functions deploy
```

### 6. Start Development
```bash
npm run dev
```

## 👥 User Roles & Permissions

### Guest
- Browse products
- Add to cart (localStorage)
- Checkout using phone/email
- Claim order later by signing up

### Customer
- Full shopping experience
- Order tracking
- Profile management
- Messaging with vendors

### Vendor
- Product management (CRUD)
- Inventory tracking
- Order fulfillment
- Customer communication
- Sales analytics

### Admin
- User management
- System oversight
- Payment monitoring
- Content management
- Analytics dashboard

### Super Admin
- Full system control
- Security monitoring
- Role management
- System configuration
- Audit access

## 🔐 Security Features

### Authentication
- Email/password authentication
- OAuth providers (Google, Facebook)
- Email verification required
- Password reset functionality

### Authorization
- Row Level Security (RLS) on all tables
- Role-based access control
- API endpoint protection
- Resource-level permissions

### Audit & Compliance
- Comprehensive activity logging
- Change tracking on critical tables
- Security event monitoring
- Payment audit trails

### Payment Security
- PCI DSS compliant payment processing
- Webhook signature verification
- Transaction encryption
- Fraud detection and monitoring

## 📊 Monitoring & Analytics

### System Health
- Database performance monitoring
- Edge function response times
- Real-time connection status
- Error rate tracking

### Business Metrics
- User registration and activity
- Product performance
- Order conversion rates
- Revenue tracking

### Security Monitoring
- Failed login attempts
- Suspicious activity detection
- Payment fraud monitoring
- Data access auditing

## 🚀 Deployment

### Production Build
```bash
npm run build
```

### Deploy to Hosting
The application can be deployed to any static hosting service:
- Netlify
- Vercel
- AWS S3 + CloudFront
- Google Cloud Storage

### Post-Deployment
1. Configure custom domain
2. Set up SSL certificate
3. Configure CDN
4. Set up monitoring alerts
5. Test all functionality

## 📱 PWA Installation

Users can install the app on their devices:
1. Visit the website
2. Look for "Install App" prompt
3. Follow browser-specific installation steps
4. App appears on home screen/app drawer

## 🔄 Real-time Features

### Live Updates
- Order status changes
- Inventory updates
- New messages
- System notifications

### WebSocket Connections
- Automatic reconnection
- Connection status monitoring
- Fallback to polling if needed

## 🛡 Error Handling

### Frontend
- Error boundaries for React components
- Global error handlers
- User-friendly error messages
- Automatic error reporting

### Backend
- Comprehensive error logging
- Graceful degradation
- Retry mechanisms
- Circuit breakers

## 📈 Performance Optimization

### Frontend
- Code splitting and lazy loading
- Image optimization
- Service worker caching
- Bundle size optimization

### Backend
- Database query optimization
- Proper indexing strategy
- Connection pooling
- Edge function optimization

## 🧪 Testing

### Unit Tests
```bash
npm run test
```

### Integration Tests
```bash
npm run test:integration
```

### E2E Tests
```bash
npm run test:e2e
```

## 📞 Support

For technical support or questions:
- Email: tech@massrides.co.zm
- Documentation: [Link to docs]
- Issue Tracker: [Link to issues]

## 📄 License

Copyright © 2024 Massrides Company Limited. All rights reserved.

---

## Quick Start Commands

```bash
# Development
npm run dev

# Build
npm run build

# Deploy functions
supabase functions deploy

# Run migrations
supabase db push

# View logs
supabase functions logs

# Reset database (development only)
supabase db reset
```

## Architecture Overview

```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   React PWA     │    │   Supabase       │    │   Vesicash      │
│                 │    │                  │    │                 │
│ • Components    │◄──►│ • PostgreSQL     │    │                 │
│ • Pages         │    │ • Auth (OTP)     │    │ • Payment Link  │
│ • Contexts      │    │ • Realtime       │◄──►│ • Webhooks      │
│ • Hooks         │    │ • Edge Functions │    │                 │
│ • Service Worker│    │ • Storage        │    │                 │
└─────────────────┘    └──────────────────┘    └─────────────────┘
```

The platform is production-ready with comprehensive e-commerce functionality, real-time features, and robust admin controls.