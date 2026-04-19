import React, { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Users,
  Package,
  ShoppingCart,
  DollarSign,
  Activity,
  AlertTriangle,
  Clock,
  RefreshCw
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/integrations/supabase/client';

interface Metrics {
  totalUsers: number;
  activeUsers: number;
  totalProducts: number;
  totalOrders: number;
  revenues: { [currency: string]: number };
  pendingOrders: number;
  lowStockItems: number;
  unreadNotifications: number;
}

interface RealTimeMetricsProps {
  userRole: string;
  className?: string;
}

export const RealTimeMetrics: React.FC<RealTimeMetricsProps> = ({ userRole, className }) => {
  const { user, profile } = useAuth();
  const [metrics, setMetrics] = useState<Metrics>({
    totalUsers: 0,
    activeUsers: 0,
    totalProducts: 0,
    totalOrders: 0,
    revenues: {},
    pendingOrders: 0,
    lowStockItems: 0,
    unreadNotifications: 0
  });
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    fetchMetrics();
    const cleanup = subscribeToUpdates();
    return cleanup;
  }, [userRole, profile?.id, user?.id]);

  const fetchMetrics = async () => {
    try {
      setLoading(true);
      setErrorMessage(null);

      if (userRole === 'admin' || userRole === 'super_admin') {
        // Admin metrics
        const [usersRes, productsRes, ordersRes, revenueRes, inventoryRes] = await Promise.all([
          supabase.from('user_profiles').select('id', { count: 'exact' }),
          supabase.from('products').select('id', { count: 'exact' }),
          supabase.from('orders').select('id, status', { count: 'exact' }),
          supabase.from('payments')
            .select(`
              amount_usd,
              amount_zmw,
              status,
              quote_currency,
              base_currency
            `)
            .in('status', ['paid', 'authorised', 'settled']),
          supabase.from('inventory').select(`
            quantity,
            threshold,
            product:products(
              id,
              name,
              attributes
            )
          `)
        ]);

        const revenues: { [key: string]: number } = {};
        revenueRes.data?.forEach(payment => {
          if (payment.amount_zmw) {
            const curr = payment.quote_currency || 'ZMW';
            revenues[curr] = (revenues[curr] || 0) + Number(payment.amount_zmw);
          } else if (payment.amount_usd) {
            const curr = payment.base_currency || 'USD';
            revenues[curr] = (revenues[curr] || 0) + Number(payment.amount_usd);
          }
        });

        const pendingOrders = ordersRes.data?.filter(o => ['pending', 'pending_payment'].includes(o.status)).length || 0;
        const lowStockItems = (inventoryRes.data || []).filter((row: any) => {
          const attrs = typeof row.product?.attributes === 'object' && row.product?.attributes ? row.product.attributes : {};
          const threshold = Number(row.threshold ?? attrs.min_stock_level ?? 5);
          return Number(row.quantity ?? 0) <= threshold;
        }).length;

        setMetrics({
          totalUsers: usersRes.count || 0,
          activeUsers: usersRes.count || 0,
          totalProducts: productsRes.count || 0,
          totalOrders: ordersRes.count || 0,
          revenues,
          pendingOrders,
          lowStockItems,
          unreadNotifications: 0
        });

      } else if (userRole === 'vendor') {
        // Vendor metrics
        const ownerIds = Array.from(new Set([profile?.id, user?.id].filter(Boolean))) as string[];
        const { data: products, error: productsError } = await supabase
          .from('products')
          .select('id, stock_quantity')
          .in('vendor_id', ownerIds);

        if (productsError) throw productsError;

        const productIds = (products || []).map((product: any) => product.id);
        const [inventoryRes, notificationsRes] = await Promise.all([
          supabase.from('inventory').select(`
            quantity,
            threshold,
            vendor_id,
            product:products(
              id,
              name,
              attributes
            )
          `).in('vendor_id', ownerIds),
          supabase.from('notifications').select('id', { count: 'exact' }).eq('user_id', profile?.id || user?.id).is('read_at', null)
        ]);

        let orderItems: Array<{ order_id: number; quantity: number; price_snapshot: number; product_id: number }> = [];
        if (productIds.length > 0) {
          const { data: orderItemsData, error: orderItemsError } = await supabase
            .from('order_items')
            .select('order_id, quantity, price_snapshot, product_id')
            .in('product_id', productIds);

          if (orderItemsError) throw orderItemsError;
          orderItems = orderItemsData || [];
        }

        const lowStockItems = (inventoryRes.data || []).filter((row: any) => {
          const attrs = typeof row.product?.attributes === 'object' && row.product?.attributes ? row.product.attributes : {};
          const threshold = Number(row.threshold ?? attrs.min_stock_level ?? 5);
          return Number(row.quantity ?? 0) <= threshold;
        }).length;

        const revenues: { [key: string]: number } = {};
        orderItems.forEach((item: any) => {
          // Note: In a real system, we might need a currency field on order_items or join with products
          // For now, assuming products have a base currency
          const curr = item.product?.currency || 'USD';
          revenues[curr] = (revenues[curr] || 0) + (Number(item.price_snapshot || 0) * Number(item.quantity || 0));
        });

        const distinctOrders = new Set(orderItems.map((item) => item.order_id)).size;

        setMetrics({
          totalUsers: 0,
          activeUsers: 0,
          totalProducts: products?.length || 0,
          totalOrders: distinctOrders,
          revenues,
          pendingOrders: 0,
          lowStockItems,
          unreadNotifications: notificationsRes.count || 0
        });

      } else if (userRole === 'customer') {
        // Customer metrics
        const ownerIds = Array.from(new Set([profile?.id, user?.id].filter(Boolean))) as string[];
        const [ordersRes, notificationsRes] = await Promise.all([
          supabase.from('orders').select('id, total_amount, currency, status').in('user_id', ownerIds),
          supabase.from('notifications').select('id', { count: 'exact' }).eq('user_id', profile?.id || user?.id).is('read_at', null)
        ]);

        const revenues: { [key: string]: number } = {};
        ordersRes.data?.forEach(order => {
          const curr = 'ZMW'; // Orders are usually in ZMW for this platform
          revenues[curr] = (revenues[curr] || 0) + Number(order.total_amount || 0);
        });

        const pendingOrders = ordersRes.data?.filter(o => ['pending', 'pending_payment'].includes(o.status)).length || 0;

        setMetrics({
          totalUsers: 0,
          activeUsers: 0,
          totalProducts: 0,
          totalOrders: ordersRes.data?.length || 0,
          revenues,
          pendingOrders,
          lowStockItems: 0,
          unreadNotifications: notificationsRes.count || 0
        });
      }
    } catch (error: any) {
      console.error('Error fetching metrics:', error);
      setErrorMessage(error.message || 'Failed to load metrics');
    } finally {
      setLoading(false);
    }
  };

  const subscribeToUpdates = () => {
    const profileId = profile?.id || user?.id;
    const channels = [];

    // Subscribe to relevant table changes based on role
    if (userRole === 'admin' || userRole === 'super_admin') {
      channels.push(
        supabase.channel('admin-metrics')
          .on('postgres_changes', { event: '*', schema: 'public', table: 'user_profiles' }, fetchMetrics)
          .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, fetchMetrics)
          .on('postgres_changes', { event: '*', schema: 'public', table: 'products' }, fetchMetrics)
          .on('postgres_changes', { event: '*', schema: 'public', table: 'inventory' }, fetchMetrics)
          .subscribe()
      );
    } else if (userRole === 'vendor') {
      if (!profileId) {
        return () => {
          channels.forEach(channel => supabase.removeChannel(channel));
        };
      }

      channels.push(
        supabase.channel('vendor-metrics')
          .on('postgres_changes', {
            event: '*',
            schema: 'public',
            table: 'products',
            filter: `vendor_id=eq.${profileId}`
          }, fetchMetrics)
          .on('postgres_changes', {
            event: '*',
            schema: 'public',
            table: 'inventory',
            filter: `vendor_id=eq.${profileId}`
          }, fetchMetrics)
          .on('postgres_changes', {
            event: '*',
            schema: 'public',
            table: 'order_items'
          }, fetchMetrics)
          .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, fetchMetrics)
          .subscribe()
      );
    } else if (userRole === 'customer') {
      if (!profileId) {
        return () => {
          channels.forEach(channel => supabase.removeChannel(channel));
        };
      }

      channels.push(
        supabase.channel('customer-metrics')
          .on('postgres_changes', {
            event: '*',
            schema: 'public',
            table: 'orders',
            filter: `user_id=eq.${profileId}`
          }, fetchMetrics)
          .on('postgres_changes', {
            event: '*',
            schema: 'public',
            table: 'notifications',
            filter: `user_id=eq.${profileId}`
          }, fetchMetrics)
          .subscribe()
      );
    }

    return () => {
      channels.forEach(channel => supabase.removeChannel(channel));
    };
  };

  const formatRevenue = (revenues: { [key: string]: number }) => {
    const keys = Object.keys(revenues);
    if (keys.length === 0) return '0';
    return keys.map(curr => {
      const symbol = curr === 'ZMW' ? 'K' : curr === 'USD' ? '$' : `${curr} `;
      return `${symbol}${revenues[curr].toLocaleString()}`;
    }).join(' / ');
  };

  const getMetricCards = () => {
    if (userRole === 'admin' || userRole === 'super_admin') {
      return [
        { icon: Users, label: 'Total Users', value: metrics.totalUsers, color: 'text-blue-500' },
        { icon: Package, label: 'Products', value: metrics.totalProducts, color: 'text-green-500' },
        { icon: ShoppingCart, label: 'Orders', value: metrics.totalOrders, color: 'text-purple-500' },
        { icon: DollarSign, label: 'Revenue', value: formatRevenue(metrics.revenues), color: 'text-yellow-500' },
        { icon: AlertTriangle, label: 'Low Stock', value: metrics.lowStockItems, color: 'text-red-500' }
      ];
    } else if (userRole === 'vendor') {
      return [
        { icon: Package, label: 'My Products', value: metrics.totalProducts, color: 'text-green-500' },
        { icon: ShoppingCart, label: 'Orders', value: metrics.totalOrders, color: 'text-blue-500' },
        { icon: DollarSign, label: 'Revenue', value: formatRevenue(metrics.revenues), color: 'text-yellow-500' },
        { icon: AlertTriangle, label: 'Low Stock', value: metrics.lowStockItems, color: 'text-red-500' }
      ];
    } else {
      return [
        { icon: ShoppingCart, label: 'My Orders', value: metrics.totalOrders, color: 'text-blue-500' },
        { icon: DollarSign, label: 'Total Spent', value: formatRevenue(metrics.revenues), color: 'text-green-500' },
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
    <div className={`space-y-4 ${className}`}>
      {errorMessage && (
        <Card className="border-destructive/30 bg-destructive/5">
          <CardContent className="flex flex-col gap-3 p-4 md:flex-row md:items-center md:justify-between">
            <div className="flex items-start gap-3">
              <AlertTriangle className="mt-0.5 h-5 w-5 text-destructive" />
              <div>
                <p className="font-medium text-destructive">Metrics unavailable</p>
                <p className="text-sm text-muted-foreground">{errorMessage}</p>
              </div>
            </div>
            <Button variant="outline" size="sm" onClick={fetchMetrics}>
              <RefreshCw className="mr-2 h-4 w-4" />
              Retry
            </Button>
          </CardContent>
        </Card>
      )}

      <div className={`grid grid-cols-1 md:grid-cols-2 ${userRole === 'admin' || userRole === 'super_admin' ? 'lg:grid-cols-5' : 'lg:grid-cols-4'} gap-6`}>
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
    </div>
  );
};

export default RealTimeMetrics;
