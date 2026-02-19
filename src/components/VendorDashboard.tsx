import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthContext';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from '@/components/ui/table';
import {
  Package,
  ShoppingCart,
  DollarSign,
  AlertTriangle,
  Store,
  TrendingUp,
  Users
} from 'lucide-react';
import { toast } from 'sonner';
import { Link, useNavigate } from 'react-router-dom';
import { VendorPaymentPanel } from '@/components/vendor/VendorPaymentPanel';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface DashboardData {
  totalRevenue: number;
  totalOrders: number;
  recentOrders: any[];
  lowStockProducts: any[];
  totalProducts: number;
}

const VendorDashboard: React.FC = () => {
  const { user, profile, userRole } = useAuth();
  const navigate = useNavigate();
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [vendorId, setVendorId] = useState<string | null>(null);

  useEffect(() => {
    if (userRole === 'vendor' || userRole === 'super_admin' || userRole === 'admin') {
      fetchVendorProfileAndData();
    }
  }, [userRole]);

  const fetchVendorProfileAndData = async () => {
    try {
      setLoading(true);

      // 1. Get Vendor ID first (assuming user is owner or staff)
      // If user is super_admin, they might want to see aggregated or specific vendor.
      // For now, let's assume if it's a vendor user, we find their vendor entity.

      let vId = null;
      if (userRole === 'vendor') {
         // Check 'vendors' table where owner_id = user.id
         const { data: vendorData } = await supabase
            .from('vendors')
            .select('id')
            .eq('owner_id', user!.id)
            .maybeSingle();

         if (vendorData) {
            vId = vendorData.id;
         } else {
             // Or check vendor_users if they are staff
             const { data: staffData } = await supabase
                .from('vendor_users')
                .select('vendor_id')
                .eq('user_id', user!.id)
                .maybeSingle();
             if (staffData) vId = staffData.vendor_id;
         }
      }

      setVendorId(vId);

      // 2. Fetch Data
      // We can use a direct query since we have RLS setup

      // Revenue & Orders
      let revenueQuery = supabase.from('orders').select('total_amount, id, status, created_at, order_number');
      let productsQuery = supabase.from('products').select('id, name, stock_quantity, min_stock_level');

      if (vId) {
          revenueQuery = revenueQuery.eq('vendor_id', vId);
          productsQuery = productsQuery.eq('vendor_id', vId);
      } else if (userRole === 'vendor' && !vId) {
          // Vendor but no vendor record found?
          console.warn("User is vendor role but no vendor record found.");
      }

      const [ordersRes, productsRes] = await Promise.all([
          revenueQuery.order('created_at', { ascending: false }),
          productsQuery
      ]);

      const orders = ordersRes.data || [];
      const products = productsRes.data || [];

      const totalRevenue = orders.reduce((sum, o) => sum + Number(o.total_amount || 0), 0);
      const totalOrders = orders.length;
      const recentOrders = orders.slice(0, 5);
      const lowStockProducts = products.filter(p => p.stock_quantity < (p.min_stock_level || 5));
      const totalProducts = products.length;

      setDashboardData({
        totalRevenue,
        totalOrders,
        recentOrders,
        lowStockProducts,
        totalProducts
      });

    } catch (error: any) {
      console.error('Error fetching dashboard data:', error);
      toast.error(`Failed to fetch dashboard data`);
    } finally {
      setLoading(false);
    }
  };

  const metrics = dashboardData ? [
    { label: "Your Products", value: dashboardData.totalProducts.toString(), icon: Package, change: "Active" },
    { label: "Total Orders", value: dashboardData.totalOrders.toString(), icon: ShoppingCart, change: "Total" },
    { label: "Total Revenue", value: `$${(dashboardData.totalRevenue || 0).toLocaleString()}`, icon: DollarSign, change: "Gross" },
    { label: "Low Stock Alerts", value: dashboardData.lowStockProducts.length.toString(), icon: AlertTriangle, change: dashboardData.lowStockProducts.length > 0 ? "Action Needed" : "Good" }
  ] : [
    { label: "Your Products", value: "0", icon: Package, change: "Active" },
    { label: "Total Orders", value: "0", icon: ShoppingCart, change: "Total" },
    { label: "Total Revenue", value: "$0", icon: DollarSign, change: "Gross" },
    { label: "Low Stock Alerts", value: "0", icon: AlertTriangle, change: "Good" }
  ];

  if (loading) {
    return <div className="p-6 text-center">Loading vendor dashboard...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Metrics Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {metrics.map((metric, index) => (
          <Card key={index}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                {metric.label}
              </CardTitle>
              <metric.icon className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{metric.value}</div>
              <p className="text-xs text-muted-foreground">
                {metric.change}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="payments">Payments</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          {/* Business Information */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Store className="h-6 w-6 text-primary" />
                Business Information
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h3 className="font-semibold mb-2">Contact Details</h3>
                  <div className="space-y-2 text-sm">
                    <p><span className="text-muted-foreground">Business Name:</span> {profile?.company_name || 'Not set'}</p>
                    <p><span className="text-muted-foreground">Contact Person:</span> {profile?.full_name || 'Not set'}</p>
                    <p><span className="text-muted-foreground">Email:</span> {user?.email}</p>
                    <p><span className="text-muted-foreground">Phone:</span> {profile?.phone || 'Not set'}</p>
                    <p><span className="text-muted-foreground">Address:</span> {profile?.address || 'Not set'}</p>
                  </div>
                </div>
                <div>
                  <h3 className="font-semibold mb-2">Vendor Status</h3>
                  <div className="space-y-2">
                    <Badge variant="default" className="mr-2">Verified Vendor</Badge>
                    <Badge variant="outline" className="mr-2">Active Seller</Badge>
                    <div className="mt-4">
                      <p className="text-sm text-muted-foreground">Member since: {new Date(profile?.created_at || '').toLocaleDateString()}</p>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Recent Orders */}
          <Card>
            <CardHeader>
              <CardTitle>Recent Orders</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Order #</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Total</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {dashboardData?.recentOrders.map((order) => (
                    <TableRow key={order.id}>
                      <TableCell className="font-medium">{order.order_number || order.id.substring(0,8)}</TableCell>
                      <TableCell>{new Date(order.created_at).toLocaleDateString()}</TableCell>
                      <TableCell>
                        <Badge variant={order.status === 'completed' ? 'default' : 'secondary'} className="capitalize">
                          {order.status}
                        </Badge>
                      </TableCell>
                      <TableCell>${Number(order.total_amount).toLocaleString()}</TableCell>
                      <TableCell>
                        <Button variant="outline" size="sm" onClick={() => navigate(`/orders`)}>View</Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              {dashboardData?.recentOrders.length === 0 && (
                <div className="text-center py-8 text-muted-foreground">
                  No recent orders.
                </div>
              )}
            </CardContent>
          </Card>

          {/* Low Stock Products */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-yellow-500" />
                Low Stock Products
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Product</TableHead>
                    <TableHead>Stock</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {dashboardData?.lowStockProducts.map((product) => (
                    <TableRow key={product.id}>
                      <TableCell className="font-medium">{product.name}</TableCell>
                      <TableCell className="text-red-500 font-bold">{product.stock_quantity}</TableCell>
                      <TableCell>
                        <Button variant="outline" size="sm" onClick={() => navigate(`/vendor/inventory`)}>Manage</Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              {dashboardData?.lowStockProducts.length === 0 && (
                <div className="text-center py-8 text-muted-foreground">
                  No products with low stock.
                </div>
              )}
            </CardContent>
          </Card>

          {/* Quick Actions */}
          <Card>
            <CardHeader>
              <CardTitle>Quick Actions</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
                <Button className="h-20 flex-col gap-2" onClick={() => navigate('/vendor/inventory')}>
                  <Package className="h-6 w-6" />
                  Manage Inventory
                </Button>
                <Button className="h-20 flex-col gap-2" onClick={() => navigate('/vendor/add-product')}>
                  <Package className="h-6 w-6" />
                  Add New Part
                </Button>
                <Button className="h-20 flex-col gap-2" variant="secondary" onClick={() => navigate('/user-management')}>
                  <Users className="h-6 w-6" />
                  Manage Users
                </Button>
                <Button variant="outline" className="h-20 flex-col gap-2" onClick={() => navigate('/analytics')}>
                  <TrendingUp className="h-6 w-6" />
                  View Analytics
                </Button>
                <Button variant="outline" className="h-20 flex-col gap-2" onClick={() => navigate('/messages')}>
                  <Users className="h-6 w-6" />
                  Customer Messages
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="payments">
          {/* We pass the verified vendor ID if available, or let component handle it */}
          <VendorPaymentPanel />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default VendorDashboard;