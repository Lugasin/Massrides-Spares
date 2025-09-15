import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  TrendingUp, 
  TrendingDown, 
  Users, 
  Package, 
  ShoppingCart,
  DollarSign,
  Activity,
  AlertTriangle
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/integrations/supabase/client';

interface Metrics {
  totalUsers: number;
  activeUsers: number;
  totalProducts: number;
  totalOrders: number;
  totalRevenue: number;
  pendingOrders: number;
  lowStockItems: number;
  unreadNotifications: number;
}

interface RealTimeMetricsProps {
  userRole: string;
  className?: string;
}

export const RealTimeMetrics: React.FC<RealTimeMetricsProps> = ({ userRole, className }) => {
  const { profile } = useAuth();
  const [metrics, setMetrics] = useState<Metrics>({
    totalUsers: 0,
    activeUsers: 0,
    totalProducts: 0,
    totalOrders: 0,
    totalRevenue: 0,
    pendingOrders: 0,
    lowStockItems: 0,
    unreadNotifications: 0
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchMetrics();
    subscribeToUpdates();
  }, [userRole, profile]);

  const fetchMetrics = async () => {
    try {
      setLoading(true);
      
      if (userRole === 'admin' || userRole === 'super_admin') {
        // Admin metrics
        const [usersRes, productsRes, ordersRes, revenueRes] = await Promise.all([
          supabase.from('user_profiles').select('id', { count: 'exact' }),
          supabase.from('spare_parts').select('id', { count: 'exact' }),
          supabase.from('orders').select('id, total_amount, status'),
          supabase.from('orders').select('total_amount').eq('payment_status', 'paid')
        ]);

        const totalRevenue = revenueRes.data?.reduce((sum, order) => sum + order.total_amount, 0) || 0;
        const pendingOrders = ordersRes.data?.filter(o => o.status === 'pending').length || 0;

        setMetrics({
          totalUsers: usersRes.count || 0,
          activeUsers: usersRes.count || 0, // TODO: Add last_active_at tracking
          totalProducts: productsRes.count || 0,
          totalOrders: ordersRes.count || 0,
          totalRevenue,
          pendingOrders,
          lowStockItems: 0, // TODO: Add low stock query
          unreadNotifications: 0
        });

      } else if (userRole === 'vendor') {
        // Vendor metrics
        const [productsRes, ordersRes, notificationsRes] = await Promise.all([
          supabase.from('spare_parts').select('id, stock_quantity, min_stock_level').eq('vendor_id', profile?.id),
          supabase.from('order_items').select('*, order:orders(*)').in('spare_part_id', 
            supabase.from('spare_parts').select('id').eq('vendor_id', profile?.id)
          ),
          supabase.from('notifications').select('id', { count: 'exact' }).eq('user_id', profile?.id).is('read_at', null)
        ]);

        const lowStockItems = productsRes.data?.filter(p => p.stock_quantity <= (p.min_stock_level || 5)).length || 0;
        const vendorRevenue = ordersRes.data?.reduce((sum, item) => sum + (item.unit_price * item.quantity), 0) || 0;

        setMetrics({
          totalUsers: 0,
          activeUsers: 0,
          totalProducts: productsRes.data?.length || 0,
          totalOrders: ordersRes.data?.length || 0,
          totalRevenue: vendorRevenue,
          pendingOrders: 0,
          lowStockItems,
          unreadNotifications: notificationsRes.count || 0
        });

      } else if (userRole === 'customer') {
        // Customer metrics
        const [ordersRes, notificationsRes] = await Promise.all([
          supabase.from('orders').select('id, total_amount, status').eq('user_id', profile?.id),
          supabase.from('notifications').select('id', { count: 'exact' }).eq('user_id', profile?.id).is('read_at', null)
        ]);

        const totalSpent = ordersRes.data?.reduce((sum, order) => sum + order.total_amount, 0) || 0;
        const pendingOrders = ordersRes.data?.filter(o => o.status === 'pending').length || 0;

        setMetrics({
          totalUsers: 0,
          activeUsers: 0,
          totalProducts: 0,
          totalOrders: ordersRes.data?.length || 0,
          totalRevenue: totalSpent,
          pendingOrders,
          lowStockItems: 0,
          unreadNotifications: notificationsRes.count || 0
        });
      }
    } catch (error: any) {
      console.error('Error fetching metrics:', error);
    } finally {
      setLoading(false);
    }
  };

  const subscribeToUpdates = () => {
    const channels = [];

    // Subscribe to relevant table changes based on role
    if (userRole === 'admin' || userRole === 'super_admin') {
      channels.push(
        supabase.channel('admin-metrics')
          .on('postgres_changes', { event: '*', schema: 'public', table: 'user_profiles' }, fetchMetrics)
          .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, fetchMetrics)
          .on('postgres_changes', { event: '*', schema: 'public', table: 'spare_parts' }, fetchMetrics)
          .subscribe()
      );
    } else if (userRole === 'vendor') {
      channels.push(
        supabase.channel('vendor-metrics')
          .on('postgres_changes', { 
            event: '*', 
            schema: 'public', 
            table: 'spare_parts',
            filter: `vendor_id=eq.${profile?.id}`
          }, fetchMetrics)
          .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, fetchMetrics)
          .subscribe()
      );
    } else if (userRole === 'customer') {
      channels.push(
        supabase.channel('customer-metrics')
          .on('postgres_changes', { 
            event: '*', 
            schema: 'public', 
            table: 'orders',
            filter: `user_id=eq.${profile?.id}`
          }, fetchMetrics)
          .on('postgres_changes', { 
            event: '*', 
            schema: 'public', 
            table: 'notifications',
            filter: `user_id=eq.${profile?.id}`
          }, fetchMetrics)
          .subscribe()
      );
    }

    return () => {
      channels.forEach(channel => supabase.removeChannel(channel));
    };
  };

  const getMetricCards = () => {
    if (userRole === 'admin' || userRole === 'super_admin') {
      return [
        { icon: Users, label: 'Total Users', value: metrics.totalUsers, color: 'text-blue-500' },
        { icon: Package, label: 'Products', value: metrics.totalProducts, color: 'text-green-500' },
        { icon: ShoppingCart, label: 'Orders', value: metrics.totalOrders, color: 'text-purple-500' },
        { icon: DollarSign, label: 'Revenue', value: `$${metrics.totalRevenue.toLocaleString()}`, color: 'text-yellow-500' }
      ];
    } else if (userRole === 'vendor') {
      return [
        { icon: Package, label: 'My Products', value: metrics.totalProducts, color: 'text-green-500' },
        { icon: ShoppingCart, label: 'Orders', value: metrics.totalOrders, color: 'text-blue-500' },
        { icon: DollarSign, label: 'Revenue', value: `$${metrics.totalRevenue.toLocaleString()}`, color: 'text-yellow-500' },
        { icon: AlertTriangle, label: 'Low Stock', value: metrics.lowStockItems, color: 'text-red-500' }
      ];
    } else {
      return [
        { icon: ShoppingCart, label: 'My Orders', value: metrics.totalOrders, color: 'text-blue-500' },
        { icon: DollarSign, label: 'Total Spent', value: `$${metrics.totalRevenue.toLocaleString()}`, color: 'text-green-500' },
        { icon: Clock, label: 'Pending', value: metrics.pendingOrders, color: 'text-yellow-500' },
        { icon: Activity, label: 'Notifications', value: metrics.unreadNotifications, color: 'text-purple-500' }
      ];
    }
  };

  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {[...Array(4)].map((_, i) => (
          <Card key={i}>
            <CardContent className="p-6">
              <div className="animate-pulse">
                <div className="h-4 bg-muted rounded w-1/2 mb-2"></div>
                <div className="h-8 bg-muted rounded w-3/4"></div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className={`grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 ${className}`}>
      {getMetricCards().map((metric, index) => (
        <Card key={index}>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">{metric.label}</p>
                <p className="text-2xl font-bold">{metric.value}</p>
              </div>
              <metric.icon className={`h-8 w-8 ${metric.color}`} />
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
};

export default RealTimeMetrics;