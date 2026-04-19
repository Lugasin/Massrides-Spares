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
import { VendorSettingsPanel } from '@/components/vendor/VendorSettingsPanel';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface DashboardData {
  totalRevenue: number;
  totalOrders: number;
  recentOrders: any[];
  lowStockProducts: any[];
  totalProducts: number;
}

const VendorDashboard: React.FC = () => {
  const { user, profile, userRole, session } = useAuth();
  const navigate = useNavigate();
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (session?.access_token && userRole === 'vendor') {
      fetchDashboardData();
    } else if (!session?.access_token) {
      setLoading(false);
    } else {
      setDashboardData(null);
      setLoading(false);
    }
  }, [session?.access_token, userRole]);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      if (!session?.access_token) {
        throw new Error('No active session available for dashboard request');
      }

      const { data, error } = await supabase.functions.invoke('get-vendor-dashboard-data', {
        headers: {
          Authorization: `Bearer ${session.access_token}`
        }
      });

      if (error) {
        console.error('Supabase function invocation error:', error);
        throw new Error(error.message || 'Function invocation failed');
      }

      setError(null);
      setDashboardData(data?.dashboardData ?? null);
    } catch (error: any) {
      console.error('Error fetching dashboard data:', error);
      setDashboardData(null);
      setError(error.message || 'Failed to fetch vendor dashboard data');
      toast.error(`Failed to fetch dashboard data: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const customMetrics = dashboardData ? [
    { label: "Your Products", value: dashboardData.totalProducts.toString(), icon: Package, change: "Active" },
    { label: "Total Orders", value: dashboardData.totalOrders.toString(), icon: ShoppingCart, change: "Total" },
    { label: "Total Revenue", value: `$${(dashboardData.totalRevenue || 0).toLocaleString()}`, icon: DollarSign, change: "Gross" },
    { label: "Low Stock Alerts", value: dashboardData.lowStockProducts.length.toString(), icon: AlertTriangle, change: dashboardData.lowStockProducts.length > 0 ? "Action Needed" : "Good" }
  ] : [];

  if (loading) {
    return <div className="p-6 text-center">Loading vendor dashboard...</div>;
  }

  return (
    <div className="space-y-6">
      {error && (
        <Card className="border-destructive/30 bg-destructive/5">
          <CardContent className="flex flex-col gap-3 p-4 md:flex-row md:items-center md:justify-between">
            <div className="flex items-start gap-3">
              <AlertTriangle className="mt-0.5 h-5 w-5 text-destructive" />
              <div>
                <p className="font-medium text-destructive">Vendor dashboard unavailable</p>
                <p className="text-sm text-muted-foreground">{error}</p>
              </div>
            </div>
            <Button variant="outline" size="sm" onClick={fetchDashboardData} disabled={loading}>
              Retry
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Metrics Grid */}
      {customMetrics.length > 0 && (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {customMetrics.map((metric, index) => (
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
      )}

      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="payments">Payments</TabsTrigger>
          <TabsTrigger value="settings">Settings</TabsTrigger>
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
                      <TableCell className="font-medium">{order.order_number}</TableCell>
                      <TableCell>{new Date(order.created_at).toLocaleDateString()}</TableCell>
                      <TableCell>
                        <Badge variant={order.status === 'completed' ? 'default' : 'secondary'} className="capitalize">
                          {order.status}
                        </Badge>
                      </TableCell>
                      <TableCell>${order.total_amount.toLocaleString()}</TableCell>
                      <TableCell>
                        <Link to={`/orders/${order.id}`}>
                          <Button variant="outline" size="sm">View</Button>
                        </Link>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              {error ? (
                <div className="text-center py-8 text-muted-foreground">
                  Unable to load recent orders until the dashboard data service recovers.
                </div>
              ) : dashboardData?.recentOrders.length === 0 && (
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
                        <Link to={`/products/${product.id}`}>
                          <Button variant="outline" size="sm">Manage</Button>
                        </Link>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              {error ? (
                <div className="text-center py-8 text-muted-foreground">
                  Unable to load low stock products until the dashboard data service recovers.
                </div>
              ) : dashboardData?.lowStockProducts.length === 0 && (
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
                <Button className="h-20 flex-col gap-2" variant="secondary" onClick={() => navigate('/orders')}>
                  <ShoppingCart className="h-6 w-6" />
                  View Orders
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
          <VendorPaymentPanel />
        </TabsContent>
        <TabsContent value="settings">
          <VendorSettingsPanel />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default VendorDashboard;
