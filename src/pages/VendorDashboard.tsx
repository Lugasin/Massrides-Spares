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
import { DashboardLayout } from '@/components/DashboardLayout';
import { toast } from 'sonner';
import { Link, useNavigate } from 'react-router-dom';

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

  useEffect(() => {
    if (userRole === 'vendor' || userRole === 'super_admin' || userRole === 'admin') {
      fetchDashboardData();
    }
  }, [userRole]);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase.functions.invoke('get-vendor-dashboard-data');

      if (error) throw new Error(error.message);

      setDashboardData(data.dashboardData);
    } catch (error: any) {
      console.error('Error fetching dashboard data:', error);
      toast.error(`Failed to fetch dashboard data: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  if (userRole !== 'vendor' && userRole !== 'super_admin' && userRole !== 'admin') {
    return (
      <DashboardLayout userRole={userRole as any} userName={profile?.full_name || user?.email || 'User'}>
        <div className="p-6 text-center">
          <Package className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
          <h2 className="text-xl font-semibold mb-2">Vendor Access Required</h2>
          <p className="text-muted-foreground">You need vendor privileges to access this dashboard.</p>
        </div>
      </DashboardLayout>
    );
  }

  if (loading) {
    return (
      <DashboardLayout userRole={userRole as any} userName={profile?.full_name || user?.email || 'Vendor'}>
        <div className="p-6 text-center">Loading vendor dashboard...</div>
      </DashboardLayout>
    );
  }

  const customMetrics = dashboardData ? [
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

  return (
    <DashboardLayout userRole={userRole as any} userName={profile?.full_name || user?.email || 'Vendor'} metrics={customMetrics}>
      <div className="space-y-6">


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
                      <Link to={`/products/${product.id}`}>
                        <Button variant="outline" size="sm">Manage</Button>
                      </Link>
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
      </div >
    </DashboardLayout >
  );
};

export default VendorDashboard;