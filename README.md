# Massrides Agricultural Spare Parts PWA

A comprehensive Progressive Web Application for agricultural spare parts e-commerce with real-time features, admin controls, and Transaction Junction payment integration.

## 🚀 Features

### Core E-commerce
- **Product Catalog**: Browse 80+ agricultural spare parts with advanced filtering
- **Shopping Cart**: Real-time sync for users, localStorage for guests
- **Guest Checkout**: Email verification for secure guest purchases
- **User Accounts**: Complete registration, login, and profile management
- **Order Management**: Full lifecycle tracking with real-time updates

### Payment Processing
- **Transaction Junction Integration**: Secure HPP (Hosted Payment Page) flow
- **Payment Monitoring**: Real-time transaction tracking for admins
- **Manual Settlement**: Admin controls for authorized transactions
- **Payment Methods**: Tokenized payment method storage
- **Webhook Handling**: Idempotent webhook processing with audit trails

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
- **Transaction Junction** for payment processing
- **Row Level Security** for data protection
- **Edge Functions** for server-side logic

### PWA
- **Service Worker** for offline functionality
- **Web App Manifest** for installation
- **Push API** for notifications
- **Cache API** for performance

## 📋 Database Schema

### Core Tables
- `user_profiles` - User information and roles
- `spare_parts` - Product catalog with full specifications
- `orders` - Order management with payment tracking
- `order_items` - Order line items
- `categories` - Product categorization

### Cart Management
- `user_carts` - Authenticated user carts
- `cart_items` - Cart line items
- `guest_carts` - Guest shopping carts
- `guest_cart_items` - Guest cart items

### Communication
- `notifications` - Real-time user notifications
- `messages` - User messaging system
- `conversations` - Message threads

### Payment & Security
- `tj_transaction_logs` - Complete payment audit trail
- `tj_payment_methods` - Tokenized payment methods
- `tj_security_logs` - Security event logging
- `activity_logs` - Comprehensive user activity tracking

### System Management
- `user_settings` - User preferences
- `system_metrics` - Performance monitoring
- `audit_logs` - Change tracking for compliance
- `guest_verifications` - Email verification for guests

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

### 3. Database Setup
```bash
# Run migrations
supabase migration up

# Seed initial data
supabase db reset --linked
```

### 4. Configure Transaction Junction
Set up TJ credentials in Supabase secrets:
```bash
supabase secrets set TJ_CLIENT_ID="your_client_id"
supabase secrets set TJ_CLIENT_SECRET="your_client_secret"
supabase secrets set TJ_OAUTH_TOKEN_URL="your_oauth_url"
supabase secrets set TJ_API_BASE_URL="your_api_base_url"
supabase secrets set TJ_WEBHOOK_SECRET="your_webhook_secret"
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
- Browse catalog
- Add to cart (localStorage)
- Guest checkout with email verification

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
│   React PWA     │    │   Supabase       │    │ Transaction     │
│                 │    │                  │    │ Junction        │
│ • Components    │◄──►│ • PostgreSQL     │    │                 │
│ • Pages         │    │ • Auth           │    │ • HPP           │
│ • Contexts      │    │ • Realtime       │◄──►│ • Webhooks      │
│ • Hooks         │    │ • Edge Functions │    │ • Settlement    │
│ • Service Worker│    │ • Storage        │    │                 │
└─────────────────┘    └──────────────────┘    └─────────────────┘
```

The platform is production-ready with comprehensive e-commerce functionality, real-time features, and robust admin controls.