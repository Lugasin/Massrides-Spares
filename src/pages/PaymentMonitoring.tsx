import React, { useState, useEffect } from 'react';
import { DashboardLayout } from '@/components/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import {
  CreditCard,
  Search,
  RefreshCw,
  CheckCircle,
  XCircle,
  Clock,
  DollarSign,
  AlertTriangle,
  Eye,
  Download,
  TrendingUp,
  Activity,
  Smartphone
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { formatDistanceToNow } from 'date-fns';

interface Payment {
  id: string;
  order_id: string;
  provider: string;
  provider_reference: string;
  vesicash_transaction_id?: string;
  status: string;
  amount: number | null;
  currency: string;
  raw_payload: any;
  created_at: string;
  updated_at?: string;
  order?: {
    id: string;
    total_amount: number;
    status: string;
    user_id: string | null;
    guest_email: string | null;
    customer_email: string | null;
    shipping_address: any;
  };
}

interface PaymentMetrics {
  totalPayments: number;
  successfulPayments: number;
  failedPayments: number;
  pendingPayments: number;
  totalRevenue: number;
  averageOrderValue: number;
}

const PaymentMonitoring = () => {
  const { user, profile, userRole } = useAuth();
  const [payments, setPayments] = useState<Payment[]>([]);
  const [metrics, setMetrics] = useState<PaymentMetrics>({
    totalPayments: 0,
    successfulPayments: 0,
    failedPayments: 0,
    pendingPayments: 0,
    totalRevenue: 0,
    averageOrderValue: 0
  });
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedPayment, setSelectedPayment] = useState<Payment | null>(null);

  useEffect(() => {
    if (userRole === 'admin' || userRole === 'super_admin') {
      fetchData();
      subscribeToUpdates();
    }
  }, [userRole]);

  const fetchData = async () => {
    try {
      setLoading(true);

      // Fetch payments with order details
      const { data: paymentData, error: paymentError } = await supabase
        .from('payments')
        .select(`
          *,
          order:orders(
            id,
            total_amount,
            status,
            user_id,
            guest_email,
            customer_email,
            shipping_address
          )
        `)
        .order('created_at', { ascending: false })
        .limit(100);

      if (paymentError) throw paymentError;
      setPayments(paymentData || []);

      // Calculate metrics
      const allPayments = paymentData || [];
      const successfulPmts = allPayments.filter(p => p.status === 'paid');
      const failedPmts = allPayments.filter(p => p.status === 'failed' || p.status === 'cancelled');
      const pendingPmts = allPayments.filter(p => ['pending', 'initiated', 'processing'].includes(p.status));
      const totalRevenue = successfulPmts.reduce((sum, p) => sum + (p.amount || p.order?.total_amount || 0), 0);

      setMetrics({
        totalPayments: allPayments.length,
        successfulPayments: successfulPmts.length,
        failedPayments: failedPmts.length,
        pendingPayments: pendingPmts.length,
        totalRevenue: totalRevenue,
        averageOrderValue: successfulPmts.length > 0 ? totalRevenue / successfulPmts.length : 0
      });

    } catch (error: any) {
      console.error('Error fetching payment data:', error);
      toast.error('Failed to load payment data');
    } finally {
      setLoading(false);
    }
  };

  const subscribeToUpdates = () => {
    const channel = supabase
      .channel('payment-monitoring')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'payments'
        },
        () => {
          fetchData();
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'orders'
        },
        () => {
          fetchData();
        }
      )
      .subscribe();

    return () => supabase.removeChannel(channel);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'paid':
        return 'default';
      case 'initiated':
      case 'processing':
      case 'redirected':
        return 'secondary';
      case 'failed':
      case 'cancelled':
        return 'destructive';
      case 'pending':
        return 'outline';
      default:
        return 'secondary';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'paid':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'initiated':
      case 'processing':
      case 'redirected':
        return <Clock className="h-4 w-4 text-yellow-500" />;
      case 'failed':
      case 'cancelled':
        return <XCircle className="h-4 w-4 text-red-500" />;
      case 'pending':
        return <AlertTriangle className="h-4 w-4 text-gray-500" />;
      default:
        return <AlertTriangle className="h-4 w-4 text-gray-500" />;
    }
  };

  const getProviderIcon = (provider: string) => {
    switch (provider) {
      case 'vesicash':
        return <Smartphone className="h-4 w-4 text-green-600" />;
      default:
        return <CreditCard className="h-4 w-4 text-blue-600" />;
    }
  };

  const getCustomerInfo = (payment: Payment) => {
    const order = payment.order;
    if (!order) return { name: 'Unknown', email: '' };

    const shippingAddress = order.shipping_address || {};
    const name = shippingAddress.firstName
      ? `${shippingAddress.firstName} ${shippingAddress.lastName || ''}`
      : 'Guest';
    const email = order.customer_email || order.guest_email || shippingAddress.email || '';

    return { name, email };
  };

  const filteredPayments = payments.filter(payment => {
    const matchesSearch = !searchTerm ||
      payment.provider_reference?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      payment.vesicash_transaction_id?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      String(payment.order_id).includes(searchTerm);

    const matchesStatus = statusFilter === 'all' || payment.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  if (userRole !== 'admin' && userRole !== 'super_admin') {
    return (
      <DashboardLayout userRole={userRole as any} userName={profile?.full_name || user?.email || 'User'}>
        <div className="p-6 text-center">
          <CreditCard className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
          <h2 className="text-xl font-semibold mb-2">Admin Access Required</h2>
          <p className="text-muted-foreground">You need admin privileges to access payment monitoring.</p>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout userRole={userRole as any} userName={profile?.full_name || user?.email || 'Admin'}>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CreditCard className="h-8 w-8 text-primary" />
            <div>
              <h1 className="text-3xl font-bold">Payment Monitoring</h1>
              <p className="text-muted-foreground">Monitor Vesicash payments and order transactions</p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={fetchData} disabled={loading}>
              <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
            <Button variant="outline">
              <Download className="h-4 w-4 mr-2" />
              Export
            </Button>
          </div>
        </div>

        {/* Payment Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Total Payments</p>
                  <p className="text-2xl font-bold">{metrics.totalPayments}</p>
                </div>
                <Activity className="h-8 w-8 text-primary" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Successful</p>
                  <p className="text-2xl font-bold text-green-600">{metrics.successfulPayments}</p>
                </div>
                <CheckCircle className="h-8 w-8 text-green-600" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Pending</p>
                  <p className="text-2xl font-bold text-yellow-500">{metrics.pendingPayments}</p>
                </div>
                <Clock className="h-8 w-8 text-yellow-500" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Total Revenue</p>
                  <p className="text-2xl font-bold text-primary">
                    K{metrics.totalRevenue.toLocaleString()}
                  </p>
                </div>
                <DollarSign className="h-8 w-8 text-primary" />
              </div>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="payments" className="space-y-6">
          <TabsList>
            <TabsTrigger value="payments">All Payments</TabsTrigger>
            <TabsTrigger value="analytics">Analytics</TabsTrigger>
          </TabsList>

          <TabsContent value="payments">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>Payment Transactions</CardTitle>
                  <div className="flex gap-2">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        placeholder="Search by reference..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-10 w-64"
                      />
                    </div>
                    <select
                      value={statusFilter}
                      onChange={(e) => setStatusFilter(e.target.value)}
                      className="px-3 py-2 border border-input rounded-md bg-background"
                    >
                      <option value="all">All Status</option>
                      <option value="paid">Paid</option>
                      <option value="initiated">Initiated</option>
                      <option value="processing">Processing</option>
                      <option value="pending">Pending</option>
                      <option value="failed">Failed</option>
                      <option value="cancelled">Cancelled</option>
                    </select>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <div className="text-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
                    <p className="text-muted-foreground">Loading payments...</p>
                  </div>
                ) : filteredPayments.length === 0 ? (
                  <div className="text-center py-8">
                    <CreditCard className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                    <p className="text-muted-foreground">No payments found</p>
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Reference</TableHead>
                        <TableHead>Customer</TableHead>
                        <TableHead>Provider</TableHead>
                        <TableHead>Amount</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Date</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredPayments.map((payment) => {
                        const customer = getCustomerInfo(payment);
                        return (
                          <TableRow key={payment.id}>
                            <TableCell className="font-mono text-sm">
                              {payment.provider_reference?.slice(0, 20) || payment.vesicash_transaction_id?.slice(0, 20) || 'N/A'}
                              {(payment.provider_reference?.length > 20 || payment.vesicash_transaction_id?.length > 20) && '...'}
                            </TableCell>
                            <TableCell>
                              <div>
                                <p className="font-medium">{customer.name}</p>
                                <p className="text-sm text-muted-foreground">{customer.email}</p>
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                {getProviderIcon(payment.provider)}
                                <span className="capitalize">{payment.provider}</span>
                              </div>
                            </TableCell>
                            <TableCell className="font-medium">
                              {payment.currency || 'ZMW'} {(payment.amount || payment.order?.total_amount || 0).toLocaleString()}
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                {getStatusIcon(payment.status)}
                                <Badge variant={getStatusColor(payment.status)} className="capitalize">
                                  {payment.status}
                                </Badge>
                              </div>
                            </TableCell>
                            <TableCell>
                              {formatDistanceToNow(new Date(payment.created_at), { addSuffix: true })}
                            </TableCell>
                            <TableCell>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setSelectedPayment(payment)}
                              >
                                <Eye className="h-4 w-4" />
                              </Button>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="analytics">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <TrendingUp className="h-5 w-5" />
                    Payment Success Rate
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-center py-8">
                    <div className="text-4xl font-bold text-green-600 mb-2">
                      {metrics.totalPayments > 0
                        ? ((metrics.successfulPayments / metrics.totalPayments) * 100).toFixed(1)
                        : 0}%
                    </div>
                    <p className="text-muted-foreground">
                      {metrics.successfulPayments} of {metrics.totalPayments} payments successful
                    </p>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <DollarSign className="h-5 w-5" />
                    Average Order Value
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-center py-8">
                    <div className="text-4xl font-bold text-primary mb-2">
                      K{metrics.averageOrderValue.toFixed(2)}
                    </div>
                    <p className="text-muted-foreground">
                      Average value per successful payment
                    </p>
                  </div>
                </CardContent>
              </Card>

              <Card className="lg:col-span-2">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Activity className="h-5 w-5" />
                    Payment Status Breakdown
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
                    <div className="p-4 bg-green-50 rounded-lg">
                      <p className="text-2xl font-bold text-green-600">{metrics.successfulPayments}</p>
                      <p className="text-sm text-green-700">Paid</p>
                    </div>
                    <div className="p-4 bg-yellow-50 rounded-lg">
                      <p className="text-2xl font-bold text-yellow-600">{metrics.pendingPayments}</p>
                      <p className="text-sm text-yellow-700">Pending/Processing</p>
                    </div>
                    <div className="p-4 bg-red-50 rounded-lg">
                      <p className="text-2xl font-bold text-red-600">{metrics.failedPayments}</p>
                      <p className="text-sm text-red-700">Failed/Cancelled</p>
                    </div>
                    <div className="p-4 bg-blue-50 rounded-lg">
                      <p className="text-2xl font-bold text-blue-600">{metrics.totalPayments}</p>
                      <p className="text-sm text-blue-700">Total</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>

        {/* Payment Details Modal */}
        {selectedPayment && (
          <Dialog open={!!selectedPayment} onOpenChange={() => setSelectedPayment(null)}>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Payment Details</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <Label>Provider Reference</Label>
                    <p className="font-mono">{selectedPayment.provider_reference || 'N/A'}</p>
                  </div>
                  <div>
                    <Label>Order ID</Label>
                    <p>{selectedPayment.order_id}</p>
                  </div>
                  <div>
                    <Label>Provider</Label>
                    <div className="flex items-center gap-2">
                      {getProviderIcon(selectedPayment.provider)}
                      <span className="capitalize">{selectedPayment.provider}</span>
                    </div>
                  </div>
                  <div>
                    <Label>Status</Label>
                    <div className="flex items-center gap-2">
                      {getStatusIcon(selectedPayment.status)}
                      <Badge variant={getStatusColor(selectedPayment.status)} className="capitalize">
                        {selectedPayment.status}
                      </Badge>
                    </div>
                  </div>
                  <div>
                    <Label>Amount</Label>
                    <p>{selectedPayment.currency || 'ZMW'} {(selectedPayment.amount || selectedPayment.order?.total_amount || 0).toLocaleString()}</p>
                  </div>
                  <div>
                    <Label>Created</Label>
                    <p>{new Date(selectedPayment.created_at).toLocaleString()}</p>
                  </div>
                </div>

                {selectedPayment.raw_payload && (
                  <div>
                    <Label>Raw Response Data</Label>
                    <pre className="mt-2 p-4 bg-muted rounded-lg text-xs overflow-auto max-h-64">
                      {JSON.stringify(selectedPayment.raw_payload, null, 2)}
                    </pre>
                  </div>
                )}
              </div>
            </DialogContent>
          </Dialog>
        )}
      </div>
    </DashboardLayout>
  );
};

export default PaymentMonitoring;