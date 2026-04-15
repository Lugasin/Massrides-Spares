import React, { useState, useEffect } from 'react';
import { DashboardLayout } from "@/components/DashboardLayout";
import { useAuth } from "@/context/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { Loader2, ShoppingBag } from "lucide-react";
import { useCurrency } from "@/context/CurrencyContext";

const Orders = () => {
  const { user, profile, userRole } = useAuth();
  const { formatPrice } = useCurrency();
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchOrders = async () => {
      setLoading(true);
      let query = supabase.from('orders').select('*, payments(*)').order('created_at', { ascending: false });

      if (userRole === 'customer') {
          query = query.eq('user_id', user?.id);
      } else if (userRole === 'vendor') {
          query = query.eq('vendor_id', profile?.id);
      }

      const { data, error } = await query;

      if (!error) {
        setOrders(data || []);
      }
      setLoading(false);
    };

    if (userRole) {
        fetchOrders();
    }
  }, [userRole]);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'completed': return <Badge className="bg-success">Completed</Badge>;
      case 'pending': return <Badge variant="outline">Pending</Badge>;
      case 'cancelled': return <Badge variant="destructive">Cancelled</Badge>;
      case 'shipped': return <Badge className="bg-blue-500">Shipped</Badge>;
      default: return <Badge variant="secondary">{status}</Badge>;
    }
  };

  return (
    <DashboardLayout userRole={userRole as any} userName={profile?.full_name || user?.email || 'User'}>
      <div className="space-y-6">
        <h1 className="text-3xl font-bold">Order History</h1>

        <Card>
          <CardContent className="pt-6">
            {loading ? (
              <div className="flex justify-center p-8"><Loader2 className="animate-spin" /></div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Order #</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Total</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Payment</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {orders.map((order) => (
                    <TableRow key={order.id}>
                      <TableCell className="font-medium">{order.order_number}</TableCell>
                      <TableCell>{format(new Date(order.created_at), 'MMM dd, yyyy')}</TableCell>
                      <TableCell>{formatPrice(order.total_amount)}</TableCell>
                      <TableCell>{getStatusBadge(order.status)}</TableCell>
                      <TableCell>
                        <Badge variant={order.payment_status === 'paid' ? 'default' : 'outline'}>
                            {order.payment_status}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                  {orders.length === 0 && (
                      <TableRow>
                          <TableCell colSpan={5} className="text-center py-12 text-muted-foreground">
                              <ShoppingBag className="h-12 w-12 mx-auto mb-4 opacity-20" />
                              <p>No orders found.</p>
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

export default Orders;
