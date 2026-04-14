import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { DashboardLayout } from '@/components/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import {
  User,
  ShoppingCart,
  Heart,
  MessageSquare,
  Package,
  CreditCard,
  DollarSign,
  Loader2,
  
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

type RecentOrder = {
  id: number;
  order_number: string;
  created_at: string;
  total_amount: number;
  status: string;
  order_items?: Array<{
    id: number;
    quantity: number;
    products?: {
      name: string;
      main_image: string | null;
    } | null;
  }>;
};

const CustomerProfile: React.FC = () => {
  const { user, profile, userRole, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [recentOrders, setRecentOrders] = useState<RecentOrder[]>([]);
  const [wishlistCount, setWishlistCount] = useState(0);
  const [activeQuotesCount, setActiveQuotesCount] = useState(0);

  useEffect(() => {
    const fetchProfileData = async () => {
      if (!user) {
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        const ownerIds = Array.from(new Set([profile?.id, user.id].filter(Boolean))) as string[];
        const ownerId = profile?.id || user.id;

        const [ordersRes, wishlistRes, quoteRes] = await Promise.all([
          supabase
            .from('orders')
            .select(`
              id,
              order_number,
              created_at,
              total_amount,
              status,
              order_items (
                id,
                quantity,
                products (
                  name,
                  main_image
                )
              )
            `)
            .in('user_id', ownerIds)
            .order('created_at', { ascending: false })
            .limit(5),
          supabase
            .from('wishlists')
            .select('id')
            .eq('user_id', ownerId),
          supabase
            .from('quotes')
            .select('id')
            .or(`user_id.eq.${ownerId},client_id.eq.${ownerId}`)
        ]);

        if (ordersRes.error) throw ordersRes.error;
        if (wishlistRes.error) throw wishlistRes.error;
        if (quoteRes.error) throw quoteRes.error;

        setRecentOrders((ordersRes.data || []) as RecentOrder[]);
        setWishlistCount(wishlistRes.data?.length || 0);
        setActiveQuotesCount(quoteRes.data?.length || 0);
      } catch (error: any) {
        console.error('Error loading customer profile data:', error);
        toast.error(error.message || 'Failed to load customer profile data');
      } finally {
        setLoading(false);
      }
    };

    fetchProfileData();
  }, [user, profile?.id]);

  const totalOrders = recentOrders.length;
  const totalSpent = recentOrders.reduce((sum, order) => sum + Number(order.total_amount || 0), 0);

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <Card className="w-full max-w-md">
          <CardContent className="p-6 text-center">
            <h2 className="text-xl font-semibold mb-4">Please log in</h2>
            <p className="text-muted-foreground mb-6">You need to be logged in to view your profile.</p>
            <Button onClick={() => navigate('/login')}>
              Go to Login
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (authLoading || loading) {
    return (
      <DashboardLayout userRole={userRole as any} userName={profile?.full_name || user?.email || 'Customer'}>
        <div className="flex justify-center items-center h-96">
          <div className="text-center">
            <Loader2 className="h-12 w-12 mx-auto animate-spin text-primary mb-4" />
            <h2 className="text-xl font-semibold">Loading profile...</h2>
            <p className="text-muted-foreground">Please wait while we fetch your latest account data.</p>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout userRole={userRole as any} userName={profile?.full_name || user?.email || 'Customer'}>
      <div className="space-y-6">
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
                  <Badge variant="outline" className="mr-2">Active Account</Badge>
                  <div className="mt-4">
                    <p className="text-sm text-muted-foreground">
                      Member since: {profile?.created_at ? new Date(profile.created_at).toLocaleDateString() : 'Unknown'}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[
            { icon: ShoppingCart, label: 'Total Orders', value: totalOrders.toString(), change: 'Live order history' },
            { icon: DollarSign, label: 'Total Spent', value: `$${totalSpent.toLocaleString()}`, change: 'From recent orders' },
            { icon: Heart, label: 'Saved Items', value: wishlistCount.toString(), change: 'Wishlist entries' },
            { icon: MessageSquare, label: 'Active Quotes', value: activeQuotesCount.toString(), change: 'Awaiting responses' }
          ].map((stat) => (
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

        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Recent Orders</CardTitle>
            <Button variant="outline" size="sm" onClick={() => navigate('/orders')}>
              View All Orders
            </Button>
          </CardHeader>
          <CardContent>
            {recentOrders.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                You have no recent orders yet.
              </div>
            ) : (
              <div className="space-y-4">
                {recentOrders.map((order) => {
                  const firstItem = order.order_items?.[0];
                  const itemName = firstItem?.products?.name || 'Order items';

                  return (
                    <div key={order.id} className="flex items-center justify-between gap-4 rounded-lg border p-4">
                      <div>
                        <p className="font-medium">{order.order_number}</p>
                        <p className="text-sm text-muted-foreground">{itemName}</p>
                        <p className="text-xs text-muted-foreground">
                          {formatDistanceToNow(new Date(order.created_at), { addSuffix: true })}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-primary">${Number(order.total_amount || 0).toLocaleString()}</p>
                        <Badge
                          variant={order.status === 'completed' ? 'default' : order.status === 'processing' ? 'secondary' : 'outline'}
                          className="mt-1 capitalize"
                        >
                          {order.status}
                        </Badge>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
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
              <Button variant="outline" className="h-20 flex-col gap-2" onClick={() => navigate('/payment-methods')}>
                <CreditCard className="h-6 w-6" />
                Payment Methods
              </Button>
            </div>
          </CardContent>
        </Card>

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
