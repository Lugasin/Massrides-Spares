import React from 'react';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { DashboardLayout } from '@/components/DashboardLayout';
import {
  User,
  ShoppingCart,
  Heart, // Keep Heart for wishlist CTA
  MessageSquare,
  Package,
  CreditCard,
  MapPin,
  Phone,
  DollarSign
} from 'lucide-react';
import { useNavigate } from 'react-router-dom'; // Import useNavigate

const CustomerProfile: React.FC = () => {
  const { user, profile, userRole } = useAuth();
  const navigate = useNavigate();
  const [metrics, setMetrics] = React.useState<any[]>([]);
  const [recentOrders, setRecentOrders] = React.useState<any[]>([]);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    const fetchCustomerData = async () => {
      if (!user) return;

      try {
        setLoading(true);

        // 1. Fetch Orders & Calculate Spent
        const { data: orders, error: ordersError } = await supabase
          .from('orders')
          .select('id, created_at, total_amount, status')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false });

        if (ordersError) throw ordersError;

        const paidOrders = orders?.filter(o => o.status === 'paid') || [];
        const totalSpent = paidOrders.reduce((sum, o) => sum + Number(o.total_amount), 0);
        const activeOrdersCount = orders?.filter(o => ['pending', 'processing', 'shipped'].includes(o.status)).length || 0;

        // 2. Fetch Wishlist Count
        const { count: wishlistCount, error: wishlistError } = await supabase
          .from('wishlists')
          .select('*', { count: 'exact', head: true })
          .eq('user_id', user.id);

        // 3. Fetch Quote Requests Count
        const { count: quotesCount, error: quotesError } = await supabase
          .from('quotes')
          .select('*', { count: 'exact', head: true })
          .eq('user_id', user.id)
          .eq('status', 'pending');

        setMetrics([
          { label: "Active Orders", value: activeOrdersCount.toString(), icon: ShoppingCart, change: "Current state" },
          { label: "Quote Requests", value: (quotesCount || 0).toString(), icon: MessageSquare, change: "Pending" },
          { label: "Total Spent", value: `K${totalSpent.toLocaleString()}`, icon: DollarSign, change: "Lifetime" },
          { label: "Saved Items", value: (wishlistCount || 0).toString(), icon: Package, change: "In wishlist" }
        ]);

        setRecentOrders(orders?.slice(0, 3) || []);

      } catch (error) {
        console.error('Error fetching customer profile data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchCustomerData();
  }, [user]);

  if (loading) {
    return (
      <DashboardLayout userRole={userRole as any} userName={profile?.full_name || user?.email || 'Customer'}>
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout
      userRole={userRole as any}
      userName={profile?.full_name || user?.email || 'Customer'}
      metrics={metrics}
    >
      <div className="space-y-6">
        {/* Customer Profile Header */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-6 w-6 text-primary" />
              Customer Profile
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h3 className="font-semibold mb-2">Personal Information</h3>
                <div className="space-y-2 text-sm">
                  <p><span className="text-muted-foreground">Name:</span> {profile?.full_name || 'Not set'}</p>
                  <p><span className="text-muted-foreground">Email:</span> {user?.email}</p>
                  <p><span className="text-muted-foreground">Phone:</span> {profile?.phone || 'Not set'}</p>
                  <p><span className="text-muted-foreground">Farm/Company:</span> {profile?.company_name || 'Not set'}</p>
                </div>
              </div>

              <div>
                <h3 className="font-semibold mb-2">Account Status</h3>
                <div className="space-y-2">
                  <Badge variant="default" className="mr-2">Verified Customer</Badge>
                  <Badge variant="outline" className="mr-2">Premium Member</Badge>
                  <div className="mt-4">
                    <p className="text-sm text-muted-foreground">Member since: {new Date(profile?.created_at || '').toLocaleDateString()}</p>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Customer Statistics */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {metrics.map((stat) => (
            <Card key={stat.label}>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">{stat.label}</p>
                    <p className="text-2xl font-bold">{stat.value}</p>
                    <p className="text-xs text-muted-foreground">{stat.change}</p>
                  </div>
                  <stat.icon className="h-8 w-8 text-muted-foreground" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Recent Orders */}
        <Card>
          <CardHeader>
            <CardTitle>Recent Orders</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {recentOrders.map((order) => (
                <div key={order.id} className="flex items-center justify-between p-4 bg-muted/30 rounded-lg">
                  <div>
                    <p className="font-medium">{order.id}</p>
                    <p className="text-sm text-muted-foreground">{order.items}</p>
                    <p className="text-xs text-muted-foreground">{order.date}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-primary">{order.total}</p>
                    <Badge
                      variant={order.status === 'Delivered' ? 'default' :
                        order.status === 'Shipped' ? 'secondary' : 'outline'}
                      className="mt-1"
                    >
                      {order.status}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Quick Actions */}
        <Card>
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Button className="h-20 flex-col gap-2" onClick={() => navigate('/catalog')}>
                <ShoppingCart className="h-6 w-6" />
                Browse Catalog
              </Button>
              <Button variant="outline" className="h-20 flex-col gap-2" onClick={() => navigate('/new-quote')}>
                <MessageSquare className="h-6 w-6" />
                Request Quote
              </Button>
              <Button variant="outline" className="h-20 flex-col gap-2" onClick={() => navigate('/orders')}>
                <Package className="h-6 w-6" />
                Track Orders
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Additional CTAs */}
        <Card>
          <CardContent className="p-6 grid grid-cols-1 md:grid-cols-3 gap-4">
            <Button variant="secondary" onClick={() => navigate('/orders')}>View All Orders</Button>
            <Button variant="secondary" onClick={() => navigate('/wishlist')}>View Saved Items/Wishlist</Button>
            <Button variant="secondary" onClick={() => navigate('/dashboard')}>Back to Dashboard</Button>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
};

export default CustomerProfile;