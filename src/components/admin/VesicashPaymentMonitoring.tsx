import React, { useEffect, useState } from 'react';
import { formatDistanceToNow } from 'date-fns';
import {
  Activity,
  AlertTriangle,
  CheckCircle,
  Clock,
  DollarSign,
  RefreshCw,
  Search,
  TrendingUp,
  XCircle,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface PaymentRow {
  id: number;
  order_id: number;
  provider: string;
  status: string;
  created_at: string | null;
  completed_at: string | null;
  vesicash_payment_id: string | null;
  vesicash_transaction_id: string | null;
  order?: {
    id: number;
    order_number: string;
    payment_status: string;
    shipping_address: Record<string, unknown> | null;
    status: string;
    total_amount: number;
    user_id: string;
  } | null;
}

interface CustomerProfile {
  email: string;
  full_name: string | null;
  phone: string | null;
  user_id: string;
}

interface FinancialAuditLog {
  id: string;
  amount: number | null;
  created_at: string | null;
  entity_id: string | null;
  entity_type: string | null;
  event_type: string;
  metadata: Record<string, unknown> | null;
}

interface Metrics {
  averageOrderValue: number;
  failedPayments: number;
  paidPayments: number;
  pendingPayments: number;
  totalRevenue: number;
  totalTransactions: number;
}

const emptyMetrics: Metrics = {
  averageOrderValue: 0,
  failedPayments: 0,
  paidPayments: 0,
  pendingPayments: 0,
  totalRevenue: 0,
  totalTransactions: 0,
};

function formatMoney(amount: number, currency = 'USD') {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    maximumFractionDigits: 2,
  }).format(amount || 0);
}

function getStatusColor(status: string) {
  switch (status) {
    case 'paid':
      return 'default';
    case 'pending':
    case 'authorised':
      return 'secondary';
    case 'failed':
      return 'destructive';
    case 'cancelled':
      return 'outline';
    default:
      return 'secondary';
  }
}

function getStatusIcon(status: string) {
  switch (status) {
    case 'paid':
      return <CheckCircle className="h-4 w-4 text-green-600" />;
    case 'pending':
    case 'authorised':
      return <Clock className="h-4 w-4 text-amber-500" />;
    case 'failed':
    case 'cancelled':
      return <XCircle className="h-4 w-4 text-red-500" />;
    default:
      return <AlertTriangle className="h-4 w-4 text-muted-foreground" />;
  }
}

function usePaymentMonitorData() {
  const [payments, setPayments] = useState<PaymentRow[]>([]);
  const [auditLogs, setAuditLogs] = useState<FinancialAuditLog[]>([]);
  const [customerMap, setCustomerMap] = useState<Record<string, CustomerProfile>>({});
  const [metrics, setMetrics] = useState<Metrics>(emptyMetrics);
  const [loading, setLoading] = useState(true);

  const refresh = async () => {
    try {
      setLoading(true);
      const [{ data: paymentData, error: paymentError }, { data: auditData, error: auditError }] = await Promise.all([
        supabase
          .from('payments')
          .select(`
            *,
            order:orders(
              id,
              order_number,
              payment_status,
              shipping_address,
              status,
              total_amount,
              user_id
            )
          `)
          .order('created_at', { ascending: false })
          .limit(100),
        supabase.from('financial_audit_logs').select('*').order('created_at', { ascending: false }).limit(100),
      ]);

      if (paymentError) throw paymentError;
      if (auditError) throw auditError;

      const paymentRows = (paymentData || []) as PaymentRow[];
      setPayments(paymentRows);
      setAuditLogs((auditData || []) as FinancialAuditLog[]);

      const userIds = Array.from(new Set(paymentRows.map((payment) => payment.order?.user_id).filter(Boolean) as string[]));
      if (userIds.length > 0) {
        const { data: profilesData, error: profileError } = await supabase
          .from('user_profiles')
          .select('user_id, full_name, email, phone')
          .in('user_id', userIds);

        if (profileError) throw profileError;

        setCustomerMap(
          Object.fromEntries(((profilesData || []) as CustomerProfile[]).map((customer) => [customer.user_id, customer])),
        );
      } else {
        setCustomerMap({});
      }

      const paidPayments = paymentRows.filter((payment) => payment.status === 'paid');
      const failedPayments = paymentRows.filter((payment) => payment.status === 'failed' || payment.status === 'cancelled');
      const pendingPayments = paymentRows.filter((payment) => payment.status === 'pending' || payment.status === 'authorised');
      const totalRevenue = paidPayments.reduce((sum, payment) => sum + Number(payment.order?.total_amount || 0), 0);

      setMetrics({
        totalTransactions: paymentRows.length,
        paidPayments: paidPayments.length,
        failedPayments: failedPayments.length,
        pendingPayments: pendingPayments.length,
        totalRevenue,
        averageOrderValue: paidPayments.length > 0 ? totalRevenue / paidPayments.length : 0,
      });
    } catch (error) {
      console.error('Error fetching Vesicash monitor data:', error);
      toast.error('Failed to load payment monitoring data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refresh();
    const channel = supabase
      .channel('vesicash-payment-monitor')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'payments' }, refresh)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'financial_audit_logs' }, refresh)
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'orders' }, refresh)
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const getCustomer = (payment: PaymentRow) => {
    const profileRecord = payment.order?.user_id ? customerMap[payment.order.user_id] : undefined;
    const shippingAddress = (payment.order?.shipping_address || {}) as Record<string, unknown>;
    const shippingName = [shippingAddress.firstName, shippingAddress.lastName].filter(Boolean).join(' ');
    return {
      name: profileRecord?.full_name || shippingName || String(shippingAddress.full_name || 'Customer'),
      email: profileRecord?.email || String(shippingAddress.email || ''),
      phone: profileRecord?.phone || String(shippingAddress.phone || ''),
    };
  };

  return { auditLogs, getCustomer, loading, metrics, payments, refresh };
}

export const VesicashPaymentMonitoringView = () => {
  const { auditLogs, getCustomer, loading, metrics, payments, refresh } = usePaymentMonitorData();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  const filteredPayments = payments.filter((payment) => {
    const customer = getCustomer(payment);
    const needle = searchTerm.toLowerCase();
    const matchesSearch = !searchTerm ||
      payment.vesicash_transaction_id?.toLowerCase().includes(needle) ||
      payment.order?.order_number?.toLowerCase().includes(needle) ||
      customer.name.toLowerCase().includes(needle) ||
      customer.email.toLowerCase().includes(needle);
    const matchesStatus = statusFilter === 'all' || payment.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const filteredAuditLogs = auditLogs.filter((log) => {
    const metadata = log.metadata || {};
    const needle = searchTerm.toLowerCase();
    const matchesSearch = !searchTerm ||
      log.event_type.toLowerCase().includes(needle) ||
      String(metadata.reference || '').toLowerCase().includes(needle) ||
      String(metadata.customer_email || '').toLowerCase().includes(needle);
    const matchesStatus = statusFilter === 'all' || log.event_type.includes(statusFilter);
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="text-3xl font-bold">Payment Monitoring</h1>
          <p className="text-muted-foreground">Vesicash transactions, customer details, and financial audit events.</p>
        </div>
        <Button variant="outline" onClick={refresh} disabled={loading}>
          <RefreshCw className={`mr-2 h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard icon={Activity} label="Transactions" value={`${metrics.totalTransactions}`} />
        <MetricCard icon={CheckCircle} label="Paid" value={`${metrics.paidPayments}`} accent="text-green-600" />
        <MetricCard icon={Clock} label="Pending" value={`${metrics.pendingPayments}`} accent="text-amber-500" />
        <MetricCard icon={DollarSign} label="Revenue" value={formatMoney(metrics.totalRevenue)} />
      </div>

      <Card>
        <CardContent className="flex flex-col gap-3 p-6 lg:flex-row lg:items-center">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search by reference, order number, customer name, or email"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="h-10 rounded-md border border-input bg-background px-3"
          >
            <option value="all">All statuses</option>
            <option value="paid">Paid</option>
            <option value="pending">Pending</option>
            <option value="authorised">Authorised</option>
            <option value="failed">Failed</option>
            <option value="cancelled">Cancelled</option>
          </select>
        </CardContent>
      </Card>

      <Tabs defaultValue="payments" className="space-y-6">
        <TabsList>
          <TabsTrigger value="payments">Payments</TabsTrigger>
          <TabsTrigger value="audits">Financial Audits</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
        </TabsList>

        <TabsContent value="payments">
          <Card>
            <CardHeader>
              <CardTitle>Vesicash Payments</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Reference</TableHead>
                    <TableHead>Customer</TableHead>
                    <TableHead>Order</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Started</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredPayments.length === 0 ? (
                    <EmptyRow colSpan={6} loading={loading} label="payments" />
                  ) : (
                    filteredPayments.map((payment) => {
                      const customer = getCustomer(payment);
                      return (
                        <TableRow key={payment.id}>
                          <TableCell className="font-mono text-xs">{payment.vesicash_transaction_id || 'Pending ref'}</TableCell>
                          <TableCell>
                            <div>
                              <p className="font-medium">{customer.name || 'Customer'}</p>
                              <p className="text-sm text-muted-foreground">{customer.email || 'No email recorded'}</p>
                            </div>
                          </TableCell>
                          <TableCell>{payment.order?.order_number || `Order #${payment.order_id}`}</TableCell>
                          <TableCell>{formatMoney(Number(payment.order?.total_amount || 0))}</TableCell>
                          <TableCell><StatusBadge status={payment.status} /></TableCell>
                          <TableCell>{payment.created_at ? formatDistanceToNow(new Date(payment.created_at), { addSuffix: true }) : 'N/A'}</TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="audits">
          <Card>
            <CardHeader>
              <CardTitle>Financial Audit Trail</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Time</TableHead>
                    <TableHead>Event</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Reference</TableHead>
                    <TableHead>Customer</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredAuditLogs.length === 0 ? (
                    <EmptyRow colSpan={5} loading={loading} label="audit logs" />
                  ) : (
                    filteredAuditLogs.map((log) => {
                      const metadata = log.metadata || {};
                      const customer = metadata.customer as Record<string, unknown> | undefined;
                      return (
                        <TableRow key={log.id}>
                          <TableCell>{log.created_at ? formatDistanceToNow(new Date(log.created_at), { addSuffix: true }) : 'N/A'}</TableCell>
                          <TableCell className="font-medium">{log.event_type.replace(/_/g, ' ')}</TableCell>
                          <TableCell>{log.amount !== null ? `ZMW ${Number(log.amount).toLocaleString()}` : 'N/A'}</TableCell>
                          <TableCell className="font-mono text-xs">{String(metadata.reference || 'N/A')}</TableCell>
                          <TableCell>
                            <div>
                              <p className="font-medium">{String(customer?.full_name || 'System')}</p>
                              <p className="text-sm text-muted-foreground">{String(metadata.customer_email || customer?.email || '')}</p>
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="analytics">
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <MetricDetailCard
              icon={TrendingUp}
              title="Payment Success Rate"
              value={`${metrics.totalTransactions > 0 ? ((metrics.paidPayments / metrics.totalTransactions) * 100).toFixed(1) : '0.0'}%`}
              description={`${metrics.paidPayments} of ${metrics.totalTransactions} payments settled successfully`}
              accent="text-green-600"
            />
            <MetricDetailCard
              icon={DollarSign}
              title="Average Paid Order"
              value={formatMoney(metrics.averageOrderValue)}
              description={`Failed payments: ${metrics.failedPayments}. Pending payments: ${metrics.pendingPayments}.`}
            />
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export const VesicashPaymentMonitoringPanel = () => {
  const { auditLogs, loading, metrics, payments, refresh } = usePaymentMonitorData();

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Recent Transactions</CardTitle>
              <CardDescription>Latest Vesicash payment records</CardDescription>
            </div>
            <Button variant="ghost" size="icon" onClick={refresh} disabled={loading}>
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            </Button>
          </CardHeader>
          <CardContent className="space-y-3">
            {payments.slice(0, 5).map((payment) => (
              <div key={payment.id} className="flex items-center justify-between rounded-md border p-3">
                <div>
                  <p className="font-mono text-xs">{payment.vesicash_transaction_id || 'Pending ref'}</p>
                  <p className="text-sm text-muted-foreground">{payment.order?.order_number || `Order #${payment.order_id}`}</p>
                </div>
                <div className="text-right">
                  <p className="font-medium">{formatMoney(Number(payment.order?.total_amount || 0))}</p>
                  <StatusBadge status={payment.status} />
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Financial Audit Snapshot</CardTitle>
            <CardDescription>Most recent payment lifecycle events</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {auditLogs.slice(0, 5).map((log) => (
              <div key={log.id} className="rounded-md border p-3">
                <div className="flex items-center justify-between gap-3">
                  <p className="font-medium">{log.event_type.replace(/_/g, ' ')}</p>
                  <span className="text-xs text-muted-foreground">
                    {log.created_at ? formatDistanceToNow(new Date(log.created_at), { addSuffix: true }) : 'N/A'}
                  </span>
                </div>
                <p className="mt-1 text-sm text-muted-foreground">
                  Reference: {String(log.metadata?.reference || 'N/A')}
                </p>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <MetricCard icon={CheckCircle} label="Paid" value={`${metrics.paidPayments}`} accent="text-green-600" />
        <MetricCard icon={Clock} label="Pending" value={`${metrics.pendingPayments}`} accent="text-amber-500" />
        <MetricCard icon={DollarSign} label="Revenue" value={formatMoney(metrics.totalRevenue)} />
      </div>
    </div>
  );
};

const StatusBadge = ({ status }: { status: string }) => (
  <div className="flex items-center gap-2">
    {getStatusIcon(status)}
    <Badge variant={getStatusColor(status)} className="capitalize">
      {status}
    </Badge>
  </div>
);

const MetricCard = ({ icon: Icon, label, value, accent }: { icon: React.ElementType; label: string; value: string; accent?: string }) => (
  <Card>
    <CardContent className="p-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-muted-foreground">{label}</p>
          <p className={`text-2xl font-bold ${accent || ''}`}>{value}</p>
        </div>
        <Icon className={`h-8 w-8 ${accent || 'text-primary'}`} />
      </div>
    </CardContent>
  </Card>
);

const MetricDetailCard = ({
  description,
  icon: Icon,
  title,
  value,
  accent,
}: {
  description: string;
  icon: React.ElementType;
  title: string;
  value: string;
  accent?: string;
}) => (
  <Card>
    <CardHeader>
      <CardTitle className="flex items-center gap-2">
        <Icon className="h-5 w-5" />
        {title}
      </CardTitle>
    </CardHeader>
    <CardContent>
      <div className="py-8 text-center">
        <div className={`mb-2 text-4xl font-bold ${accent || 'text-primary'}`}>{value}</div>
        <p className="text-muted-foreground">{description}</p>
      </div>
    </CardContent>
  </Card>
);

const EmptyRow = ({ colSpan, label, loading }: { colSpan: number; label: string; loading: boolean }) => (
  <TableRow>
    <TableCell colSpan={colSpan} className="h-24 text-center text-muted-foreground">
      {loading ? `Loading ${label}...` : `No ${label} found.`}
    </TableCell>
  </TableRow>
);
