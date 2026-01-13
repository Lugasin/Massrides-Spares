import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { CartDrawer } from "@/components/CartDrawer"; // Import CartDrawer
import { QueryClient, QueryClientProvider, useQueryClient } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { lazy, Suspense } from 'react';

import { QuoteProvider, useQuote } from "@/context/QuoteContext"; // Import useQuote
import { AuthProvider } from "@/context/AuthContext"; // Import AuthProvider
import { SettingsProvider } from "@/context/SettingsContext"; // Import SettingsProvider
import Index from "./pages/Index";
import Login from "./pages/Login";
import Register from "./pages/Register";
import SparePartsCatalog from "./pages/SparePartsCatalog";
import Cart from "./pages/Cart"; // Make sure Cart is imported
import Checkout from "./pages/Checkout";
import NotFound from "./pages/NotFound";
import SparePartDetail from "./pages/SparePartDetail"; // Import SparePartDetail page
import Profile from "./pages/Profile"; // Import Profile page
// Products and AddProduct replaced by lazy load

import CheckoutSuccess from "./pages/CheckoutSuccess";
import CheckoutCancel from "./pages/CheckoutCancel";
import GuestShoppingLanding from './pages/GuestShoppingLanding';
import GuestCheckout from './pages/GuestCheckout';

import { BackToTop } from './components/BackToTop';
import { ScrollToTop } from './components/ScrollToTop';
import SecurityAlertToast from './components/SecurityAlertToast';
import ComprehensiveAuditLogger from './components/ComprehensiveAuditLogger';
import PWAInstallPrompt from './components/PWAInstallPrompt';
import SystemHealthMonitor from './components/SystemHealthMonitor';

// Lazy load heavy pages
const Messages = lazy(() => import("./pages/Messages"));
const NewQuoteRequest = lazy(() => import('./pages/NewQuoteRequest'));
const ForgotPassword = lazy(() => import('./pages/ForgotPassword'));
const ResetPassword = lazy(() => import('./pages/ResetPassword'));
const About = lazy(() => import('./pages/About'));
const Contact = lazy(() => import('./pages/Contact'));
const VerifyEmail = lazy(() => import("./pages/VerifyEmail"));
const Welcome = lazy(() => import("./pages/Welcome"));

const Dashboard = lazy(() => import("./pages/Dashboard"));
const Orders = lazy(() => import('./pages/Orders'));
const Analytics = lazy(() => import('./pages/Analytics'));
const ProductsManagement = lazy(() => import('./pages/ProductsManagement'));
const Settings = lazy(() => import('./pages/Settings'));
const ActivityLog = lazy(() => import('./pages/ActivityLog'));
const PaymentMonitoring = lazy(() => import('./pages/PaymentMonitoring'));
const SecurityDashboard = lazy(() => import('./pages/SecurityDashboard'));
const PaymentMethods = lazy(() => import('./pages/PaymentMethods'));
const AdminProfile = lazy(() => import("./pages/AdminProfile"));
// VendorProfile replaced by VendorDashboard
const CustomerProfile = lazy(() => import("./pages/CustomerProfile"));
const SuperAdminProfile = lazy(() => import("./pages/SuperAdminProfile"));
const SupportProfile = lazy(() => import("./pages/SupportProfile"));
const UserManagement = lazy(() => import('./pages/UserManagement'));
const RoleManager = lazy(() => import('./pages/RoleManager'));
const VendorDashboard = lazy(() => import("./pages/VendorDashboard"));
const VendorInventory = lazy(() => import("./pages/VendorInventory"));
const VendorMedia = lazy(() => import('./pages/VendorMedia'));
const AddProduct = lazy(() => import("./pages/AddProduct"));
const Products = lazy(() => import("./pages/Products"));
const DevSetup = lazy(() => import("./pages/DevSetup"));

// Loading component
const PageLoader = () => (
  <div className="flex items-center justify-center min-h-[50vh]">
    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
  </div>
);

const queryClient = new QueryClient();

const App = () => {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <QuoteProvider>
          <SettingsProvider>
            <AppContent />
          </SettingsProvider>
        </QuoteProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
};

const AppContent = () => {
  return (
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <SecurityAlertToast />
      <ComprehensiveAuditLogger />
      <PWAInstallPrompt />
      <BrowserRouter future={{ v7_relativeSplatPath: true, v7_startTransition: true }}>
        <ScrollToTop />
        <BackToTop />
        <Suspense fallback={<PageLoader />}>
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/catalog" element={<SparePartsCatalog />} />
            <Route path="/cart" element={<Cart />} />
            <Route path="/checkout" element={<Checkout />} />
            <Route path="/checkout/success" element={<CheckoutSuccess />} />
            <Route path="/checkout/cancel" element={<CheckoutCancel />} />

            {/* Protected Dashboard Route */}
            <Route path="/dashboard" element={<ProtectedRoute element={<Dashboard />} />} /> {/* Protected Dashboard Route */}

            {/* Auth routes */}
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/forgot-password" element={<ForgotPassword />} />
            <Route path="/reset-password" element={<ResetPassword />} />
            <Route path="/about" element={<About />} />
            <Route path="/contact" element={<Contact />} />
            <Route path="/parts/:partId" element={<SparePartDetail />} />
            <Route path="/verify-email" element={<VerifyEmail />} />
            <Route path="/welcome" element={<Welcome />} />
            <Route path="/guest-shopping" element={<GuestShoppingLanding />} />
            <Route path="/guest-checkout" element={<GuestCheckout />} />

            <Route path="/vendor/media" element={<VendorMedia />} /> {/* Add route for VendorMedia */}
            <Route path="/vendor/inventory" element={<ProtectedRoute allowedRoles={['vendor', 'admin']} element={<VendorInventory />} />} />
            <Route path="/vendor/add-product" element={<ProtectedRoute allowedRoles={['vendor', 'admin']} element={<AddProduct />} />} />
            <Route path="/vendor/edit-product/:productId" element={<ProtectedRoute allowedRoles={['vendor']} element={<AddProduct />} />} />

            {/* Dashboard and management routes */}
            <Route path="/orders" element={<ProtectedRoute element={<Orders />} />} />
            <Route path="/analytics" element={<ProtectedRoute element={<Analytics />} />} />
            <Route path="/products-management" element={<ProtectedRoute element={<ProductsManagement />} />} />
            <Route path="/settings" element={<ProtectedRoute element={<Settings />} />} />
            <Route path="/activity-log" element={<ProtectedRoute allowedRoles={['admin', 'super_admin']} element={<ActivityLog />} />} />
            <Route path="/payment-monitoring" element={<ProtectedRoute allowedRoles={['admin', 'super_admin']} element={<PaymentMonitoring />} />} />
            <Route path="/security-dashboard" element={<ProtectedRoute allowedRoles={['super_admin']} element={<SecurityDashboard />} />} />
            <Route path="/payment-methods" element={<ProtectedRoute element={<PaymentMethods />} />} />
            <Route path="/profile/payment-methods" element={<ProtectedRoute element={<PaymentMethods />} />} />
            <Route path="/messages" element={<ProtectedRoute element={<Messages />} />} />
            <Route path="/new-quote" element={<ProtectedRoute element={<NewQuoteRequest />} />} /> {/* Add route for NewQuoteRequest */}
            <Route path="/system-health" element={<ProtectedRoute allowedRoles={['admin', 'super_admin']} element={<SystemHealthMonitor />} />} />

            {/* Protected Profile Route */}
            <Route path="/profile" element={<ProtectedRoute element={<Profile />} />} /> {/* Protected Profile Route */}
            <Route path="/profile/super-admin" element={<ProtectedRoute allowedRoles={['super_admin']} element={<SuperAdminProfile />} />} />
            <Route path="/profile/admin" element={<ProtectedRoute allowedRoles={['admin', 'super_admin']} element={<AdminProfile />} />} />
            <Route path="/profile/guest" element={<Profile />} /> {/* Route for Guest Profile */}
            <Route path="/profile/vendor" element={<ProtectedRoute allowedRoles={['vendor', 'super_admin', 'admin']} element={<VendorDashboard />} />} />
            <Route path="/profile/customer" element={<ProtectedRoute allowedRoles={['customer']} element={<CustomerProfile />} />} />
            <Route path="/profile/support" element={<ProtectedRoute allowedRoles={['support']} element={<SupportProfile />} />} />
            <Route path="/dashboard/products/add" element={<ProtectedRoute allowedRoles={['vendor', 'admin', 'super_admin']} element={<AddProduct />} />} /> {/* Protected Add Product Route */}
            <Route path="/dashboard/products" element={<ProtectedRoute allowedRoles={['vendor', 'admin', 'super_admin']} element={<Products />} />} /> {/* Protected Products Management Route */}
            <Route path="/user-management" element={<ProtectedRoute allowedRoles={['super_admin', 'admin', 'vendor']} element={<UserManagement />} />} />
            <Route path="/role-manager" element={<ProtectedRoute allowedRoles={['super_admin', 'admin', 'vendor']} element={<RoleManager />} />} />

            {/* Developer Setup Route - Temporary for seeding */}
            <Route path="/dev-setup" element={<DevSetup />} />

          </Routes>
        </Suspense>
      </BrowserRouter>
    </TooltipProvider>
  );
};

export default App;
import { useAuth } from "@/context/AuthContext";
import { Navigate } from "react-router-dom";
import React from "react";

interface ProtectedRouteProps {
  element: React.ReactNode;
  allowedRoles?: string[]; // Optional array of allowed roles
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ element, allowedRoles }) => {
  const { user, userRole, loading } = useAuth();

  // While loading auth status, render nothing or a loading indicator
  if (loading) {
    return <div>Loading...</div>; // Or a more sophisticated loader
  }

  // If user is not authenticated, redirect to login
  if (!user) {
    return <Navigate to="/login" replace />;
  }

  // If allowedRoles are specified, check if user's role is included
  if (allowedRoles && userRole && !allowedRoles.includes(userRole)) {
    // If user's role is not allowed, redirect to dashboard or an unauthorized page
    return <Navigate to="/dashboard" replace />; // Redirect to dashboard for now
  }

  // If authenticated and authorized (or no role restrictions), render the element
  return <>{element}</>;
};