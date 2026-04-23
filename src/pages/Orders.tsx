import React, { useCallback, useState, useEffect } from 'react';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { DashboardLayout } from '@/components/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import {
  Package,
  Search,
  Eye,
  Download,
  Truck,
  Calendar,
  DollarSign
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useSettings } from '@/context/SettingsContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { formatDistanceToNow } from 'date-fns';
import { useQuote } from '@/context/QuoteContext';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  formatFxAmount,
  formatFxRateLabel,
  formatFxSourceLabel,
  getPaymentFxSummary,
} from '@/lib/paymentFx';

interface Order {
  id: string;
  order_number: string;
  status: string;
  payment_status: string;
  total_amount: number;
  created_at: string;
  updated_at: string;
  user_id: string;
  vendor_id: string | null;
  shipping_address: OrderAddress | null;
  billing_address: OrderAddress | null;
  customer_name?: string | null;
  customer_email?: string | null;
  customer_phone?: string | null;
  guest_email?: string;
  payment?: {
    id: number;
    provider: string | null;
    status: string | null;
    created_at: string | null;
    completed_at: string | null;
    vesicash_payment_id: string | null;
    vesicash_transaction_id: string | null;
    base_currency: string | null;
    quote_currency: string | null;
    exchange_rate: number | null;
    fx_rate_provider: string | null;
    fx_rate_source: string | null;
    fx_rate_fetched_at: string | null;
    fx_rate_locked_at: string | null;
    amount_usd: number | null;
    amount_zmw: number | null;
    fx_rate_payload: Record<string, unknown> | null;
  } | null;
  order_items: Array<{
    id: number;
    quantity: number;
    unit_price: number;
    products: {
      name: string;
      main_image: string | null;
    } | null;
  }>;
}

interface OrderAddress {
  firstName?: string;
  lastName?: string;
  full_name?: string;
  email?: string;
  phone?: string;
  company?: string;
  address?: string;
  city?: string;
  state?: string;
  zipCode?: string;
  country?: string;
}

interface CustomerProfileRecord {
  full_name: string | null;
  email: string | null;
  phone: string | null;
}

const normaliseOrderStatus = (status: string) => {
  if (status === 'completed') return 'delivered';
  return status;
};

const Orders = () => {
  const { user, profile, userRole, session, ready } = useAuth();
  const { formatCurrency } = useSettings();
  const { itemCount } = useQuote();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const layoutRole =
    userRole === 'super_admin' ||
    userRole === 'admin' ||
    userRole === 'vendor' ||
    userRole === 'customer'
      ? userRole
      : 'guest';

  const fetchOrders = useCallback(async () => {
    try {
      setLoading(true);
      if ((userRole === 'vendor' || userRole === 'customer') && !profile?.id) {
        throw new Error('User profile not found');
      }

      let ordersQuery = supabase
        .from('orders')
        .select(`
          id,
          order_number,
          created_at,
          payment_status,
          shipping_address,
          billing_address,
          status,
          total_amount,
          user_id,
          vendor_id,
          payment:payments (
            id,
            provider,
            status,
            created_at,
            completed_at,
            vesicash_payment_id,
            vesicash_transaction_id,
            base_currency,
            quote_currency,
            exchange_rate,
            fx_rate_provider,
            fx_rate_source,
            fx_rate_fetched_at,
            fx_rate_locked_at,
            amount_usd,
            amount_zmw,
            fx_rate_payload
          ),
          order_items (
            id,
            quantity,
            unit_price,
            products (
              title,
              images
            )
          )
        `)
        .order('created_at', { ascending: false });

      if (userRole === 'vendor' && profile?.id) {
        ordersQuery = ordersQuery.eq('vendor_id', profile.id);
      } else if (userRole === 'customer' && profile?.id) {
        ordersQuery = ordersQuery.eq('user_id', profile.id);
      }

      const { data, error } = await ordersQuery;
      if (error) throw error;

      const orderRows = (data || []) as any[]; // Cast to any first to bypass stale generated type mismatches
      const customerIds = Array.from(new Set(orderRows.map((order) => order.user_id).filter(Boolean) as string[]));
      const customerMap = new Map<string, CustomerProfileRecord>();

      if (customerIds.length > 0) {
        const { data: customerProfiles, error: customerError } = await supabase
          .from('user_profiles')
          .select('id, user_id, full_name, email, phone')
          .in('id', customerIds);

        if (customerError) throw customerError;

        (customerProfiles || []).forEach((profileRow: any) => {
          const record: CustomerProfileRecord = {
            full_name: profileRow.full_name ?? null,
            email: profileRow.email ?? null,
            phone: profileRow.phone ?? null,
          };

          if (profileRow.id) {
            customerMap.set(String(profileRow.id), record);
          }
          if (profileRow.user_id) {
            customerMap.set(String(profileRow.user_id), record);
          }
        });

        const missingIds = customerIds.filter((customerId) => !customerMap.has(customerId));
        if (missingIds.length > 0) {
          const { data: fallbackProfiles, error: fallbackError } = await supabase
            .from('user_profiles')
            .select('id, user_id, full_name, email, phone')
            .in('user_id', missingIds);

          if (fallbackError) throw fallbackError;

          (fallbackProfiles || []).forEach((profileRow: any) => {
            const record: CustomerProfileRecord = {
              full_name: profileRow.full_name ?? null,
              email: profileRow.email ?? null,
              phone: profileRow.phone ?? null,
            };

            if (profileRow.id) {
              customerMap.set(String(profileRow.id), record);
            }
            if (profileRow.user_id) {
              customerMap.set(String(profileRow.user_id), record);
            }
          });
        }
      }

      setOrders(orderRows.map((order) => {
        const shippingAddress = (order.shipping_address || {}) as OrderAddress;
        const billingAddress = (order.billing_address || {}) as OrderAddress;
        const customerProfile = order.user_id ? customerMap.get(String(order.user_id)) ?? null : null;
        const firstName = billingAddress.firstName || shippingAddress.firstName || '';
        const lastName = billingAddress.lastName || shippingAddress.lastName || '';
        const customerName = billingAddress.full_name
          || customerProfile?.full_name
          || `${firstName} ${lastName}`.trim()
          || null;
        const customerEmail = billingAddress.email || shippingAddress.email || customerProfile?.email || null;
        const customerPhone = billingAddress.phone || shippingAddress.phone || customerProfile?.phone || null;

        return {
          id: String(order.id),
          user_id: order.user_id,
          vendor_id: order.vendor_id,
          order_number: order.order_number,
          status: order.status,
          payment_status: order.payment_status,
          total_amount: Number(order.total_amount || 0),
          created_at: order.created_at,
          updated_at: order.created_at,
          shipping_address: shippingAddress,
          billing_address: billingAddress,
          customer_name: customerName,
          customer_email: customerEmail,
          customer_phone: customerPhone,
          guest_email: customerEmail,
          payment: order.payment ? {
            id: order.payment.id,
            provider: order.payment.provider,
            status: order.payment.status,
            created_at: order.payment.created_at,
            completed_at: order.payment.completed_at,
            vesicash_payment_id: order.payment.vesicash_payment_id,
            vesicash_transaction_id: order.payment.vesicash_transaction_id,
            base_currency: order.payment.base_currency,
            quote_currency: order.payment.quote_currency,
            exchange_rate: order.payment.exchange_rate,
            fx_rate_provider: order.payment.fx_rate_provider,
            fx_rate_source: order.payment.fx_rate_source,
            fx_rate_fetched_at: order.payment.fx_rate_fetched_at,
            fx_rate_locked_at: order.payment.fx_rate_locked_at,
            amount_usd: order.payment.amount_usd,
            amount_zmw: order.payment.amount_zmw,
            fx_rate_payload: order.payment.fx_rate_payload,
          } : null,
          order_items: (order.order_items || []).map((item) => ({
            id: item.id,
            quantity: item.quantity,
            unit_price: Number(item.unit_price || 0),
            products: item.products
              ? {
                  name: item.products.title || 'Unknown item',
                  main_image:
                    Array.isArray(item.products.images) &&
                    item.products.images.length > 0 &&
                    typeof item.products.images[0] === 'string'
                      ? item.products.images[0]
                      : null,
                }
              : null,
          })),
        };
      }));
    } catch (error: unknown) {
      console.error('Error fetching orders:', error);
      toast.error(`Failed to load orders: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setLoading(false);
    }
  }, [profile?.id, userRole]);

  const subscribeToOrders = useCallback(() => {
    const channel = supabase
      .channel('orders-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'orders'
        },
        () => {
          fetchOrders();
        }
      )
      .subscribe();

    return () => supabase.removeChannel(channel);
  }, [fetchOrders]);

  const handleSyncStatus = async (orderId: string) => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('get-order-payment-status', {
        body: { orderId: Number(orderId) },
        headers: {
          Authorization: 'Bearer ' + session?.access_token
        }
      });

      if (error) throw error;
      
      toast.success('Status synced with provider');
      fetchOrders();
      // Update selected order view if open
      if (selectedOrder && selectedOrder.id === orderId) {
         const { data: updatedOrder } = await supabase
          .from('orders')
          .select('*, payment:payments(*)')
          .eq('id', orderId)
          .single();
         if (updatedOrder) setSelectedOrder(updatedOrder as any);
      }
    } catch (error: any) {
      console.error('Error syncing order status:', error);
      toast.error('Sync failed: ' + (error.message || 'Unknown error'));
    } finally {
      setLoading(false);
    }
  };
  const handleUpdateStatus = async (orderId: string, status: string) => {
    try {
      if ((userRole !== 'super_admin' && userRole !== 'admin')) {
        throw new Error('Only super admins can update order status.');
      }

      if (!session?.access_token) {
        throw new Error('No active session available for order update');
      }

      const { error } = await supabase.functions.invoke('update-order-status', {
        body: { orderId, status },
        headers: {
          Authorization: `Bearer ${session.access_token}`
        }
      });

      if (error) throw new Error(error.message);

      toast.success(`Order status updated to ${status}`);
      fetchOrders();
    } catch (error: unknown) {
      console.error('Error updating order status:', error);
      toast.error(`Failed to update order status: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  useEffect(() => {
    const initialize = async () => {
      if (ready) {
        await fetchOrders();
        // Return unsubscribe from the sync wrapper if needed, 
        // but here we just call the functions.
        subscribeToOrders();
      }
    };
    initialize();
  }, [fetchOrders, ready, subscribeToOrders]);

  const getStatusColor = (status: string) => {
    switch (normaliseOrderStatus(status)) {
      case 'delivered': return 'default';
      case 'processing': return 'secondary';
      case 'shipped': return 'outline';
      case 'cancelled': return 'destructive';
      default: return 'outline';
    }
  };

  const getPaymentStatusColor = (status: string) => {
    switch (status) {
      case 'paid': return 'default';
      case 'processing': return 'secondary';
      case 'pending': return 'secondary';
      case 'failed': return 'destructive';
      default: return 'outline';
    }
  };

  const filteredOrders = React.useMemo(() => {
    return orders.filter(order => {
      const matchesSearch = !searchTerm ||
        order.order_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
        order.guest_email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        order.customer_email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        order.customer_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        order.customer_phone?.toLowerCase().includes(searchTerm.toLowerCase());

      const matchesStatus = statusFilter === 'all' || order.status === statusFilter;
      const matchesNormalisedStatus = statusFilter === 'all' || normaliseOrderStatus(order.status) === statusFilter;

      return matchesSearch && (matchesStatus || matchesNormalisedStatus);
    });
  }, [orders, searchTerm, statusFilter]);

  const selectedOrderFx = selectedOrder ? getPaymentFxSummary(selectedOrder.payment ?? null) : null;

  if (!user && userRole !== 'guest') {
    return (
      <div className="min-h-screen bg-background">
        <Header cartItemsCount={itemCount} />
        <main className="container mx-auto px-4 py-8">
          <div className="text-center py-16">
            <Package className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
            <h1 className="text-2xl font-bold mb-4">Please Log In</h1>
            <p className="text-muted-foreground mb-8">
              You need to be logged in to view your orders.
            </p>
            <Button onClick={() => window.location.href = '/login'}>
              Go to Login
            </Button>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <DashboardLayout userRole={layoutRole} userName={profile?.full_name || user?.email || 'User'} showMetrics={false}>
      <div className="space-y-6">
        {/* Orders Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Orders</h1>
            <p className="text-muted-foreground">Manage and track your orders</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline">
              <Download className="h-4 w-4 mr-2" />
              Export
            </Button>
          </div>
        </div>

        {/* Order Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Total Orders</p>
                  <p className="text-2xl font-bold">{orders.length}</p>
                </div>
                <Package className="h-8 w-8 text-primary" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Completed</p>
                  <p className="text-2xl font-bold text-success">
                    {orders.filter(o => o.status === 'completed').length}
                  </p>
                </div>
                <Truck className="h-8 w-8 text-success" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Processing</p>
                  <p className="text-2xl font-bold text-yellow-500">
                    {orders.filter(o => o.status === 'processing').length}
                  </p>
                </div>
                <Calendar className="h-8 w-8 text-yellow-500" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Paid Revenue (Success Only)</p>
                  <p className="text-2xl font-bold text-primary">
                    {formatCurrency(orders.filter(o => o.payment_status === "paid").reduce((sum, o) => sum + o.total_amount, 0))}
                  </p>
                </div>
                <DollarSign className="h-8 w-8 text-primary" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Orders Table */}
        <Card>
          <CardHeader>
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <CardTitle>Order History</CardTitle>
              <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
                <div className="relative w-full sm:w-64">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search orders..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-full sm:w-[180px]">
                    <SelectValue placeholder="All Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="pending_payment">Pending Payment</SelectItem>
                    <SelectItem value="processing">Processing</SelectItem>
                    <SelectItem value="shipped">Shipped</SelectItem>
                    <SelectItem value="delivered">Delivered</SelectItem>
                    <SelectItem value="cancelled">Cancelled</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
                <p className="text-muted-foreground">Loading orders...</p>
              </div>
            ) : filteredOrders.length === 0 ? (
              <div className="text-center py-12">
                <Package className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                <h3 className="text-lg font-medium mb-2">No orders found</h3>
                <p className="text-muted-foreground mb-6">
                  {searchTerm || statusFilter !== 'all'
                    ? 'Try adjusting your search or filters.'
                    : 'You haven\'t placed any orders yet.'}
                </p>
                <Button onClick={() => window.location.href = '/catalog'}>
                  Browse Parts
                </Button>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Order #</TableHead>
                      <TableHead>Customer</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Payment</TableHead>
                      <TableHead>Total</TableHead>
                      <TableHead>Items</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredOrders.map((order) => (
                      <TableRow key={order.id}>
                        <TableCell className="font-medium">
                          <div className="space-y-1">
                            <p>{order.order_number}</p>
                            <p className="text-xs text-muted-foreground">ID: {order.id.slice(0, 8)}</p>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="space-y-1">
                            <p className="font-medium">{order.customer_name || 'Customer'}</p>
                            <p className="text-xs text-muted-foreground">{order.customer_email || order.guest_email || 'No email recorded'}</p>
                            {order.customer_phone && (
                              <p className="text-xs text-muted-foreground">{order.customer_phone}</p>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          {new Date(order.created_at).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })}
                        </TableCell>
                        <TableCell>
                          <Badge variant={getStatusColor(order.status)} className="capitalize">
                            {normaliseOrderStatus(order.status)}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant={getPaymentStatusColor(order.payment_status)} className="capitalize">{order.payment_status}</Badge>
                            {order.payment?.vesicash_transaction_id && <p className="text-[10px] text-muted-foreground mt-1">Ref: {order.payment.vesicash_transaction_id}</p>}
                        </TableCell>
                        <TableCell className="font-medium">
                          {formatCurrency(order.total_amount)}
                        </TableCell>
                        <TableCell>
                          {order.order_items?.length || 0} items
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => setSelectedOrder(order)}
                            >
                              <Eye className="h-4 w-4 mr-1" />
                              View
                            </Button>
                            {userRole === 'super_admin' && (
                              <Select
                                value={order.status}
                                onValueChange={(newStatus) => handleUpdateStatus(order.id, newStatus)}
                              >
                                <SelectTrigger className="w-32">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="pending">Pending</SelectItem>
                                  <SelectItem value="processing">Processing</SelectItem>
                                  <SelectItem value="shipped">Shipped</SelectItem>
                                  <SelectItem value="delivered">Delivered</SelectItem>
                                  <SelectItem value="cancelled">Cancelled</SelectItem>
                                </SelectContent>
                              </Select>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Order Details Modal */}
        {selectedOrder && (
          <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm">
            <div className="fixed right-0 top-0 h-full w-full max-w-2xl bg-background border-l shadow-xl overflow-y-auto">
              <div className="p-6">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-2xl font-bold">Order Details</h2>
                  <Button variant="ghost" onClick={() => setSelectedOrder(null)}>
                    Close
                  </Button>
                </div>

                <div className="space-y-6">
                  {/* Order Info */}
                  <Card>
                    <CardContent className="p-4">
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <p className="text-muted-foreground">Order ID</p>
                          <p className="font-medium font-mono text-xs break-all">{selectedOrder.id}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Order Number</p>
                          <p className="font-medium">{selectedOrder.order_number}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Date</p>
                          <p className="font-medium">
                            {new Date(selectedOrder.created_at).toLocaleDateString()}
                          </p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Status</p>
                          <Badge variant={getStatusColor(selectedOrder.status)} className="capitalize">
                            {normaliseOrderStatus(selectedOrder.status)}
                          </Badge>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Payment</p>
                          <Badge variant={getPaymentStatusColor(selectedOrder.payment_status)} className="capitalize">
                            {selectedOrder.payment_status}
                          </Badge>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Customer</p>
                          <p className="font-medium">{selectedOrder.customer_name || 'Customer'}</p>
                          <p className="text-xs text-muted-foreground">{selectedOrder.customer_email || selectedOrder.guest_email || 'No email recorded'}</p>
                          {selectedOrder.customer_phone && (
                            <p className="text-xs text-muted-foreground">{selectedOrder.customer_phone}</p>
                          )}
                        </div>
                      </div>
                      <div className="mt-4">
                        <Button 
                          variant="outline" 
                          size="sm" 
                          className="w-full" 
                          onClick={() => handleSyncStatus(selectedOrder.id)}
                          disabled={loading}
                        >
                          <RefreshCw className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`} />
                          Sync with Vesicash
                        </Button>
                      </div>
                    </CardContent>
                  </Card>

                  {(selectedOrder.payment || selectedOrderFx || ['paid', 'processing', 'authorised'].includes(selectedOrder.payment_status)) && (
                    <Card>
                      <CardHeader>
                        <CardTitle>Payment FX Snapshot</CardTitle>
                      </CardHeader>
                      <CardContent>
                        {selectedOrderFx ? (
                          <div className="grid grid-cols-1 gap-4 text-sm sm:grid-cols-2">
                            <div>
                              <p className="text-muted-foreground">Payment reference</p>
                              <p className="font-medium font-mono text-xs break-all">
                                {selectedOrder.payment?.vesicash_transaction_id || selectedOrder.payment?.vesicash_payment_id || 'N/A'}
                              </p>
                            </div>
                            <div>
                              <p className="text-muted-foreground">Payment provider</p>
                              <p className="font-medium">{selectedOrder.payment?.provider || 'Vesicash'}</p>
                            </div>
                            <div>
                              <p className="text-muted-foreground">Base amount (USD)</p>
                              <p className="font-medium">{formatFxAmount(selectedOrderFx.amountUsd, 'USD')}</p>
                            </div>
                            <div>
                              <p className="text-muted-foreground">Charged amount (ZMW)</p>
                              <p className="font-medium text-primary">{formatFxAmount(selectedOrderFx.amountZmw, 'ZMW')}</p>
                            </div>
                            <div>
                              <p className="text-muted-foreground">Exchange rate</p>
                              <p className="font-medium">{formatFxRateLabel(selectedOrderFx)}</p>
                            </div>
                            <div>
                              <p className="text-muted-foreground">Provider / source</p>
                              <p className="font-medium">{formatFxSourceLabel(selectedOrderFx)}</p>
                            </div>
                            <div>
                              <p className="text-muted-foreground">Fetched</p>
                              <p className="font-medium">
                                {selectedOrderFx.fetchedAt ? formatDistanceToNow(new Date(selectedOrderFx.fetchedAt), { addSuffix: true }) : 'N/A'}
                              </p>
                            </div>
                            <div>
                              <p className="text-muted-foreground">Locked</p>
                              <p className="font-medium">
                                {selectedOrderFx.lockedAt ? formatDistanceToNow(new Date(selectedOrderFx.lockedAt), { addSuffix: true }) : 'N/A'}
                              </p>
                            </div>
                          </div>
                        ) : (
                          <div className="text-sm text-muted-foreground">
                            FX snapshot unavailable for this payment record. Legacy order details remain available.
                          </div>
                        )}
                        <div className="mt-4">
                        <Button 
                          variant="outline" 
                          size="sm" 
                          className="w-full" 
                          onClick={() => handleSyncStatus(selectedOrder.id)}
                          disabled={loading}
                        >
                          <RefreshCw className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`} />
                          Sync with Vesicash
                        </Button>
                      </div>
                    </CardContent>
                    </Card>
                  )}

                  {/* Order Items */}
                  <Card>
                    <CardHeader>
                      <CardTitle>Order Items</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        {selectedOrder.order_items?.map((item) => (
                          <div key={item.id} className="flex gap-4 p-4 border rounded-lg">
                              <img
                              src={item.products?.main_image || '/api/placeholder/80/80'}
                              alt={item.products?.name || 'Ordered item'}
                              className="w-16 h-16 object-cover rounded"
                              loading="lazy"
                            />
                            <div className="flex-1">
                              <h4 className="font-medium">{item.products?.name || 'Unknown Item'}</h4>
                              <div className="flex justify-between mt-2">
                                <span>Qty: {item.quantity}</span>
                                <span className="font-medium">
                                  {formatCurrency(item.unit_price * item.quantity)}
                                </span>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>

                      <div className="border-t pt-4 mt-4">
                        <div className="flex justify-between text-lg font-bold">
                          <span>Total:</span>
                          <span className="text-primary">
                            {formatCurrency(selectedOrder.total_amount)}
                          </span>
                        </div>
                      </div>
                      <div className="mt-4">
                        <Button 
                          variant="outline" 
                          size="sm" 
                          className="w-full" 
                          onClick={() => handleSyncStatus(selectedOrder.id)}
                          disabled={loading}
                        >
                          <RefreshCw className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`} />
                          Sync with Vesicash
                        </Button>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Shipping Address */}
                  {selectedOrder.shipping_address && (
                    <Card>
                      <CardHeader>
                        <CardTitle>Shipping Address</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="text-sm">
                          <p>{selectedOrder.shipping_address.firstName} {selectedOrder.shipping_address.lastName}</p>
                          {selectedOrder.shipping_address.company && (
                            <p>{selectedOrder.shipping_address.company}</p>
                          )}
                          <p>{selectedOrder.shipping_address.address}</p>
                          <p>
                            {selectedOrder.shipping_address.city}, {selectedOrder.shipping_address.state} {selectedOrder.shipping_address.zipCode}
                          </p>
                          <p>{selectedOrder.shipping_address.country}</p>
                        </div>
                        <div className="mt-4">
                        <Button 
                          variant="outline" 
                          size="sm" 
                          className="w-full" 
                          onClick={() => handleSyncStatus(selectedOrder.id)}
                          disabled={loading}
                        >
                          <RefreshCw className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`} />
                          Sync with Vesicash
                        </Button>
                      </div>
                    </CardContent>
                    </Card>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
};

export default Orders;
