import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Package,
  ShoppingCart,
  DollarSign,
  TrendingUp,
  AlertTriangle,
  Plus,
  Eye,
  Edit
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';

interface VendorMetrics {
  totalProducts: number;
  totalOrders: number;
  totalRevenue: number;
  lowStockItems: number;
  pendingOrders: number;
  averageRating: number;
}

interface Product {
  id: string;
  name: string;
  price: number;
  stock_quantity: number;
  min_stock_level: number;
  vendor_name?: string;
  availability_status: string;
}

const VendorDashboard: React.FC = () => {
  const { user, profile, userRole } = useAuth();
  const navigate = useNavigate();
  const [metrics, setMetrics] = useState<VendorMetrics>({
    totalProducts: 0,
    totalOrders: 0,
    totalRevenue: 0,
    lowStockItems: 0,
    pendingOrders: 0,
    averageRating: 4.8
  });
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (userRole === 'vendor' && profile) {
      fetchVendorData();
      subscribeToUpdates();
    }
  }, [userRole, profile]);

  const fetchVendorData = async () => {
    try {
      setLoading(true);

      // Fetch vendor products
      const { data: productsData, error: productsError } = await supabase
        .from('products')
        .select(`
          *,
          inventory(quantity),
          category:categories(name),
          vendor:user_profiles(full_name, company_name)
        `);
      // Filter removed to allow vendors to view all stock as requested

      if (productsError) throw productsError;

      // Transform data to match Product interface
      const transformedProducts = productsData?.map((p: any) => ({
        ...p,
        name: p.title, // Map title to name
        stock_quantity: p.inventory?.[0]?.quantity || 0,
        min_stock_level: 5, // Defaulting min_stock_level as it's not in DB yet
        availability_status: (p.inventory?.[0]?.quantity || 0) > 0 ? 'in_stock' : 'out_of_stock'
      })) || [];

      setProducts(transformedProducts);

      // Calculate metrics
      const lowStockItems = transformedProducts.filter(p => p.stock_quantity <= p.min_stock_level).length;

      // Fetch order data for this vendor's products
      // Note: This requires order_items to be linked to products
      const productIds = transformedProducts.map(p => p.id);

      let vendorRevenue = 0;
      let uniqueOrders: any[] = [];
      let pendingOrders = 0;

      if (productIds.length > 0) {
        const { data: orderItems } = await supabase
          .from('order_items')
          .select('*, order:orders(*)')
          .in('product_id', productIds)
          .returns<any[]>(); // Use returns<any[]>() to bypass strict type check for joined data

        if (orderItems) {
          vendorRevenue = orderItems.reduce((sum: number, item: any) => sum + (item.unit_price * item.quantity), 0);
          uniqueOrders = [...new Map(orderItems.map((item: any) => [item.order.id, item.order])).values()];
          pendingOrders = uniqueOrders.filter((order: any) => order.status === 'pending').length;
        }
      }

      setMetrics({
        totalProducts: transformedProducts.length,
        totalOrders: uniqueOrders.length,
        totalRevenue: vendorRevenue,
        lowStockItems,
        pendingOrders,
        averageRating: 4.8 // Placeholder
      });

    } catch (error: any) {
      console.error('Error fetching vendor data:', error);
      toast.error('Failed to load vendor data');
    } finally {
      setLoading(false);
    }
  };

  const subscribeToUpdates = () => {
    const channel = supabase
      .channel('vendor-dashboard')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'products',
          filter: `vendor_id=eq.${profile?.id}`
        },
        fetchVendorData
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'inventory'
        },
        fetchVendorData
      )
      .subscribe();

    return () => supabase.removeChannel(channel);
  };

  const lowStockProducts = products.filter(p => p.stock_quantity <= p.min_stock_level);

  return (
    <div className="space-y-6">
      {/* Welcome Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">
            Welcome, {profile?.full_name || profile?.company_name || 'Vendor'}
          </h1>
          <p className="text-muted-foreground">Vendor Dashboard</p>
        </div>
        <Button onClick={() => navigate('/vendor/add-product')}>
          <Plus className="h-4 w-4 mr-2" />
          Add Product
        </Button>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">My Products</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.totalProducts}</div>
            <p className="text-xs text-muted-foreground">
              Active listings
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Revenue</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${metrics.totalRevenue.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">
              Total earnings
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Orders</CardTitle>
            <ShoppingCart className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.totalOrders}</div>
            <p className="text-xs text-muted-foreground">
              {metrics.pendingOrders} pending
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Low Stock</CardTitle>
            <AlertTriangle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${metrics.lowStockItems > 0 ? 'text-red-500' : 'text-green-500'}`}>
              {metrics.lowStockItems}
            </div>
            <p className="text-xs text-muted-foreground">
              Items need restocking
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Low Stock Alert */}
      {lowStockProducts.length > 0 && (
        <Card className="border-yellow-200 bg-yellow-50">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <AlertTriangle className="h-5 w-5 text-yellow-600" />
              <div>
                <p className="font-medium text-yellow-800">Low Stock Alert</p>
                <p className="text-sm text-yellow-700">
                  {lowStockProducts.length} products are running low on stock.
                </p>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => navigate('/vendor/inventory')}
                className="ml-auto"
              >
                Manage Inventory
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => navigate('/vendor/inventory')}>
          <CardContent className="p-6 text-center">
            <Package className="h-8 w-8 text-primary mx-auto mb-2" />
            <h3 className="font-medium">Manage Inventory</h3>
            <p className="text-sm text-muted-foreground">Update stock levels</p>
          </CardContent>
        </Card>

        <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => navigate('/vendor/add-product')}>
          <CardContent className="p-6 text-center">
            <Plus className="h-8 w-8 text-primary mx-auto mb-2" />
            <h3 className="font-medium">Add Product</h3>
            <p className="text-sm text-muted-foreground">List new spare part</p>
          </CardContent>
        </Card>

        <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => navigate('/orders')}>
          <CardContent className="p-6 text-center">
            <ShoppingCart className="h-8 w-8 text-primary mx-auto mb-2" />
            <h3 className="font-medium">View Orders</h3>
            <p className="text-sm text-muted-foreground">Process customer orders</p>
          </CardContent>
        </Card>

        <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => navigate('/analytics')}>
          <CardContent className="p-6 text-center">
            <TrendingUp className="h-8 w-8 text-primary mx-auto mb-2" />
            <h3 className="font-medium">Analytics</h3>
            <p className="text-sm text-muted-foreground">View performance</p>
          </CardContent>
        </Card>
      </div>

      {/* Vendor Profile */}
      <Card>
        <CardHeader>
          <CardTitle>Vendor Profile</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">Company Name</span>
            <span>{profile?.company_name || 'N/A'}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">Contact Name</span>
            <span>{profile?.full_name || 'N/A'}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">Email</span>
            <span>{user?.email}</span>
          </div>
          <Button
            variant="outline"
            className="w-full"
            onClick={() => navigate('/profile/vendor')}
          >
            <Edit className="h-4 w-4 mr-2" />
            Edit Profile
          </Button>
        </CardContent>
      </Card>

      {/* Recent Products */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Recent Products</CardTitle>
            <Button variant="outline" onClick={() => navigate('/vendor/inventory')}>
              View All
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {products.slice(0, 5).map((product) => (
              <div key={product.id} className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
                <div>
                  <p className="font-medium">{product.name}</p>
                  <p className="text-sm text-muted-foreground">
                    Stock: {product.stock_quantity} | Price: ${product.price.toLocaleString()}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant={product.availability_status === 'in_stock' ? 'default' : 'secondary'}>
                    {product.availability_status}
                  </Badge>
                  <Button variant="ghost" size="sm" onClick={() => navigate(`/vendor/edit-product/${product.id}`)}>
                    <Edit className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default VendorDashboard;