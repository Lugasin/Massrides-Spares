import React from 'react';
import { DashboardLayout } from "@/components/DashboardLayout";
import { useAuth } from "@/context/AuthContext";
import AdminDashboard from "@/components/AdminDashboard";
import VendorDashboard from "@/components/VendorDashboard";
import CustomerDashboard from "@/components/CustomerDashboard";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { Package, ShoppingCart, Users, Settings } from "lucide-react";

const Dashboard = () => {
  const { user, profile, userRole, loading } = useAuth();
  const navigate = useNavigate();

  if (loading) {
    return (
      <DashboardLayout userRole={userRole as any} userName="Loading...">
        <div className="p-6 text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading dashboard...</p>
        </div>
      </DashboardLayout>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Card className="w-full max-w-md">
          <CardContent className="p-6 text-center">
            <h2 className="text-xl font-semibold mb-4">Please log in</h2>
            <p className="text-muted-foreground mb-6">You need to be logged in to access the dashboard.</p>
            <Button onClick={() => navigate('/login')}>
              Go to Login
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const renderDashboardContent = () => {
    switch (userRole) {
      case 'super_admin':
      case 'admin':
        return <AdminDashboard />;
      
      case 'vendor':
        return <VendorDashboard />;
      
      case 'customer':
        return <CustomerDashboard />;
      
      case 'guest':
      default:
        return (
          <div className="space-y-6">
            <div className="text-center">
              <h2 className="text-3xl font-bold text-foreground mb-4">
                Welcome to Massrides
              </h2>
              <p className="text-muted-foreground mb-6">
                Discover our comprehensive range of agricultural spare parts
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => navigate('/catalog')}>
                <CardContent className="p-6 text-center">
                  <Package className="h-8 w-8 text-primary mx-auto mb-2" />
                  <h3 className="font-medium">Browse Catalog</h3>
                  <p className="text-sm text-muted-foreground">Explore spare parts</p>
                </CardContent>
              </Card>

              <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => navigate('/cart')}>
                <CardContent className="p-6 text-center">
                  <ShoppingCart className="h-8 w-8 text-primary mx-auto mb-2" />
                  <h3 className="font-medium">Shopping Cart</h3>
                  <p className="text-sm text-muted-foreground">View your cart</p>
                </CardContent>
              </Card>

              <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => navigate('/contact')}>
                <CardContent className="p-6 text-center">
                  <Users className="h-8 w-8 text-primary mx-auto mb-2" />
                  <h3 className="font-medium">Contact Us</h3>
                  <p className="text-sm text-muted-foreground">Get support</p>
                </CardContent>
              </Card>
            </div>
          </div>
        );
    }
  };

  return (
    <DashboardLayout 
      userRole={userRole as any} 
      userName={profile?.full_name || user?.email || 'User'}
    >
      {renderDashboardContent()}
    </DashboardLayout>
  );
};

export default Dashboard;