import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { formatDistanceToNow } from 'date-fns';
import { RefreshCw } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { supabase } from '@/integrations/supabase/client';
import {
  formatFxAmount,
  formatFxRateLabel,
  formatFxSourceLabel,
  getPaymentFxSummary,
} from '@/lib/paymentFx';
import { toast } from 'sonner';

interface VendorPaymentRow {
  id: number;
  order_id: number;
  provider: string | null;
  status: string;
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
  order?: {
    id: number;
    order_number: string;
    payment_status: string;
    total_amount: number;
    user_id: string;
    vendor_id: string | null;
    shipping_address: Record<string, unknown> | null;
    billing_address: Record<string, unknown> | null;
  } | null;
}

interface PayoutRow {
  id: string;
  total_amount: number;
  total_orders: number | null;
  status: string | null;
  created_at: string | null;
  processed_at: string | null;
  notes: string | null;
}

interface CustomerProfileRow {
  id: string;
  user_id: string;
  full_name: string | null;
  email: string | null;
  phone: string | null;
}

function getBadgeVariant(status: string) {
  switch (status.toLowerCase()) {
    case 'paid':
    case 'processed':
    case 'completed':
      return 'default' as const;
    case 'processing':
    case 'pending':
    case 'authorised':
      return 'secondary' as const;
    case 'failed':
    case 'cancelled':
      return 'destructive' as const;
    default:
      return 'outline' as const;
  }
}

function formatMoney(amount: number, currency = 'USD') {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    maximumFractionDigits: 2,
  }).format(amount || 0);
}

export const VendorPaymentPanel = () => {
  const [payments, setPayments] = useState<VendorPaymentRow[]>([]);
  const [payouts, setPayouts] = useState<PayoutRow[]>([]);
  const [customerMap, setCustomerMap] = useState<Record<string, CustomerProfileRow>>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchFinanceData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const [paymentsResult, payoutsResult] = await Promise.all([
        supabase
          .from('payments')
          .select(`
            id,
            order_id,
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
            fx_rate_payload,
            order:orders (
              id,
              order_number,
              payment_status,
              total_amount,
              user_id,
              vendor_id,
              shipping_address,
              billing_address
            )
          `)
          .order('created_at', { ascending: false })
          .limit(100),
        supabase
          .from('payouts')
          .select('id, total_amount, total_orders, status, created_at, processed_at, notes')
          .order('created_at', { ascending: false })
          .limit(50),
      ]);

      if (paymentsResult.error) throw paymentsResult.error;
      if (payoutsResult.error) {
        console.warn('Unable to fetch payout history:', payoutsResult.error);
      }

      const paymentRows = (paymentsResult.data || []) as VendorPaymentRow[];
      const payoutRows = (payoutsResult.data || []) as PayoutRow[];
      setPayments(paymentRows);
      setPayouts(payoutRows);

      const customerIds = Array.from(
        new Set(paymentRows.map((payment) => payment.order?.user_id).filter(Boolean) as string[])
      );

      if (customerIds.length > 0) {
        const { data: profilesById, error: profileError } = await supabase
          .from('user_profiles')
          .select('id, user_id, full_name, email, phone')
          .in('id', customerIds);

        if (profileError) throw profileError;

        setCustomerMap(
          Object.fromEntries(
            (profilesById || []).flatMap((profile) => {
              const record = profile as CustomerProfileRow;
              return [
                [record.id, record],
                [record.user_id, record],
              ];
            }),
          ),
        );
      } else {
        setCustomerMap({});
      }
    } catch (fetchError: any) {
      console.error('Vendor finance history failed:', fetchError);
      setError(fetchError?.message || 'Failed to load finance history');
      toast.error(fetchError?.message || 'Failed to load finance history');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchFinanceData();
  }, [fetchFinanceData]);

  const paymentRows = useMemo(() => {
    return payments.map((payment) => {
      const fxSummary = getPaymentFxSummary(payment, null);
      const order = payment.order || null;
      const customer = order?.user_id ? customerMap[order.user_id] : undefined;
      const billingAddress = (order?.billing_address || {}) as Record<string, unknown>;
      const shippingAddress = (order?.shipping_address || {}) as Record<string, unknown>;
      const customerName = customer?.full_name
        || String(billingAddress.full_name || shippingAddress.full_name || 'Customer');
      const customerEmail = customer?.email
        || String(billingAddress.email || shippingAddress.email || '');

      return {
        payment,
        fxSummary,
        customerName,
        customerEmail,
      };
    });
  }, [customerMap, payments]);

  const summary = useMemo(() => {
    const settledPayments = payments.filter((payment) => payment.status === 'paid');
    const pendingPayments = payments.filter((payment) => ['pending', 'authorised', 'processing'].includes(payment.status));
    const totalSettledZmw = payments.reduce((sum, payment) => {
      const fxSummary = getPaymentFxSummary(payment, null);
      return sum + Number(fxSummary?.amountZmw ?? payment.amount_zmw ?? 0);
    }, 0);
    const payoutTotal = payouts.reduce((sum, payout) => sum + Number(payout.total_amount || 0), 0);

    return {
      settledPayments: settledPayments.length,
      pendingPayments: pendingPayments.length,
      totalSettledZmw,
      payoutTotal,
      payoutCount: payouts.length,
    };
  }, [payments, payouts]);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <CardTitle>Vendor Finance History</CardTitle>
            <CardDescription>
              Payment settlements, locked FX snapshots, and payout records for your account.
            </CardDescription>
          </div>
          <Button variant="ghost" size="icon" onClick={fetchFinanceData} disabled={loading}>
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          </Button>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <div className="rounded-lg border p-4">
            <p className="text-sm text-muted-foreground">Settled payments</p>
            <p className="text-2xl font-bold">{summary.settledPayments}</p>
          </div>
          <div className="rounded-lg border p-4">
            <p className="text-sm text-muted-foreground">Pending payments</p>
            <p className="text-2xl font-bold text-amber-600">{summary.pendingPayments}</p>
          </div>
          <div className="rounded-lg border p-4">
            <p className="text-sm text-muted-foreground">Total settled</p>
            <p className="text-2xl font-bold text-primary">{formatMoney(summary.totalSettledZmw, 'ZMW')}</p>
          </div>
          <div className="rounded-lg border p-4">
            <p className="text-sm text-muted-foreground">Payouts</p>
            <p className="text-2xl font-bold">{summary.payoutCount}</p>
            <p className="text-xs text-muted-foreground">{formatMoney(summary.payoutTotal, 'ZMW')} total</p>
          </div>
        </CardContent>
      </Card>

      {error && (
        <Card className="border-destructive/30 bg-destructive/5">
          <CardContent className="p-4 text-sm text-destructive">
            {error}
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Recent Payments</CardTitle>
          <CardDescription>Charged ZMW amount and FX snapshot locked at checkout time.</CardDescription>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Reference</TableHead>
                <TableHead>Order</TableHead>
                <TableHead>Customer</TableHead>
                <TableHead>USD</TableHead>
                <TableHead>ZMW</TableHead>
                <TableHead>FX Rate</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Date</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={8} className="py-8 text-center text-muted-foreground">
                    Loading finance history...
                  </TableCell>
                </TableRow>
              ) : paymentRows.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="py-8 text-center text-muted-foreground">
                    No payments found.
                  </TableCell>
                </TableRow>
              ) : (
                paymentRows.map(({ payment, fxSummary, customerName, customerEmail }) => (
                  <TableRow key={payment.id}>
                    <TableCell className="font-mono text-xs">
                      {payment.vesicash_transaction_id || payment.vesicash_payment_id || `PAY-${payment.id}`}
                    </TableCell>
                    <TableCell>{payment.order?.order_number || `Order #${payment.order_id}`}</TableCell>
                    <TableCell>
                      <div className="space-y-1">
                        <p className="font-medium">{customerName}</p>
                        <p className="text-xs text-muted-foreground">{customerEmail || 'No email recorded'}</p>
                      </div>
                    </TableCell>
                    <TableCell>{formatFxAmount(fxSummary?.amountUsd ?? payment.amount_usd ?? payment.order?.total_amount ?? null, 'USD')}</TableCell>
                    <TableCell className="font-medium text-primary">
                      {formatFxAmount(fxSummary?.amountZmw ?? payment.amount_zmw ?? null, 'ZMW')}
                    </TableCell>
                    <TableCell>
                      <div className="space-y-1">
                        <p className="text-sm">{formatFxRateLabel(fxSummary)}</p>
                        <p className="text-xs text-muted-foreground">{formatFxSourceLabel(fxSummary)}</p>
                        {fxSummary?.fetchedAt ? (
                          <p className="text-xs text-muted-foreground">
                            Fetched {formatDistanceToNow(new Date(fxSummary.fetchedAt), { addSuffix: true })}
                          </p>
                        ) : null}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={getBadgeVariant(payment.status)} className="capitalize">
                        {payment.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {payment.created_at ? formatDistanceToNow(new Date(payment.created_at), { addSuffix: true }) : 'N/A'}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Payout History</CardTitle>
          <CardDescription>Completed and pending vendor payout records.</CardDescription>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Payout ID</TableHead>
                <TableHead>Orders</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Processed</TableHead>
                <TableHead>Notes</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={6} className="py-8 text-center text-muted-foreground">
                    Loading payout records...
                  </TableCell>
                </TableRow>
              ) : payouts.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="py-8 text-center text-muted-foreground">
                    No payout records found.
                  </TableCell>
                </TableRow>
              ) : (
                payouts.map((payout) => (
                  <TableRow key={payout.id}>
                    <TableCell className="font-mono text-xs">{payout.id}</TableCell>
                    <TableCell>{payout.total_orders ?? 0}</TableCell>
                    <TableCell className="font-medium">{formatMoney(Number(payout.total_amount || 0), 'ZMW')}</TableCell>
                    <TableCell>
                      <Badge variant={getBadgeVariant(payout.status || 'pending')} className="capitalize">
                        {payout.status || 'pending'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {payout.processed_at
                        ? formatDistanceToNow(new Date(payout.processed_at), { addSuffix: true })
                        : payout.created_at
                          ? formatDistanceToNow(new Date(payout.created_at), { addSuffix: true })
                          : 'N/A'}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {payout.notes || 'No notes'}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
};
