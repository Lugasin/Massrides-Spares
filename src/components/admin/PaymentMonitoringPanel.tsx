import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { AlertCircle, CheckCircle, Clock, Search, RefreshCw, AlertTriangle, ArrowRight } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface PaymentEvent {
    id: string;
    payment_id: string;
    event_type: string;
    new_status: string;
    created_at: string;
    source: string;
}

interface AdminAlert {
    id: string;
    title: string;
    message: string;
    type: 'info' | 'warning' | 'critical';
    created_at: string;
    is_resolved: boolean;
}

interface PaymentTransaction {
    id: string;
    merchant_reference: string;
    amount: number;
    currency: string;
    status: string;
    created_at: string;
    provider_reference: string | null;
}

export const PaymentMonitoringPanel = () => {
    const [alerts, setAlerts] = useState<AdminAlert[]>([]);
    const [recentEvents, setRecentEvents] = useState<PaymentEvent[]>([]);
    const [transactions, setTransactions] = useState<PaymentTransaction[]>([]);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        setLoading(true);
        await Promise.all([fetchAlerts(), fetchEvents(), fetchTransactions()]);
        setLoading(false);
    };

    const fetchAlerts = async () => {
        const { data } = await supabase
            .from('admin_alerts')
            .select('*')
            .order('created_at', { ascending: false })
            .limit(5);
        if (data) setAlerts(data as any);
    };

    const fetchEvents = async () => {
        const { data } = await supabase
            .from('payment_events')
            .select('*')
            .order('created_at', { ascending: false })
            .limit(10);
        if (data) setRecentEvents(data as any);
    };

    const fetchTransactions = async () => {
        const { data } = await supabase
            .from('payments')
            .select('*')
            .order('created_at', { ascending: false })
            .limit(10);
        if (data) setTransactions(data as any);
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'PAID': return 'bg-green-100 text-green-800 border-green-200';
            case 'PENDING': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
            case 'FAILED': return 'bg-red-100 text-red-800 border-red-200';
            case 'Refunded': return 'bg-purple-100 text-purple-800 border-purple-200';
            default: return 'bg-gray-100 text-gray-800 border-gray-200';
        }
    };

    return (
        <div className="space-y-6">

            {/* 1. Critical Alerts Section */}
            {alerts.length > 0 && (
                <Card className="border-red-200 bg-red-50/20">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2 text-red-700">
                            <AlertTriangle className="h-5 w-5" />
                            Critical Payment Alerts
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-2">
                            {alerts.map(alert => (
                                <div key={alert.id} className="flex items-start gap-3 p-3 bg-white border border-red-100 rounded-md shadow-sm">
                                    <AlertCircle className={`h-5 w-5 ${alert.type === 'critical' ? 'text-red-500' : 'text-yellow-500'}`} />
                                    <div className="flex-1">
                                        <h4 className="text-sm font-semibold">{alert.title}</h4>
                                        <p className="text-sm text-muted-foreground">{alert.message}</p>
                                        <p className="text-xs text-gray-400 mt-1">{new Date(alert.created_at).toLocaleString()}</p>
                                    </div>
                                    <Button variant="outline" size="sm" className="text-xs">Resolve</Button>
                                </div>
                            ))}
                        </div>
                    </CardContent>
                </Card>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* 2. Recent Transactions */}
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between">
                        <div>
                            <CardTitle>Recent Transactions</CardTitle>
                            <CardDescription>Latest financial intents and payments</CardDescription>
                        </div>
                        <Button variant="ghost" size="icon" onClick={fetchTransactions} disabled={loading}>
                            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                        </Button>
                    </CardHeader>
                    <CardContent>
                        <div className="overflow-x-auto">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Ref</TableHead>
                                        <TableHead>Amount</TableHead>
                                        <TableHead>Status</TableHead>
                                        <TableHead>Time</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {transactions.map(tx => (
                                        <TableRow key={tx.id}>
                                            <TableCell className="font-mono text-xs">{tx.merchant_reference.substring(0, 12)}...</TableCell>
                                            <TableCell>{tx.currency} {tx.amount.toFixed(2)}</TableCell>
                                            <TableCell>
                                                <Badge variant="outline" className={`text-xs ${getStatusColor(tx.status)}`}>
                                                    {tx.status}
                                                </Badge>
                                            </TableCell>
                                            <TableCell className="text-xs text-muted-foreground">
                                                {new Date(tx.created_at).toLocaleTimeString()}
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </div>
                    </CardContent>
                </Card>

                {/* 3. Event Timeline */}
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between">
                        <div>
                            <CardTitle>Payment Lifecycle Events</CardTitle>
                            <CardDescription>Immutable audit log of state changes</CardDescription>
                        </div>
                        <Button variant="ghost" size="icon" onClick={fetchEvents} disabled={loading}>
                            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                        </Button>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-4">
                            {recentEvents.map((event) => (
                                <div key={event.id} className="flex items-center gap-3 relative pb-4 last:pb-0 border-l-2 border-gray-100 pl-4 ml-2">
                                    <div className="absolute -left-[21px] top-1 h-3 w-3 rounded-full bg-blue-500 border-2 border-white" />
                                    <div className="flex-1">
                                        <div className="flex items-center justify-between">
                                            <p className="text-sm font-medium">{event.event_type}</p>
                                            <span className="text-xs text-muted-foreground">{new Date(event.created_at).toLocaleTimeString()}</span>
                                        </div>
                                        <p className="text-xs text-gray-500">
                                            Status: <span className="font-mono">{event.new_status}</span> • Source: {event.source}
                                        </p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
};
