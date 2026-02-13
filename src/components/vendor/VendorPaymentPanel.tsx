import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { RefreshCw } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/AuthContext";

interface VendorPayment {
    id: string;
    merchant_reference: string;
    amount: number;
    currency: string;
    status: string;
    created_at: string;
    order_number: string;
}

export const VendorPaymentPanel = () => {
    const { user, profile } = useAuth();
    const [payments, setPayments] = useState<VendorPayment[]>([]);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (profile?.id) {
            fetchPayments();
        }
    }, [profile]);

    const fetchPayments = async () => {
        setLoading(true);
        if (!profile?.id) return;

        try {
            // 1. Get all order items for this vendor
            const { data: orderItems, error: itemsError } = await supabase
                .from('order_items')
                .select(`
                    order_id,
                    price,
                    quantity,
                    orders (
                        id,
                        order_number,
                        payment_status,
                        created_at,
                        status
                    )
                `)
                .eq('spare_parts.vendor_id', profile.id) // This assumes we can filter by nested relation, but Supabase doesn't support deep filter alias easily without !inner
                // Actually, spare_parts is related to order_items.
                // But wait, order_items has spare_part_id.
                // We need to filter order_items where spare_part has vendor_id = profile.id.
                // This requires: .select('..., spare_parts!inner(vendor_id)')
                .select(`
                    order_id,
                    price,
                    quantity,
                    orders!inner (
                        id,
                        order_number,
                        payment_status,
                        created_at
                    ),
                    spare_parts!inner (
                        vendor_id
                    )
                `)
                .eq('spare_parts.vendor_id', profile.id)
                .order('created_at', { ascending: false });

            if (itemsError) throw itemsError;

            // 2. Group by order to calculate "My Revenue" per order and get payment status
            const orderMap = new Map<string, VendorPayment>();

            if (orderItems) {
                // Determine unique orders
                const uniqueOrderIds = [...new Set(orderItems.map(item => item.order_id))];

                // Fetch actual payments only for these orders (optional, if we want payment gateway details)
                // But orders.payment_status is often enough for the dashboard.
                // For "Payment History", distinct payments reference is better. 
                // Let's see if we can get payments.
                const { data: paymentsData } = await supabase
                    .from('payments' as any)
                    .select('order_id, merchant_reference, currency, status')
                    .in('order_id', uniqueOrderIds);

                const paymentLookup = new Map();
                paymentsData?.forEach(p => {
                    paymentLookup.set(p.order_id, p);
                });

                orderItems.forEach((item: any) => {
                    const orderId = item.order_id;
                    const order = item.orders;
                    const payment = paymentLookup.get(orderId);

                    if (!orderMap.has(orderId)) {
                        orderMap.set(orderId, {
                            id: orderId,
                            merchant_reference: payment?.merchant_reference || order.order_number,
                            amount: 0,
                            currency: payment?.currency || 'ZMW', // default to ZMW
                            status: payment?.status || order.payment_status || 'PENDING',
                            created_at: order.created_at,
                            order_number: order.order_number
                        });
                    }

                    const entry = orderMap.get(orderId)!;
                    entry.amount += (item.price * item.quantity);
                });
            }

            setPayments(Array.from(orderMap.values()));

        } catch (error) {
            console.error("Error fetching vendor payments:", error);
        } finally {
            setLoading(false);
        }
    };

    const getStatusColor = (status: string) => {
        const s = status.toUpperCase();
        if (s === 'PAID' || s === 'SUCCESSFUL' || s === 'COMPLETED') return 'bg-green-100 text-green-800 border-green-200';
        if (s === 'PENDING' || s === 'PROCESSING') return 'bg-yellow-100 text-yellow-800 border-yellow-200';
        if (s === 'FAILED' || s === 'CANCELLED') return 'bg-red-100 text-red-800 border-red-200';
        return 'bg-gray-100 text-gray-800 border-gray-200';
    };

    return (
        <Card>
            <CardHeader className="flex flex-row items-center justify-between">
                <div>
                    <CardTitle>Sales & Payments</CardTitle>
                    <CardDescription>Earnings from your orders</CardDescription>
                </div>
                <Button variant="ghost" size="icon" onClick={fetchPayments} disabled={loading}>
                    <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                </Button>
            </CardHeader>
            <CardContent>
                <div className="overflow-x-auto">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Order # / Ref</TableHead>
                                <TableHead>My Earnings</TableHead>
                                <TableHead>Status</TableHead>
                                <TableHead>Date</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {payments.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                                        No sales records found.
                                    </TableCell>
                                </TableRow>
                            ) : (
                                payments.map((payment) => (
                                    <TableRow key={payment.id}>
                                        <TableCell>
                                            <div className="flex flex-col">
                                                <span className="font-medium text-sm">{payment.order_number}</span>
                                                <span className="text-xs text-muted-foreground font-mono">{payment.merchant_reference}</span>
                                            </div>
                                        </TableCell>
                                        <TableCell>{payment.currency} {payment.amount?.toFixed(2)}</TableCell>
                                        <TableCell>
                                            <Badge variant="outline" className={`text-xs ${getStatusColor(payment.status)}`}>
                                                {payment.status}
                                            </Badge>
                                        </TableCell>
                                        <TableCell className="text-xs text-muted-foreground">
                                            {new Date(payment.created_at).toLocaleDateString()}
                                        </TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                </div>
            </CardContent>
        </Card>
    );
};
