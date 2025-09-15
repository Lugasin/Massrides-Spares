import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { CartDrawer } from "@/components/CartDrawer"; // Import CartDrawer
import { QueryClient, QueryClientProvider, useQueryClient } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { QuoteProvider, useQuote } from "@/context/QuoteContext"; // Import useQuote
import { AuthProvider } from "@/context/AuthContext"; // Import AuthProvider
import Index from "./pages/Index";
import Login from "./pages/Login";
import Register from "./pages/Register";
import SparePartsCatalog from "./pages/SparePartsCatalog";
import Cart from "./pages/Cart"; // Make sure Cart is imported
import Checkout from "./pages/Checkout";
import NotFound from "./pages/NotFound";
import SparePartDetail from "./pages/SparePartDetail"; // Import SparePartDetail page
import Profile from "./pages/Profile"; // Import Profile page
import Products from "./pages/Products"; // Import Products page
import AddProduct from "./pages/AddProduct"; // Import AddProduct page
import CheckoutSuccess from "./pages/CheckoutSuccess";
import CheckoutCancel from "./pages/CheckoutCancel";
import AdminProfile from "./pages/AdminProfile";
import VendorProfile from "./pages/VendorProfile";
import CustomerProfile from "./pages/CustomerProfile";
import SuperAdminProfile from "./pages/SuperAdminProfile";
import VendorInventory from "./pages/VendorInventory"; // Import VendorInventory
import VerifyEmail from "./pages/VerifyEmail"; // Import VerifyEmail page
import Welcome from "./pages/Welcome"; // Import Welcome page
import Messages from "./pages/Messages"; // Import Messages page

import NewQuoteRequest from './pages/NewQuoteRequest'; // Import NewQuoteRequest page
import UserManagement from './pages/UserManagement'; // Import UserManagement page
import Dashboard from "./pages/Dashboard";
import VendorMedia from './pages/VendorMedia'; 
import ForgotPassword from './pages/ForgotPassword';
import ResetPassword from './pages/ResetPassword';
import About from './pages/About';
import Contact from './pages/Contact';
import Orders from './pages/Orders';
import Settings from './pages/Settings';
import ActivityLog from './pages/ActivityLog';
import GuestShoppingLanding from './pages/GuestShoppingLanding';
import GuestCheckout from './pages/GuestCheckout';
import PaymentMonitoring from './pages/PaymentMonitoring';
import PaymentMethods from './pages/PaymentMethods';
import Analytics from './pages/Analytics';
import ProductsManagement from './pages/ProductsManagement';
import RoleManager from './pages/RoleManager';
import SecurityDashboard from './pages/SecurityDashboard';
import { BackToTop } from './components/BackToTop';
import { ScrollToTop } from './components/ScrollToTop';
import SecurityAlertToast from './components/SecurityAlertToast';

const queryClient = new QueryClient();

const App = () => {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <QuoteProvider>
          <AppContent />
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
      <BrowserRouter future={{ v7_relativeSplatPath: true, v7_startTransition: true }}>
        <ScrollToTop />
        <BackToTop />
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

          {/* Protected Profile Route */}
          <Route path="/profile" element={<ProtectedRoute element={<Profile />} />} /> {/* Protected Profile Route */}
          <Route path="/profile/super-admin" element={<ProtectedRoute allowedRoles={['super_admin']} element={<SuperAdminProfile />} />} />
          <Route path="/profile/admin" element={<ProtectedRoute allowedRoles={['admin', 'super_admin']} element={<AdminProfile />} />} />
          <Route path="/profile/guest" element={<Profile />} /> {/* Route for Guest Profile */}
          <Route path="/profile/vendor" element={<ProtectedRoute allowedRoles={['vendor']} element={<VendorProfile />} />} />
          <Route path="/profile/customer" element={<ProtectedRoute allowedRoles={['customer']} element={<CustomerProfile />} />} />
          <Route path="/dashboard/products/add" element={<ProtectedRoute allowedRoles={['vendor', 'admin', 'super_admin']} element={<AddProduct />} />} /> {/* Protected Add Product Route */}
          <Route path="/dashboard/products" element={<ProtectedRoute allowedRoles={['vendor', 'admin', 'super_admin']} element={<Products />} />} /> {/* Protected Products Management Route */}
          <Route path="/user-management" element={<ProtectedRoute allowedRoles={['super_admin', 'admin']} element={<UserManagement />} />} />
          <Route path="/role-manager" element={<ProtectedRoute allowedRoles={['super_admin', 'admin']} element={<RoleManager />} />} />
        </Routes>
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
