import { useEffect, useMemo, useRef, useState, useCallback, default as React } from "react";
import { useSearchParams, Link } from "react-router-dom";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CheckCircle, Clock3, ExternalLink, Home, Loader2, Package, RefreshCw, ShieldCheck, XCircle } from "lucide-react";
import { useQuote } from "@/context/QuoteContext";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/AuthContext";
import { clearHostedPaymentSession, openPaymentLink } from "@/lib/paymentRedirect";
import { useSettings } from "@/context/SettingsContext";

type PaymentState = "pending" | "processing" | "authorised" | "paid" | "failed" | "cancelled" | "refunded";

interface StatusPayload {
  customer: {
    email: string;
    full_name: string | null;
    role: string;
  };
  order: {
    created_at: string;
    id: string;
    order_items: Array<{
      id: number;
      quantity: number;
      unit_price: number;
      products: {
        main_image: string | null;
        name: string;
      } | null;
    }>;
    order_number: string;
    payment_status: string;
    shipping_address: Record<string, string> | null;
    status: string;
    total_amount: number;
    currency: string;
  } | null;
  payment: {
    completed_at: string | null;
    created_at: string | null;
    id: number;
    payment_id: string | null;
    provider: string;
    reference: string | null;
    status: PaymentState;
  } | null;
  show_account_prompt: boolean;
}

const FINAL_STATUSES: PaymentState[] = ["paid", "failed", "cancelled", "refunded"];

const CheckoutSuccess = () => {
  const [searchParams] = useSearchParams();
  const { clearCart, itemCount } = useQuote();
  const { user, session, loading: authLoading } = useAuth();
  const { formatCurrency } = useSettings();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusData, setStatusData] = useState<StatusPayload | null>(null);
  const [paymentLink, setPaymentLink] = useState(() => sessionStorage.getItem("last_checkout_payment_link") || "");
  const popupCallbackSentRef = useRef(false);
  const isPopupCallback = searchParams.get("popup") === "1";

  const lookup = useMemo(() => {
    const savedOrderId = sessionStorage.getItem("last_checkout_order_id");
    return {
      orderId:
        searchParams.get("order") ||
        searchParams.get("order_id") ||
        savedOrderId ||
        "",
      orderNumber: searchParams.get("order_number") || "",
      reference:
        searchParams.get("reference") ||
        searchParams.get("payment_reference") ||
        searchParams.get("merchant_ref") ||
        searchParams.get("tx_ref") ||
        searchParams.get("transaction_reference") ||
        searchParams.get("transaction_id") ||
        "",
    };
  }, [searchParams]);

  const fetchStatus = useCallback(async () => {
    if (!user) {
      return;
    }

    if (!lookup.orderId && !lookup.orderNumber && !lookup.reference) {
      setError("No checkout reference was found. Open your orders to confirm the latest payment status.");
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const accessToken = session?.access_token || (await supabase.auth.getSession()).data.session?.access_token;
      const authHeader = accessToken ? `Bearer ${accessToken}` : undefined;

      const { data, error: invokeError } = await supabase.functions.invoke("get-order-payment-status", {
        body: {
          orderId: lookup.orderId || undefined,
          orderNumber: lookup.orderNumber || undefined,
          reference: lookup.reference || undefined,
        },
        headers: authHeader ? { Authorization: authHeader } : undefined,
      });

      if (invokeError) {
        console.warn("Payment status polling error (possibly temporary):", invokeError);
        // If we don't have data yet, we don't show the error immediately to allow polling to continue.
        // But if it's the first check and it fails with a 400, it might be a missing order.
        // We'll wait for the next poll before showing a hard error.
        if (!statusData) {
            // Keep loading true to show checking status
        } else {
            setLoading(false);
        }
        return;
      }

      setStatusData((data || null) as StatusPayload | null);
      
      if (!data?.order && !data?.payment) {
        // If no matching order found after check, we might show error after a few retries.
        // For now, we allow refresh.
        setError("We could not find a matching order yet. Refresh this page or open your orders shortly.");
      } else if (data?.payment?.status === "paid") {
        clearCart();
        clearHostedPaymentSession();
        setPaymentLink("");
      }
    } catch (err) {
      console.error("Fetch status failed:", err);
    } finally {
      setLoading(false);
    }
  }, [clearCart, lookup.orderId, lookup.orderNumber, lookup.reference, user, session, statusData]);

  useEffect(() => {
    if (!authLoading && user) {
      fetchStatus();
    }
  }, [authLoading, fetchStatus, user]);

  useEffect(() => {
    if (!statusData?.payment?.status || FINAL_STATUSES.includes(statusData.payment.status)) {
      return;
    }

    const timer = window.setTimeout(() => {
      fetchStatus();
    }, 5000);

    return () => window.clearTimeout(timer);
  }, [fetchStatus, statusData?.payment?.status]);

  useEffect(() => {
    const finalStatus =
      statusData?.payment?.status &&
      FINAL_STATUSES.includes(statusData.payment.status);

    if (finalStatus) {
      clearHostedPaymentSession();
      setPaymentLink("");
    }
  }, [statusData?.payment?.status]);

  useEffect(() => {
    if (!isPopupCallback || typeof window === "undefined" || !window.opener || popupCallbackSentRef.current) {
      return;
    }

    popupCallbackSentRef.current = true;

    try {
      window.opener.postMessage(
        {
          type: "massrides-payment-return",
          orderId: lookup.orderId || statusData?.order?.id || "",
          reference: lookup.reference || statusData?.payment?.reference || "",
          paymentStatus: statusData?.payment?.status || statusData?.order?.payment_status || "pending",
        },
        window.location.origin,
      );
    } catch (postMessageError) {
      console.error("Failed to notify opener window:", postMessageError);
    }

    const closeTimer = window.setTimeout(() => {
      try {
        window.close();
      } catch {
        // Some mobile browsers require the window to be manually dismissed.
      }
    }, 600);

    return () => window.clearTimeout(closeTimer);
  }, [
    isPopupCallback,
    lookup.orderId,
    lookup.reference,
    statusData?.order?.id,
    statusData?.order?.payment_status,
    statusData?.payment?.reference,
    statusData?.payment?.status,
  ]);

  useEffect(() => {
    if (isPopupCallback || typeof window === "undefined") {
      return;
    }

    const handlePaymentReturn = (event: MessageEvent) => {
      if (event.origin !== window.location.origin) {
        return;
      }

      if (event.data?.type === "massrides-payment-return") {
        fetchStatus();
      }
    };

    window.addEventListener("message", handlePaymentReturn);
    return () => window.removeEventListener("message", handlePaymentReturn);
  }, [fetchStatus, isPopupCallback]);

  const paymentStatus = (statusData?.payment?.status || statusData?.order?.payment_status || "pending") as PaymentState;
  const order = statusData?.order;
  const payment = statusData?.payment;
  const showAccountPrompt = Boolean(statusData?.show_account_prompt && paymentStatus === "paid");
  const canResumePayment = Boolean(paymentLink) && ["pending", "authorised"].includes(paymentStatus);

  const statusConfig = {
    paid: {
      icon: <CheckCircle className="h-16 w-16 text-green-600 mx-auto mb-6" />,
      title: "Payment Confirmed",
      message: "Your payment has been confirmed and your order is now in progress.",
      badge: "default" as const,
    },
    processing: {
      icon: <Clock3 className="h-16 w-16 text-amber-500 mx-auto mb-6" />,
      title: "Payment Processing",
      message: "Your payment is being confirmed by Vesicash. This page will refresh automatically.",
      badge: "secondary" as const,
    },
    pending: {
      icon: <Clock3 className="h-16 w-16 text-amber-500 mx-auto mb-6" />,
      title: "Payment Pending",
      message: "Your payment is still being confirmed. This page will refresh automatically.",
      badge: "secondary" as const,
    },
    authorised: {
      icon: <Clock3 className="h-16 w-16 text-amber-500 mx-auto mb-6" />,
      title: "Payment Authorised",
      message: "Your payment is authorised and awaiting final confirmation.",
      badge: "secondary" as const,
    },
    failed: {
      icon: <XCircle className="h-16 w-16 text-red-600 mx-auto mb-6" />,
      title: "Payment Failed",
      message: "The payment was not completed. You can review the order and try again.",
      badge: "destructive" as const,
    },
    cancelled: {
      icon: <XCircle className="h-16 w-16 text-red-600 mx-auto mb-6" />,
      title: "Payment Cancelled",
      message: "This payment was cancelled before completion.",
      badge: "outline" as const,
    },
    refunded: {
      icon: <ShieldCheck className="h-16 w-16 text-blue-600 mx-auto mb-6" />,
      title: "Payment Refunded",
      message: "This payment has been refunded.",
      badge: "outline" as const,
    },
  }[paymentStatus];

  return (
    <div className="min-h-screen bg-background">
      <Header cartItemsCount={itemCount} />

      <main className="container mx-auto px-4 py-8">
        <div className="max-w-3xl mx-auto">
          <Card>
            <CardContent className="py-12">
              {authLoading || loading ? (
                <div className="text-center">
                  <Loader2 className="h-12 w-12 animate-spin text-primary mx-auto mb-6" />
                  <h1 className="text-2xl font-bold mb-2">Checking payment status</h1>
                  <p className="text-muted-foreground">We are confirming your latest order and payment state.</p>
                </div>
              ) : !user ? (
                <div className="text-center">
                  <ShieldCheck className="h-16 w-16 text-primary mx-auto mb-6" />
                  <h1 className="text-3xl font-bold mb-4">Sign in to view payment status</h1>
                  <p className="text-muted-foreground mb-8">
                    Your order is linked to your verified customer account. Sign in to confirm payment and track progress.
                  </p>
                  <div className="flex flex-col sm:flex-row gap-4 justify-center">
                    <Button asChild size="lg">
                      <Link to="/login?returnUrl=/checkout/success">Sign In</Link>
                    </Button>
                    <Button asChild variant="outline" size="lg">
                      <Link to="/orders">Open Orders</Link>
                    </Button>
                  </div>
                </div>
              ) : error ? (
                <div className="text-center">
                  <XCircle className="h-16 w-16 text-red-600 mx-auto mb-6" />
                  <h1 className="text-3xl font-bold mb-4">Unable to confirm payment</h1>
                  <p className="text-muted-foreground mb-8">{error}</p>
                  <div className="flex flex-col sm:flex-row gap-4 justify-center">
                    <Button variant="outline" size="lg" onClick={fetchStatus}>
                      <RefreshCw className="h-4 w-4 mr-2" />
                      Refresh Status
                    </Button>
                    <Button asChild size="lg">
                      <Link to="/orders">View Orders</Link>
                    </Button>
                  </div>
                </div>
              ) : (
                <>
                  {isPopupCallback && (
                    <div className="text-center mb-8">
                      <Loader2 className="h-10 w-10 animate-spin text-primary mx-auto mb-4" />
                      <p className="text-sm text-muted-foreground">Returning to your app...</p>
                    </div>
                  )}

                  <div className="text-center mb-8">
                    {statusConfig.icon}
                    <h1 className="text-3xl font-bold text-foreground mb-4">{statusConfig.title}</h1>
                    <p className="text-muted-foreground">{statusConfig.message}</p>
                    {canResumePayment && (
                      <p className="text-sm text-muted-foreground mt-3">
                        Keep this page open while the payment window completes. If you closed it early, you can reopen it below.
                      </p>
                    )}
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
                    <Card>
                      <CardHeader className="pb-3">
                        <CardTitle className="text-base">Order Details</CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-3 text-sm">
                        <div className="flex justify-between gap-4">
                          <span className="text-muted-foreground">Order Number</span>
                          <span className="font-medium">{order?.order_number || "Unavailable"}</span>
                        </div>
                        <div className="flex justify-between gap-4">
                          <span className="text-muted-foreground">Order Status</span>
                          <Badge variant="outline" className="capitalize">
                            {order?.status || "pending_payment"}
                          </Badge>
                        </div>
                        <div className="flex justify-between gap-4">
                          <span className="text-muted-foreground">Payment Status</span>
                          <Badge variant={statusConfig.badge} className="capitalize">
                            {paymentStatus}
                          </Badge>
                        </div>
                        <div className="flex justify-between gap-4">
                          <span className="text-muted-foreground">Total</span>
                          <span className="font-medium">
                            {formatCurrency(order?.total_amount ?? 0, order?.currency)}
                          </span>
                        </div>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardHeader className="pb-3">
                        <CardTitle className="text-base">Payment Details</CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-3 text-sm">
                        <div className="flex justify-between gap-4">
                          <span className="text-muted-foreground">Provider</span>
                          <span className="font-medium capitalize">{payment?.provider || "vesicash"}</span>
                        </div>
                        <div className="flex justify-between gap-4">
                          <span className="text-muted-foreground">Reference</span>
                          <span className="font-medium break-all text-right">{payment?.reference || "Unavailable"}</span>
                        </div>
                        <div className="flex justify-between gap-4">
                          <span className="text-muted-foreground">Created</span>
                          <span className="font-medium">
                            {order?.created_at ? new Date(order.created_at).toLocaleString() : "Unavailable"}
                          </span>
                        </div>
                        {payment?.completed_at && (
                          <div className="flex justify-between gap-4">
                            <span className="text-muted-foreground">Confirmed</span>
                            <span className="font-medium">{new Date(payment.completed_at).toLocaleString()}</span>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  </div>

                  {order && (
                    <Card className="mb-8">
                      <CardHeader>
                        <CardTitle className="text-base">Order Summary</CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        {order.order_items?.map((item) => (
                          <div key={item.id} className="flex items-center justify-between gap-4 border rounded-lg p-4">
                            <div className="flex items-center gap-4">
                                <img
                                  src={item.products?.main_image || "https://images.unsplash.com/photo-1581091226825-a6a2a5aee158?w=100&h=100&fit=crop"}
                                  alt={item.products?.name || "Product"}
                                  className="w-14 h-14 rounded object-cover border bg-muted"
                                  loading="lazy"
                                />
                                <div>
                                  <p className="font-medium">{item.products?.name || "Unknown item"}</p>
                                  <p className="text-sm text-muted-foreground">
                                    Qty: {item.quantity} × {formatCurrency(item.unit_price, order?.currency)}
                                  </p>
                                </div>
                              </div>
                              <p className="font-medium">
                                {formatCurrency(item.unit_price * item.quantity, order?.currency)}
                              </p>
                          </div>
                        ))}
                      </CardContent>
                    </Card>
                  )}

                  {showAccountPrompt && (
                    <Card className="mb-8 border-primary/20 bg-primary/5">
                      <CardHeader>
                        <CardTitle className="text-lg">Get stock alerts and discounts</CardTitle>
                      </CardHeader>
                      <CardContent className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                        <p className="text-sm text-muted-foreground">
                          Complete your customer profile to receive new stock updates, order notifications, and special offers.
                        </p>
                        <Button asChild>
                          <Link to="/profile/customer">Complete Account</Link>
                        </Button>
                      </CardContent>
                    </Card>
                  )}

                  <div className="flex flex-col sm:flex-row gap-4 justify-center">
                    {canResumePayment && (
                      <Button
                        variant="outline"
                        size="lg"
                        onClick={() => openPaymentLink(paymentLink)}
                      >
                        <ExternalLink className="h-4 w-4 mr-2" />
                        Continue Payment
                      </Button>
                    )}
                    {!FINAL_STATUSES.includes(paymentStatus) && (
                      <Button variant="outline" size="lg" onClick={fetchStatus}>
                        <RefreshCw className="h-4 w-4 mr-2" />
                        Refresh Status
                      </Button>
                    )}
                    <Button asChild size="lg">
                      <Link to="/orders">
                        <Package className="h-4 w-4 mr-2" />
                        View Orders
                      </Link>
                    </Button>
                    <Button asChild variant="outline" size="lg">
                      <Link to="/">
                        <Home className="h-4 w-4 mr-2" />
                        Back to Home
                      </Link>
                    </Button>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default CheckoutSuccess;
