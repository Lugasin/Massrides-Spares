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
import { Textarea } from '@/components/ui/textarea';
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
  Settings,
  Download,
  TrendingUp,
  Activity
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { formatDistanceToNow } from 'date-fns';

interface TJTransaction {
  id: string;
  order_id: string;
  transaction_id: string;
  event_type: string;
  amount: number;
  currency: string;
  status: string;
  webhook_data: any;
  processed_at: string;
  created_at: string;
  order?: {
    order_number: string;
    total_amount: number;
    status: string;
    payment_status: string;
    user_id: string;
  };
}

interface Order {
  id: string;
  order_number: string;
  status: string;
  payment_status: string;
  total_amount: number;
  tj: any;
  created_at: string;
  user_profile?: {
    full_name: string;
    email: string;
  };
}

interface PaymentMetrics {
  totalTransactions: number;
  successfulPayments: number;
  failedPayments: number;
  pendingPayments: number;
  totalRevenue: number;
  averageOrderValue: number;
}

const PaymentMonitoring = () => {
  const { user, profile, userRole } = useAuth();
  const [transactions, setTransactions] = useState<TJTransaction[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [metrics, setMetrics] = useState<PaymentMetrics>({
    totalTransactions: 0,
    successfulPayments: 0,
    failedPayments: 0,
    pendingPayments: 0,
    totalRevenue: 0,
    averageOrderValue: 0
  });
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedTransaction, setSelectedTransaction] = useState<TJTransaction | null>(null);
  const [settlementDialog, setSettlementDialog] = useState<{
    isOpen: boolean;
    transactionId: string;
    action: 'settle' | 'reverse';
  }>({
    isOpen: false,
    transactionId: '',
    action: 'settle'
  });
  const [settlementForm, setSettlementForm] = useState({
    amount: '',
    reason: ''
  });

  useEffect(() => {
    if (userRole === 'admin' || userRole === 'super_admin') {
      fetchData();
      subscribeToUpdates();
    }
  }, [userRole]);

  const fetchData = async () => {
    try {
      setLoading(true);
      
      // Fetch transactions
      const { data: transactionData, error: transactionError } = await supabase
        .from('tj_transaction_logs')
        .select(`
          *,
          order:orders(
            order_number,
            total_amount,
            status,
            payment_status,
            user_id
          )
        `)
        .order('created_at', { ascending: false })
        .limit(100);

      if (transactionError) throw transactionError;
      setTransactions(transactionData || []);

      // Fetch orders with payment data
      const { data: orderData, error: orderError } = await supabase
        .from('orders')
        .select(`
          *,
          user_profile:user_profiles(full_name, email)
        `)
        .not('payment_intent_id', 'is', null)
        .order('created_at', { ascending: false })
        .limit(50);

      if (orderError) throw orderError;
      setOrders(orderData || []);

      // Calculate metrics
      const allTransactions = transactionData || [];
      const successfulTxns = allTransactions.filter(t => t.status === 'PAYMENT_SETTLED');
      const failedTxns = allTransactions.filter(t => t.status === 'PAYMENT_FAILED' || t.status === 'PAYMENT_DECLINED');
      const pendingTxns = allTransactions.filter(t => t.status === 'PAYMENT_AUTHORISED');
      const totalRevenue = successfulTxns.reduce((sum, t) => sum + (t.amount || 0), 0);

      setMetrics({
        totalTransactions: allTransactions.length,
        successfulPayments: successfulTxns.length,
        failedPayments: failedTxns.length,
        pendingPayments: pendingTxns.length,
        totalRevenue: totalRevenue,
        averageOrderValue: successfulTxns.length > 0 ? totalRevenue / successfulTxns.length : 0
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
          table: 'tj_transaction_logs'
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

  const handleManualSettlement = async () => {
    try {
      const response = await supabase.functions.invoke('tj-manual-settlement', {
        body: {
          transactionId: settlementDialog.transactionId,
          action: settlementDialog.action,
          amount: settlementForm.amount ? parseFloat(settlementForm.amount) : undefined,
          reason: settlementForm.reason
        }
      });

      if (response.error) throw response.error;

      toast.success(`Transaction ${settlementDialog.action} successful`);
      setSettlementDialog({ isOpen: false, transactionId: '', action: 'settle' });
      setSettlementForm({ amount: '', reason: '' });
      fetchData();
    } catch (error: any) {
      console.error('Settlement error:', error);
      toast.error(`Failed to ${settlementDialog.action} transaction`);
    }
  };

  const handleTransactionLookup = async (transactionId: string) => {
    try {
      const response = await supabase.functions.invoke('tj-lookup', {
        body: { transactionId }
      });

      if (response.error) throw response.error;

      toast.success('Transaction lookup completed');
      fetchData();
    } catch (error: any) {
      console.error('Lookup error:', error);
      toast.error('Failed to lookup transaction');
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'PAYMENT_SETTLED':
      case 'paid':
        return 'default';
      case 'PAYMENT_AUTHORISED':
      case 'authorised':
        return 'secondary';
      case 'PAYMENT_FAILED':
      case 'failed':
        return 'destructive';
      case 'PAYMENT_CANCELLED':
      case 'cancelled':
        return 'outline';
      default:
        return 'secondary';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'PAYMENT_SETTLED':
      case 'paid':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'PAYMENT_AUTHORISED':
      case 'authorised':
        return <Clock className="h-4 w-4 text-yellow-500" />;
      case 'PAYMENT_FAILED':
      case 'failed':
        return <XCircle className="h-4 w-4 text-red-500" />;
      default:
        return <AlertTriangle className="h-4 w-4 text-gray-500" />;
    }
  };

  const filteredTransactions = transactions.filter(transaction => {
    const matchesSearch = !searchTerm ||
      transaction.transaction_id?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      transaction.order?.order_number?.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatus = statusFilter === 'all' || transaction.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  const filteredOrders = orders.filter(order => {
    const matchesSearch = !searchTerm ||
      order.order_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
      order.user_profile?.email?.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatus = statusFilter === 'all' || order.payment_status === statusFilter;

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
              <p className="text-muted-foreground">Monitor Transaction Junction payments and settlements</p>
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
                  <p className="text-sm text-muted-foreground">Total Transactions</p>
                  <p className="text-2xl font-bold">{metrics.totalTransactions}</p>
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
                  <p className="text-2xl font-bold text-success">{metrics.successfulPayments}</p>
                </div>
                <CheckCircle className="h-8 w-8 text-success" />
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
                    ${metrics.totalRevenue.toLocaleString()}
                  </p>
                </div>
                <DollarSign className="h-8 w-8 text-primary" />
              </div>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="orders" className="space-y-6">
          <TabsList>
            <TabsTrigger value="orders">Payment Orders</TabsTrigger>
            <TabsTrigger value="transactions">Transaction Logs</TabsTrigger>
            <TabsTrigger value="analytics">Analytics</TabsTrigger>
          </TabsList>

          <TabsContent value="orders">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>Payment Orders</CardTitle>
                  <div className="flex gap-2">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        placeholder="Search orders..."
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
                      <option value="authorised">Authorised</option>
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
                    <p className="text-muted-foreground">Loading orders...</p>
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Order #</TableHead>
                        <TableHead>Customer</TableHead>
                        <TableHead>Amount</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Payment Status</TableHead>
                        <TableHead>Date</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredOrders.map((order) => (
                        <TableRow key={order.id}>
                          <TableCell className="font-medium">{order.order_number}</TableCell>
                          <TableCell>
                            <div>
                              <p className="font-medium">{order.user_profile?.full_name || 'Guest'}</p>
                              <p className="text-sm text-muted-foreground">{order.user_profile?.email}</p>
                            </div>
                          </TableCell>
                          <TableCell className="font-medium">
                            ${order.total_amount.toLocaleString()}
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              {getStatusIcon(order.status)}
                              <Badge variant={getStatusColor(order.status)} className="capitalize">
                                {order.status}
                              </Badge>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              {getStatusIcon(order.payment_status)}
                              <Badge variant={getStatusColor(order.payment_status)} className="capitalize">
                                {order.payment_status}
                              </Badge>
                            </div>
                          </TableCell>
                          <TableCell>
                            {formatDistanceToNow(new Date(order.created_at), { addSuffix: true })}
                          </TableCell>
                          <TableCell>
                            <div className="flex gap-2">
                              <Button variant="outline" size="sm">
                                <Eye className="h-4 w-4" />
                              </Button>
                              {order.payment_status === 'authorised' && (
                                <>
                                  <Button 
                                    variant="outline" 
                                    size="sm"
                                    onClick={() => setSettlementDialog({
                                      isOpen: true,
                                      transactionId: order.tj?.transactionId || '',
                                      action: 'settle'
                                    })}
                                  >
                                    Settle
                                  </Button>
                                  <Button 
                                    variant="destructive" 
                                    size="sm"
                                    onClick={() => setSettlementDialog({
                                      isOpen: true,
                                      transactionId: order.tj?.transactionId || '',
                                      action: 'reverse'
                                    })}
                                  >
                                    Reverse
                                  </Button>
                                </>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="transactions">
            <Card>
              <CardHeader>
                <CardTitle>Transaction Logs</CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Transaction ID</TableHead>
                      <TableHead>Order</TableHead>
                      <TableHead>Event</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredTransactions.map((transaction) => (
                      <TableRow key={transaction.id}>
                        <TableCell className="font-mono text-sm">
                          {transaction.transaction_id || 'N/A'}
                        </TableCell>
                        <TableCell>
                          {transaction.order?.order_number || 'N/A'}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">
                            {transaction.event_type}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {transaction.status && (
                            <div className="flex items-center gap-2">
                              {getStatusIcon(transaction.status)}
                              <Badge variant={getStatusColor(transaction.status)}>
                                {transaction.status}
                              </Badge>
                            </div>
                          )}
                        </TableCell>
                        <TableCell>
                          {transaction.amount ? `$${transaction.amount.toLocaleString()}` : 'N/A'}
                        </TableCell>
                        <TableCell>
                          {formatDistanceToNow(new Date(transaction.created_at), { addSuffix: true })}
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-2">
                            <Button 
                              variant="outline" 
                              size="sm"
                              onClick={() => setSelectedTransaction(transaction)}
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                            {transaction.transaction_id && (
                              <Button 
                                variant="outline" 
                                size="sm"
                                onClick={() => handleTransactionLookup(transaction.transaction_id)}
                              >
                                <RefreshCw className="h-4 w-4" />
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
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
                    <div className="text-4xl font-bold text-success mb-2">
                      {metrics.totalTransactions > 0 
                        ? ((metrics.successfulPayments / metrics.totalTransactions) * 100).toFixed(1)
                        : 0}%
                    </div>
                    <p className="text-muted-foreground">
                      {metrics.successfulPayments} of {metrics.totalTransactions} transactions successful
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
                      ${metrics.averageOrderValue.toFixed(2)}
                    </div>
                    <p className="text-muted-foreground">
                      Average value per successful transaction
                    </p>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>

        {/* Transaction Details Modal */}
        {selectedTransaction && (
          <Dialog open={!!selectedTransaction} onOpenChange={() => setSelectedTransaction(null)}>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Transaction Details</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <Label>Transaction ID</Label>
                    <p className="font-mono">{selectedTransaction.transaction_id || 'N/A'}</p>
                  </div>
                  <div>
                    <Label>Order Number</Label>
                    <p>{selectedTransaction.order?.order_number || 'N/A'}</p>
                  </div>
                  <div>
                    <Label>Event Type</Label>
                    <Badge variant="outline">{selectedTransaction.event_type}</Badge>
                  </div>
                  <div>
                    <Label>Amount</Label>
                    <p>${(selectedTransaction.amount || 0).toLocaleString()}</p>
                  </div>
                </div>
                
                <div>
                  <Label>Webhook Data</Label>
                  <pre className="mt-2 p-4 bg-muted rounded-lg text-xs overflow-auto max-h-64">
                    {JSON.stringify(selectedTransaction.webhook_data, null, 2)}
                  </pre>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        )}

        {/* Settlement Dialog */}
        <Dialog open={settlementDialog.isOpen} onOpenChange={(open) => 
          setSettlementDialog(prev => ({ ...prev, isOpen: open }))
        }>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {settlementDialog.action === 'settle' ? 'Settle Transaction' : 'Reverse Transaction'}
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>Transaction ID</Label>
                <Input value={settlementDialog.transactionId} disabled />
              </div>
              
              <div>
                <Label>Amount (optional for partial)</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={settlementForm.amount}
                  onChange={(e) => setSettlementForm(prev => ({ ...prev, amount: e.target.value }))}
                  placeholder="Leave empty for full amount"
                />
              </div>
              
              <div>
                <Label>Reason</Label>
                <Textarea
                  value={settlementForm.reason}
                  onChange={(e) => setSettlementForm(prev => ({ ...prev, reason: e.target.value }))}
                  placeholder="Enter reason for settlement/reversal"
                />
              </div>
              
              <div className="flex gap-2 pt-4">
                <Button onClick={handleManualSettlement} className="flex-1">
                  {settlementDialog.action === 'settle' ? 'Settle' : 'Reverse'} Transaction
                </Button>
                <Button 
                  variant="outline" 
                  onClick={() => setSettlementDialog(prev => ({ ...prev, isOpen: false }))}
                >
                  Cancel
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
};

export default PaymentMonitoring;