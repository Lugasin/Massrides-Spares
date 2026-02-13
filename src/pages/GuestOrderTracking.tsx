import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Search, Package, Clock, Truck, CheckCircle2, AlertCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Link } from "react-router-dom";

interface OrderStatus {
    id: string;
    status: string;
    created_at: string;
    total_amount: number;
    customer_email: string;
    shipping_address: any;
}

export default function GuestOrderTracking() {
    const [orderId, setOrderId] = useState("");
    const [emailOrPhone, setEmailOrPhone] = useState("");
    const [order, setOrder] = useState<OrderStatus | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [searched, setSearched] = useState(false);

    const handleTrackOrder = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!orderId || !emailOrPhone) {
            toast.error("Please enter both Order ID and Contact Info");
            return;
        }

        setIsLoading(true);
        setSearched(true);
        setOrder(null);

        try {
            // Query order by ID and match against email or phone
            // We check for order_id (bigint)
            const numericOrderId = parseInt(orderId.replace(/\D/g, ''));

            const { data, error } = await supabase
                .from('orders')
                .select('*')
                .eq('id', numericOrderId)
                .or(`guest_email.eq.${emailOrPhone},guest_phone.eq.${emailOrPhone},customer_email.eq.${emailOrPhone}`)
                .single();

            if (error || !data) {
                console.error("Order search error:", error);
                toast.error("Order not found or contact info doesn't match");
            } else {
                setOrder(data as any);
            }
        } catch (err) {
            toast.error("Failed to fetch order details");
        } finally {
            setIsLoading(false);
        }
    };

    const getStatusStep = (status: string) => {
        const steps = ['pending', 'paid', 'processing', 'shipped', 'delivered'];
        const currentStep = steps.indexOf(status.toLowerCase());
        return currentStep === -1 ? 0 : currentStep;
    };

    const statusMap = {
        pending: { label: "Awaiting Payment", icon: Clock, color: "text-muted-foreground" },
        awaiting_payment: { label: "Awaiting Payment", icon: Clock, color: "text-muted-foreground" },
        paid: { label: "Payment Confirmed", icon: CheckCircle2, color: "text-green-600" },
        processing: { label: "Processing Order", icon: Package, color: "text-blue-600" },
        shipped: { label: "In Transit", icon: Truck, color: "text-orange-600" },
        delivered: { label: "Delivered", icon: CheckCircle2, color: "text-green-700" },
        cancelled: { label: "Cancelled", icon: AlertCircle, color: "text-red-600" },
        failed: { label: "Payment Failed", icon: AlertCircle, color: "text-red-600" },
    };

    return (
        <div className="min-h-screen bg-muted/30 pt-20 pb-12 px-4">
            <div className="max-w-3xl mx-auto space-y-8">
                <div className="text-center">
                    <h1 className="text-3xl font-bold text-primary mb-2">Track Your Order</h1>
                    <p className="text-muted-foreground">Enter your details to check your order status</p>
                </div>

                <Card className="shadow-lg border-primary/10">
                    <CardContent className="pt-6">
                        <form onSubmit={handleTrackOrder} className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="orderId">Order ID</Label>
                                <Input
                                    id="orderId"
                                    placeholder="e.g. 1234"
                                    value={orderId}
                                    onChange={(e) => setOrderId(e.target.value)}
                                    className="h-11"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="contact">Email or Phone</Label>
                                <Input
                                    id="contact"
                                    placeholder="your@email.com or +260..."
                                    value={emailOrPhone}
                                    onChange={(e) => setEmailOrPhone(e.target.value)}
                                    className="h-11"
                                />
                            </div>
                            <div className="flex items-end">
                                <Button type="submit" className="w-full h-11 gap-2" disabled={isLoading}>
                                    {isLoading ? "Searching..." : (
                                        <>
                                            <Search className="h-4 w-4" />
                                            Track Order
                                        </>
                                    )}
                                </Button>
                            </div>
                        </form>
                    </CardContent>
                </Card>

                {order && (
                    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                        <Card className="border-l-4 border-l-primary shadow-md">
                            <CardHeader className="pb-2">
                                <div className="flex justify-between items-start">
                                    <div>
                                        <CardTitle className="text-2xl">Order #{order.id}</CardTitle>
                                        <CardDescription>Placed on {new Date(order.created_at).toLocaleDateString()}</CardDescription>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-sm text-muted-foreground">Total Amount</p>
                                        <p className="text-xl font-bold text-primary">K{order.total_amount.toLocaleString()}</p>
                                    </div>
                                </div>
                            </CardHeader>
                            <CardContent>
                                <div className="mt-6">
                                    <h3 className="text-lg font-semibold mb-4">Delivery Status</h3>

                                    {/* Progress Tracker */}
                                    <div className="relative pt-8 pb-12">
                                        <div className="absolute top-0 left-0 w-full h-1 bg-muted rounded-full" />
                                        <div
                                            className="absolute top-0 left-0 h-1 bg-primary rounded-full transition-all duration-1000"
                                            style={{ width: `${(getStatusStep(order.status) / 4) * 100}%` }}
                                        />

                                        <div className="flex justify-between w-full h-0 relative">
                                            {['pending', 'paid', 'processing', 'shipped', 'delivered'].map((s, i) => {
                                                const StepIcon = statusMap[s as keyof typeof statusMap]?.icon || Clock;
                                                const isActive = i <= getStatusStep(order.status);
                                                return (
                                                    <div key={s} className="flex flex-col items-center">
                                                        <div className={`w-8 h-8 rounded-full border-4 ${isActive ? 'bg-primary border-primary text-white scale-110 shadow-lg' : 'bg-white border-muted text-muted-foreground'} flex items-center justify-center transition-all duration-500 z-10 -mt-4`}>
                                                            <StepIcon className="h-4 w-4" />
                                                        </div>
                                                        <span className={`text-[10px] sm:text-xs mt-2 font-medium ${isActive ? 'text-primary' : 'text-muted-foreground'} text-center max-w-[60px] sm:max-w-none`}>
                                                            {statusMap[s as keyof typeof statusMap]?.label}
                                                        </span>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mt-8 border-t pt-6">
                                        <div>
                                            <h4 className="font-semibold text-sm uppercase tracking-wider text-muted-foreground mb-3">Shipping To</h4>
                                            <p className="font-medium">{order.shipping_address?.full_name}</p>
                                            <p className="text-sm text-muted-foreground">{order.shipping_address?.address}</p>
                                            <p className="text-sm text-muted-foreground">{order.shipping_address?.city}, {order.shipping_address?.province}</p>
                                            <p className="text-sm text-muted-foreground">{order.shipping_address?.phone}</p>
                                        </div>
                                        <div>
                                            <h4 className="font-semibold text-sm uppercase tracking-wider text-muted-foreground mb-3">Order Update</h4>
                                            <div className="flex items-center gap-3">
                                                <div className="p-2 bg-primary/10 rounded-full">
                                                    <Package className="h-5 w-5 text-primary" />
                                                </div>
                                                <div>
                                                    <p className="text-sm font-medium">Next Step</p>
                                                    <p className="text-xs text-muted-foreground">
                                                        {order.status === 'paid' ? "We're packing your items!" :
                                                            order.status === 'processing' ? "Your order is ready for pickup/delivery." :
                                                                "Enjoy your spare parts!"}
                                                    </p>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                )}

                {searched && !order && !isLoading && (
                    <Card className="bg-red-50/50 border-red-100 py-12">
                        <CardContent className="flex flex-col items-center justify-center text-center">
                            <AlertCircle className="h-12 w-12 text-red-500 mb-4 opacity-50" />
                            <h3 className="text-lg font-semibold text-red-900">Order Not Found</h3>
                            <p className="text-red-700 max-w-sm mt-1">
                                We couldn't find an order matching those details. Please check your Order ID and contact info.
                            </p>
                            <Button variant="outline" className="mt-6 border-red-200" onClick={() => setSearched(false)}>
                                Try Again
                            </Button>
                        </CardContent>
                    </Card>
                )}

                <div className="text-center">
                    <p className="text-sm text-muted-foreground">
                        Having trouble? <Link to="/contact" className="text-primary hover:underline font-medium">Contact Support</Link>
                    </p>
                </div>
            </div>
        </div>
    );
}
