import React, { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';
import { ShoppingCart, Heart, RefreshCw, Star } from 'lucide-react';

const CustomerDashboard = () => {
  const { user } = useAuth();
  const [recentOrders, setRecentOrders] = useState<any[]>([]);
  const [wishlist, setWishlist] = useState<any[]>([]);
  const [recommendations, setRecommendations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      if (!user) return;

      try {
        setLoading(true);
        // In a real app, you would have an edge function to get all this data in one go.
        // For now, we'll simulate it with separate calls.

        // Fetch recent orders
        const { data: orders, error: ordersError } = await supabase
          .from('orders')
          .select('id, order_number, created_at, total_amount, status')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })
          .limit(3);
        if (ordersError) throw ordersError;
        setRecentOrders(orders);

        // Fetch wishlist (placeholder)
        const { data: wishlistItems, error: wishlistError } = await supabase
          .from('spare_parts')
          .select('*')
          .limit(3);
        if (wishlistError) throw wishlistError;
        setWishlist(wishlistItems);

        // Fetch recommendations (placeholder)
        const { data: recommendedItems, error: recommendedError } = await supabase
          .from('spare_parts')
          .select('*')
          .order('created_at', { ascending: false })
          .limit(4);
        if (recommendedError) throw recommendedError;
        setRecommendations(recommendedItems);

      } catch (error: any) {
        console.error('Error fetching customer dashboard data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [user]);

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <h2 className="text-2xl font-bold mb-4">Loading your dashboard...</h2>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">Welcome back, {user?.user_metadata.full_name || 'Customer'}!</h1>
        <p className="text-muted-foreground">Here's a quick overview of your account.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* Recent Orders */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              Recent Orders
              <Link to="/orders">
                <Button variant="link">View All</Button>
              </Link>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {recentOrders.length > 0 ? (
              <ul className="space-y-4">
                {recentOrders.map(order => (
                  <li key={order.id} className="flex justify-between items-center">
                    <div>
                      <p className="font-semibold">{order.order_number}</p>
                      <p className="text-sm text-muted-foreground">{new Date(order.created_at).toLocaleDateString()}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-bold">${order.total_amount.toLocaleString()}</p>
                      <p className="text-sm capitalize">{order.status}</p>
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <p>You have no recent orders.</p>
            )}
          </CardContent>
        </Card>

        {/* Wishlist */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              Your Wishlist
              <Link to="/wishlist">
                <Button variant="link">View All</Button>
              </Link>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {wishlist.length > 0 ? (
              <ul className="space-y-2">
                {wishlist.map(item => (
                  <li key={item.id} className="flex items-center justify-between">
                    <span className="truncate">{item.name}</span>
                    <Button variant="ghost" size="sm"><ShoppingCart className="h-4 w-4" /></Button>
                  </li>
                ))}
              </ul>
            ) : (
              <p>Your wishlist is empty.</p>
            )}
          </CardContent>
        </Card>

        {/* Quick Actions */}
        <Card>
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-2 gap-4">
            <Button asChild variant="outline">
              <Link to="/catalog"><ShoppingCart className="mr-2 h-4 w-4" /> New Order</Link>
            </Button>
            <Button asChild variant="outline">
              <Link to="/quotes"><Heart className="mr-2 h-4 w-4" /> My Quotes</Link>
            </Button>
            <Button asChild variant="outline">
              <Link to="/orders"><RefreshCw className="mr-2 h-4 w-4" /> Track Orders</Link>
            </Button>
            <Button asChild variant="outline">
              <Link to="/profile"><Star className="mr-2 h-4 w-4" /> My Profile</Link>
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Recommended Products */}
      <div className="mt-12">
        <h2 className="text-2xl font-bold mb-4">Recommended for You</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {recommendations.map(part => (
            <Card key={part.id} className="group overflow-hidden">
              <Link to={`/parts/${part.id}`} className="block">
                <img src={part.images[0] || '/api/placeholder/300/200'} alt={part.name} className="w-full h-40 object-cover" loading="lazy" />
                <CardContent className="p-4">
                  <h3 className="font-semibold truncate">{part.name}</h3>
                  <p className="text-lg font-bold text-primary">${part.price.toLocaleString()}</p>
                </CardContent>
              </Link>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
};

export default CustomerDashboard;
