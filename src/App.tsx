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
import Catalog from "./pages/Catalog";
import Cart from "./pages/Cart"; // Make sure Cart is imported
import Checkout from "./pages/Checkout";
import NotFound from "./pages/NotFound";
import ProductDetail from "./pages/ProductDetail"; // Import ProductDetail page
import Profile from "./pages/Profile"; // Import Profile page
import Products from "./pages/Products"; // Import Products page
import AddProduct from "./pages/AddProduct"; // Import AddProduct page

import NewQuoteRequest from './pages/NewQuoteRequest'; // Import NewQuoteRequest page
import UserManagement from './pages/UserManagement'; // Import UserManagement page
import Dashboard from "./pages/Dashboard";
import VendorMedia from './pages/VendorMedia'; // Import VendorMedia page
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
      <BrowserRouter future={{ v7_relativeSplatPath: true, v7_startTransition: true }}>
        <Routes>
          <Route path="/" element={<Index />} />
          <Route path="/catalog" element={<Catalog />} />
          <Route path="/cart" element={<Cart />} />
          <Route path="/checkout" element={<Checkout />} />

          {/* Protected Dashboard Route */}
          <Route path="/dashboard" element={<ProtectedRoute element={<Dashboard />} />} /> {/* Protected Dashboard Route */}

          {/* Auth routes */}
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/products/:productId" element={<ProductDetail />} />

          <Route path="/vendor/media" element={<VendorMedia />} /> {/* Add route for VendorMedia */}
          <Route path="/new-quote" element={<ProtectedRoute element={<NewQuoteRequest />} />} /> {/* Add route for NewQuoteRequest */}

          {/* Protected Profile Route */}
          <Route path="/profile" element={<ProtectedRoute element={<Profile />} />} /> {/* Protected Profile Route */}
          <Route path="/dashboard/products/add" element={<ProtectedRoute allowedRoles={['vendor', 'admin', 'super_admin']} element={<AddProduct />} />} /> {/* Protected Add Product Route */}
          <Route path="/dashboard/products" element={<ProtectedRoute allowedRoles={['vendor', 'admin', 'super_admin']} element={<Products />} />} /> {/* Protected Products Management Route */}
          <Route path="/dashboard/users" element={<ProtectedRoute allowedRoles={['admin', 'super_admin']} element={<UserManagement />} />} /> {/* Protected User Management Route */}
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
