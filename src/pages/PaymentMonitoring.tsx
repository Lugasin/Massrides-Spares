import React, { useState, useEffect } from 'react';
import { DashboardLayout } from '@/components/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { 
  CreditCard, 
  Search, 
  Filter, 
  RefreshCw,
  CheckCircle,
  XCircle,
  Clock,
  DollarSign,
  AlertTriangle,
  Eye,
  Settings,
  Download
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

const PaymentMonitoring = () => {
  const { user, profile, userRole } = useAuth();
  const [transactions, setTransactions] = useState<TJTransaction[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
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
      fetchTransactions();
      fetchOrders();
      subscribeToUpdates();
    }
  }, [userRole]);

  const fetchTransactions = async () => {
    try {
      const { data, error } = await supabase
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

      if (error) throw error;
      setTransactions(data || []);
    } catch (error: any) {
      console.error('Error fetching transactions:', error);
      toast.error('Failed to load transactions');
    }
  };

  const fetchOrders = async () => {
    try {
      const { data, error } = await supabase
        .from('orders')
        .select(`
          *,
          user_profile:user_profiles(full_name, email)
        `)
        .not('payment_intent_id', 'is', null)
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw error;
      setOrders(data || []);
    } catch (error: any) {
      console.error('Error fetching orders:', error);
      toast.error('Failed to load orders');
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
          fetchTransactions();
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
          fetchOrders();
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
      fetchTransactions();
      fetchOrders();
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
      fetchTransactions();
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
            <Button variant="outline" onClick={() => { fetchTransactions(); fetchOrders(); }}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </Button>
            <Button variant="outline">
              <Download className="h-4 w-4 mr-2" />
              Export
            </Button>
          </div>
        </div>

        <Tabs defaultValue="orders" className="space-y-6">
          <TabsList>
            <TabsTrigger value="orders">Orders</TabsTrigger>
            <TabsTrigger value="transactions">Transaction Logs</TabsTrigger>
            <TabsTrigger value="settlements">Manual Settlements</TabsTrigger>
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
                      {orders.map((order) => (
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
                      <TableHead>Date</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {transactions.map((transaction) => (
                      <TableRow key={transaction.id}>
                        <TableCell className="font-mono text-sm">
                          {transaction.transaction_id || 'N/A'}
                        </TableCell>
                        <TableCell>
                          {transaction.order?.order_number || 'N/A'}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">
                            {transaction.event_type || 'unknown'}
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

          <TabsContent value="settlements">
            <Card>
              <CardHeader>
                <CardTitle>Manual Settlement Controls</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-center py-8">
                  <Settings className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                  <h3 className="text-lg font-medium mb-2">Settlement Management</h3>
                  <p className="text-muted-foreground mb-6">
                    Use the action buttons in the Orders tab to manually settle or reverse authorized transactions.
                  </p>
                </div>
              </CardContent>
            </Card>
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
                    <Label>Transaction ID</Label>
                    <p className="font-mono">{selectedTransaction.transaction_id || 'N/A'}</p>
                  </div>
                  <div>
                    <Label>Order Number</Label>
                    <p>{selectedTransaction.order?.order_number || 'N/A'}</p>
                  </div>
                  <div>
                    <Label>Event Type</Label>
                    <Badge variant="outline">{selectedTransaction.event_type || 'unknown'}</Badge>
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