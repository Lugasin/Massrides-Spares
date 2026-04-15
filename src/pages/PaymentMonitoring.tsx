import React, { useState, useEffect } from 'react';
import { DashboardLayout } from "@/components/DashboardLayout";
import { useAuth } from "@/context/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { Loader2, Search, ExternalLink } from "lucide-react";
import { Input } from "@/components/ui/input";
import { useCurrency } from "@/context/CurrencyContext";

const PaymentMonitoring = () => {
  const { user, profile, userRole } = useAuth();
  const { formatPrice } = useCurrency();
  const [payments, setPayments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    const fetchPayments = async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from('payments')
        .select(`
          *,
          order:orders(order_number, total_amount, profiles:user_id(full_name, email))
        `)
        .order('created_at', { ascending: false });

      if (!error) {
        setPayments(data || []);
      }
      setLoading(false);
    };

    fetchPayments();
  }, []);

  const getStatusBadge = (status: string) => {
    switch (status.toLowerCase()) {
      case 'paid':
      case 'success':
      case 'completed':
        return <Badge className="bg-success">Paid</Badge>;
      case 'pending':
        return <Badge variant="outline">Pending</Badge>;
      case 'failed':
      case 'error':
        return <Badge variant="destructive">Failed</Badge>;
      case 'processing':
        return <Badge className="bg-blue-500">Processing</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const filteredPayments = payments.filter(p =>
    p.vesicash_transaction_id?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.order?.order_number?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <DashboardLayout userRole={userRole as any} userName={profile?.full_name || user?.email || 'User'}>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
            <div>
                <h1 className="text-3xl font-bold">Payment Monitoring</h1>
                <p className="text-muted-foreground">Track all system transactions and escrow states</p>
            </div>
        </div>

        <Card>
          <CardHeader>
            <div className="flex items-center gap-4">
                <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                        placeholder="Search by Order ID or Transaction Reference..."
                        className="pl-10"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
            </div>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex justify-center p-8"><Loader2 className="animate-spin" /></div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Order #</TableHead>
                    <TableHead>Reference</TableHead>
                    <TableHead>Customer</TableHead>
                    <TableHead>Amount (USD)</TableHead>
                    <TableHead>Amount (ZMW)</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredPayments.map((p) => (
                    <TableRow key={p.id}>
                      <TableCell className="text-sm">
                        {format(new Date(p.created_at), 'MMM dd, HH:mm')}
                      </TableCell>
                      <TableCell className="font-medium">
                        {p.order?.order_number || 'N/A'}
                      </TableCell>
                      <TableCell className="text-xs font-mono">
                        {p.vesicash_transaction_id || 'N/A'}
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">
                            <div className="font-medium">{p.order?.profiles?.full_name || 'Guest'}</div>
                            <div className="text-xs text-muted-foreground">{p.order?.profiles?.email || ''}</div>
                        </div>
                      </TableCell>
                      <TableCell>{formatPrice(p.amount_usd || 0)}</TableCell>
                      <TableCell>K{p.amount_zmw?.toLocaleString()}</TableCell>
                      <TableCell>{getStatusBadge(p.status)}</TableCell>
                    </TableRow>
                  ))}
                  {filteredPayments.length === 0 && (
                      <TableRow>
                          <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                              No payments found
                          </TableCell>
                      </TableRow>
                  )}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
};

export default PaymentMonitoring;
