import React, { useState, useEffect } from 'react';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { DashboardLayout } from '@/components/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Package,
  Search,
  Filter,
  Eye,
  Download,
  Truck,
  CreditCard,
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

interface Order {
  id: string;
  order_number: string;
  status: string;
  payment_status: string;
  total_amount: number;
  created_at: string;
  updated_at: string;
  shipping_address: any;
  billing_address: any;
  guest_email?: string;
  order_items: Array<{
    id: number;
    quantity: number;
    price: number;
    title: string;
    spare_parts: {
      id: number;
      name: string;
      images: string[] | null;
    } | null;
  }>;
}

const Orders = () => {
  const { user, profile, userRole } = useAuth();
  const { formatCurrency } = useSettings();
  const { itemCount } = useQuote();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);

  const handleUpdateStatus = async (orderId: string, status: string) => {
    try {
      const { error } = await supabase.functions.invoke('update-order-status', {
        body: { orderId, status }
      });

      if (error) throw new Error(error.message);

      toast.success(`Order status updated to ${status}`);
      fetchOrders(); // Refetch orders to update the list
    } catch (error: any) {
      console.error('Error updating order status:', error);
      toast.error(`Failed to update order status: ${error.message}`);
    }
  };

  const handleRefund = async (orderId: string) => {
    if (!confirm('Are you sure you want to refund this order? This action cannot be undone.')) return;

    const toastId = toast.loading('Processing refund...');
    try {
      const { data, error } = await supabase.functions.invoke('process-refund', {
        body: { orderId, reason: 'Admin initiated refund via dashboard' }
      });

      if (error) throw new Error(error.message || 'Refund failed');

      toast.dismiss(toastId);
      toast.success('Refund processed successfully');
      fetchOrders();
      setSelectedOrder(null);
    } catch (error: any) {
      toast.dismiss(toastId);
      console.error('Error processing refund:', error);
      toast.error(`Refund failed: ${error.message}`);
    }
  };

  useEffect(() => {
    if (user || userRole) {
      fetchOrders();
      subscribeToOrders();
    }
  }, [user, userRole]);

  const fetchOrders = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase.functions.invoke('get-orders');

      if (error) throw new Error(error.message);

      setOrders(data.orders || []);
    } catch (error: any) {
      console.error('Error fetching orders:', error);
      toast.error(`Failed to load orders: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const subscribeToOrders = () => {
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
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'default';
      case 'processing': return 'secondary';
      case 'shipped': return 'outline';
      case 'cancelled': return 'destructive';
      default: return 'outline';
    }
  };

  const getPaymentStatusColor = (status: string) => {
    switch (status) {
      case 'paid': return 'default';
      case 'pending': return 'secondary';
      case 'failed': return 'destructive';
      default: return 'outline';
    }
  };

  const filteredOrders = React.useMemo(() => {
    return orders.filter(order => {
      const matchesSearch = !searchTerm ||
        order.order_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
        order.guest_email?.toLowerCase().includes(searchTerm.toLowerCase());

      const matchesStatus = statusFilter === 'all' || order.status === statusFilter;

      return matchesSearch && matchesStatus;
    });
  }, [orders, searchTerm, statusFilter]);

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
    <DashboardLayout userRole={userRole as any} userName={profile?.full_name || user?.email || 'User'} showMetrics={false}>
      <div className="space-y-6">
        {/* Orders Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold">Orders</h1>
            <p className="text-muted-foreground text-sm">Manage and track your orders</p>
          </div>
          <Button variant="outline" size="sm">
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
        </div>

        {/* Order Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground">Total Orders</p>
                  <p className="text-xl font-bold">{orders.length}</p>
                </div>
                <Package className="h-6 w-6 text-primary hidden sm:block" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground">Completed</p>
                  <p className="text-xl font-bold text-success">
                    {orders.filter(o => o.status === 'completed').length}
                  </p>
                </div>
                <Truck className="h-6 w-6 text-success hidden sm:block" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground">Processing</p>
                  <p className="text-xl font-bold text-yellow-500">
                    {orders.filter(o => o.status === 'processing').length}
                  </p>
                </div>
                <Calendar className="h-6 w-6 text-yellow-500 hidden sm:block" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground">Total Value</p>
                  <p className="text-xl font-bold text-primary">
                    {formatCurrency(orders.reduce((sum, o) => sum + o.total_amount, 0))}
                  </p>
                </div>
                <DollarSign className="h-6 w-6 text-primary hidden sm:block" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Orders Table */}
        <Card>
          <CardHeader className="pb-4">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <CardTitle className="text-lg">Order History</CardTitle>
              <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
                <div className="relative flex-1 sm:flex-initial">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search orders..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10 w-full sm:w-56"
                  />
                </div>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-full sm:w-[140px]">
                    <Filter className="h-4 w-4 mr-2 shrink-0" />
                    <SelectValue placeholder="All Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="processing">Processing</SelectItem>
                    <SelectItem value="shipped">Shipped</SelectItem>
                    <SelectItem value="completed">Completed</SelectItem>
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
                        <TableCell className="font-medium">{order.order_number}</TableCell>
                        <TableCell>
                          {formatDistanceToNow(new Date(order.created_at), { addSuffix: true })}
                        </TableCell>
                        <TableCell>
                          <Badge variant={getStatusColor(order.status)} className="capitalize">
                            {order.status}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant={getPaymentStatusColor(order.payment_status)} className="capitalize">
                            {order.payment_status}
                          </Badge>
                        </TableCell>
                        <TableCell className="font-medium">
                          {formatCurrency(order.total_amount)}
                        </TableCell>
                        <TableCell>
                          {order.order_items?.length || 0} items
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-wrap gap-1 items-center">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => setSelectedOrder(order)}
                            >
                              <Eye className="h-4 w-4" />
                              <span className="hidden sm:inline ml-1">View</span>
                            </Button>
                            {(userRole === 'admin' || userRole === 'vendor') && (
                              <Select
                                value={order.status}
                                onValueChange={(newStatus) => handleUpdateStatus(order.id, newStatus)}
                              >
                                <SelectTrigger className="h-8 text-xs w-[110px]">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="pending">Pending</SelectItem>
                                  <SelectItem value="processing">Processing</SelectItem>
                                  <SelectItem value="shipped">Shipped</SelectItem>
                                  <SelectItem value="completed">Completed</SelectItem>
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
                    ✕
                  </Button>
                </div>

                <div className="space-y-6">
                  {/* Order Info */}
                  <Card>
                    <CardContent className="p-4">
                      <div className="grid grid-cols-2 gap-4 text-sm">
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
                            {selectedOrder.status}
                          </Badge>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Payment</p>
                          <Badge variant={getPaymentStatusColor(selectedOrder.payment_status)} className="capitalize">
                            {selectedOrder.payment_status}
                          </Badge>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

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
                              src={item.spare_parts?.images?.[0] || '/api/placeholder/80/80'}
                              alt={item.spare_parts?.name || item.title}
                              className="w-16 h-16 object-cover rounded"
                              loading="lazy"
                            />
                            <div className="flex-1">
                              <h4 className="font-medium">{item.title}</h4>
                              <div className="flex justify-between mt-2">
                                <span>Qty: {item.quantity}</span>
                                <span className="font-medium">
                                  {formatCurrency(item.price * item.quantity)}
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
                      </CardContent>
                    </Card>
                  )}

                  {/* Admin Actions */}
                  {(userRole === 'admin' || userRole === 'super_admin') && (
                    <Card className="border-destructive/50">
                      <CardHeader>
                        <CardTitle className="text-destructive">Admin Actions</CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <div className="flex flex-wrap gap-4">
                          <Button
                            variant="destructive"
                            onClick={() => selectedOrder && handleRefund(selectedOrder.id)}
                            disabled={selectedOrder.status === 'cancelled' || selectedOrder.payment_status === 'refunded'}
                          >
                            Refund Order
                          </Button>

                          <Button
                            variant="outline"
                            onClick={() => window.open('https://vesicash.com/dashboard/transactions', '_blank')}
                          >
                            View in Vesicash
                          </Button>
                        </div>
                        <p className="text-xs text-muted-foreground">
                          Warning: Refunds are irreversible. Ensure you have verified the claim.
                        </p>
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