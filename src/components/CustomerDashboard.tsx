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

        // 1. Fetch recent orders
        const { data: orders, error: ordersError } = await supabase
          .from('orders')
          .select('id, order_number, created_at, total_amount, status')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })
          .limit(3);
        if (ordersError) throw ordersError;
        setRecentOrders(orders || []);

        // 2. Fetch Wishlist (Real Data)
        const { data: wishlistData, error: wishlistError } = await supabase
          .from('wishlists')
          .select(`
            id,
            product_id,
            product:products (
              id,
              title,
              price,
              main_image
            )
          `)
          .order('created_at', { ascending: false })
          .limit(5);

        if (wishlistError) {
          console.error('Wishlist fetch error:', wishlistError);
          // fallback to empty if table missing/error
          setWishlist([]);
        } else {
          // Map to flat structure for UI
          const formattedWishlist = wishlistData.map((item: any) => ({
            id: item.id,
            product_id: item.product.id,
            name: item.product.title,
            image: item.product.main_image,
            price: item.product.price
          }));
          setWishlist(formattedWishlist);
        }

        // 3. Recommendations (Newest Products)
        const { data: recommendedItems, error: recommendedError } = await supabase
          .from('products')
          .select('*')
          .eq('active', true)
          .order('created_at', { ascending: false })
          .limit(4);

        if (recommendedError) throw recommendedError;
        setRecommendations(recommendedItems || []);

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
              <ul className="space-y-3">
                {wishlist.map(item => (
                  <li key={item.id} className="flex items-center justify-between border-b border-border/50 pb-2 last:border-0 last:pb-0">
                    <div className="flex items-center gap-3 overflow-hidden">
                      <img
                        src={item.image || '/placeholder.png'}
                        alt={item.name}
                        className="w-10 h-10 rounded object-cover"
                      />
                      <span className="truncate text-sm font-medium">{item.name}</span>
                    </div>
                    <Button variant="ghost" size="icon" className="h-8 w-8 hover:text-primary">
                      <ShoppingCart className="h-4 w-4" />
                    </Button>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-muted-foreground">Your wishlist is empty.</p>
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
              <Link to="/messages"><Heart className="mr-2 h-4 w-4" /> Messages</Link>
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
            <Card key={part.id} className="group overflow-hidden hover:shadow-lg transition-shadow">
              <Link to={`/parts/${part.id}`} className="block">
                <img
                  src={part.main_image || part.images?.[0] || '/placeholder.png'}
                  alt={part.title}
                  className="w-full h-40 object-cover group-hover:scale-105 transition-transform duration-300"
                  loading="lazy"
                />
                <CardContent className="p-4">
                  <h3 className="font-semibold truncate mb-1 text-foreground group-hover:text-primary transition-colors">{part.title}</h3>
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
