import React, { useState } from "react";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Lock,
  ArrowLeft,
  CheckCircle,
  User,
  MapPin,
  ExternalLink
} from "lucide-react";
import { useQuote } from "@/context/QuoteContext";
import { useAuth } from "@/context/AuthContext";
import { useNavigate, Link } from "react-router-dom";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { mergeGuestCart } from "@/lib/supabase";
import { sendEmailOtp, verifyEmailOtp, type OtpFlowType } from "@/lib/emailOtp";
import { beginHostedPayment, preparePaymentPopup } from "@/lib/paymentRedirect";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSlot,
} from "@/components/ui/input-otp";
import { Loader2 } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { fetchCheckoutFxRate, type FxRateSnapshot } from "@/lib/fxRate";

const Checkout = () => {
  const { items, total, itemCount, updateQuantity, removeItem } = useQuote();
  const { user, profile } = useAuth();
  // ... (rest of imports)

  // ... (rest of imports)
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [isProcessing, setIsProcessing] = useState(false);
  const [useShippingAddress, setUseShippingAddress] = useState(false);
  const [sendReceipt, setSendReceipt] = useState(true);

  const [customerInfo, setCustomerInfo] = useState({
    firstName: profile?.full_name?.split(' ')[0] || "",
    lastName: profile?.full_name?.split(' ').slice(1).join(' ') || "",
    email: user?.email || "",
    phone: profile?.phone || "",
    company: profile?.company_name || "",
    address: profile?.address || "",
    city: "",
    state: "",
    zipCode: "",
    country: "Zambia"
  });

  const [shippingInfo, setShippingInfo] = useState({
    firstName: "",
    lastName: "",
    company: "",
    address: "",
    city: "",
    state: "",
    zipCode: "",
    country: "Zambia"
  });

  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [otpCode, setOtpCode] = useState("");
  const [otpFlowType, setOtpFlowType] = useState<OtpFlowType>('signup');
  const [isVerifyingOtp, setIsVerifyingOtp] = useState(false);
  const [resendTimer, setResendTimer] = useState(120);
  const [verifyAttempts, setVerifyAttempts] = useState(0);
  const [fxRateSnapshot, setFxRateSnapshot] = useState<FxRateSnapshot | null>(null);
  const [fxRateLoading, setFxRateLoading] = useState(true);
  const [fxRateError, setFxRateError] = useState<string | null>(null);

  React.useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isAuthModalOpen && resendTimer > 0) {
      interval = setInterval(() => {
        setResendTimer((prev) => prev - 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isAuthModalOpen, resendTimer]);

  React.useEffect(() => {
    let cancelled = false;

    const loadFxRate = async () => {
      try {
        setFxRateLoading(true);
        const response = await fetchCheckoutFxRate();

        if (!cancelled) {
          setFxRateSnapshot(response.fx_rate);
          setFxRateError(null);
        }
      } catch (error: unknown) {
        if (!cancelled) {
          setFxRateSnapshot(null);
          setFxRateError(error instanceof Error ? error.message : "Exchange rate is unavailable.");
        }
      } finally {
        if (!cancelled) {
          setFxRateLoading(false);
        }
      }
    };

    void loadFxRate();

    return () => {
      cancelled = true;
    };
  }, []);

  // Intercept Step 1 -> Step 2
  const handleCustomerInfoSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Check for existing lockout
    const lockoutUntil = localStorage.getItem('otp_lockout_until');
    if (lockoutUntil && parseInt(lockoutUntil) > Date.now()) {
      const minutesLeft = Math.ceil((parseInt(lockoutUntil) - Date.now()) / 60000);
      toast.error(`Too many attempts. Please try again in ${minutesLeft} minutes or contact support.`);
      return;
    }

    // If user is ALREADY logged in, proceed normally
    if (user) {
      setStep(2);
      return;
    }

    // Guest Authentication Flow
    try {
      setIsProcessing(true);
      const flowType = await sendEmailOtp({
        email: customerInfo.email,
        metadata: {
          full_name: `${customerInfo.firstName} ${customerInfo.lastName}`.trim(),
          phone: customerInfo.phone,
          company_name: customerInfo.company,
        },
      });

      setOtpFlowType(flowType);
      setResendTimer(120); // Reset timer 2 mins
      setVerifyAttempts(0);
      toast.success(
        flowType === 'magiclink'
          ? "Account found. Enter the 6-digit code sent to your email."
          : "Verification code sent to your email!"
      );
      setIsAuthModalOpen(true);
    } catch (error: unknown) {
      toast.error((error instanceof Error && error.message) || "Failed to send OTP");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleVerifyOtp = async () => {
    if (otpCode.length !== 6) {
      toast.error("Please enter the 6-digit verification code");
      return;
    }

    try {
      setIsVerifyingOtp(true);
      await verifyEmailOtp({
        email: customerInfo.email,
        token: otpCode,
        preferredFlow: otpFlowType,
      });

      toast.success("Authenticated successfully!");
      try {
        await mergeGuestCart();
      } catch (mergeError) {
        console.error('Cart merge failed after OTP verification:', mergeError);
      }
      setIsAuthModalOpen(false);
      localStorage.removeItem('otp_lockout_until'); // Clear any lockout
      setStep(2); // Proceed to Payment Step
    } catch (error: unknown) {
      console.error('OTP Verification Final Error:', error);
      const newAttempts = verifyAttempts + 1;
      setVerifyAttempts(newAttempts);

      if (newAttempts >= 3) {
        // SET PERMANENT LOCKOUT (1 HOUR)
        const lockoutTime = Date.now() + (60 * 60 * 1000); // 1 hour from now
        localStorage.setItem('otp_lockout_until', lockoutTime.toString());

        toast.error("Too many failed attempts. You are blocked for 1 hour. Contact support for assistance.");
        setIsAuthModalOpen(false);
        setVerifyAttempts(0);
      } else {
        toast.error(`Invalid verification code. Please check and try again. (${3 - newAttempts} attempts left)`);
      }
    } finally {
      setIsVerifyingOtp(false);
    }
  };

  const handleResendOtp = async () => {
    try {
      setResendTimer(120);
      setVerifyAttempts(0);
      const flowType = await sendEmailOtp({
        email: customerInfo.email,
        metadata: {
          full_name: `${customerInfo.firstName} ${customerInfo.lastName}`.trim(),
          phone: customerInfo.phone,
          company_name: customerInfo.company,
        },
      });
      setOtpFlowType(flowType);
      toast.success("New 6-digit code sent!");
    } catch (error: unknown) {
      toast.error("Failed to resend code: " + ((error instanceof Error && error.message) || "Unknown error"));
    }
  };

const handleCreateOrder = async (e: React.FormEvent) => {
    e.preventDefault();

    // Pre-check: verify cart has items locally before server call
    if (items.length === 0) {
      toast.error("Your cart is empty. Add items before checkout.");
      navigate('/catalog');
      return;
    }

    setIsProcessing(true);
    const paymentPopup = preparePaymentPopup();

    try {
      // 0. Strict Auth Guard (Auth-Only Checkout)
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();

      console.log("ACTIVE SESSION:", session);
      if (session) {
        console.log("JWT Access Token (truncated):", session.access_token.substring(0, 20) + "...");
        try {
          const payload = JSON.parse(atob(session.access_token.split('.')[1]));
          console.log("JWT Payload:", payload);
        } catch (e) {
          console.error("Failed to decode JWT payload:", e);
        }
      }

      if (sessionError || !session?.user) {
        console.error("No active session found:", sessionError);
        toast.error("Session expired or not found. Please log in again.");
        // Ideally open login modal here if available, or redirect
        navigate('/login?returnUrl=/checkout');
        setIsProcessing(false);
        return;
      }

      // Re-sync cart before checkout to ensure we have latest from DB
      try {
        const { mergeGuestCart, getCartItems } = await import('@/lib/supabase');
        await mergeGuestCart();
        const dbItems = await getCartItems();
        if (dbItems.length === 0) {
          // Check if local items exist but DB is empty - try to recover
          if (items.length > 0) {
            console.warn("Cart items exist locally but not in DB - proceeding with local items");
          } else {
            throw new Error("CART_EMPTY");
          }
        }
      } catch (syncError) {
        console.warn("Cart sync failed, proceeding with local state:", syncError);
      }

      // Debug: log cart items
      console.log("Checkout Items:", items);
      console.log("Checkout Total:", total);

      // Explicit Payload (Auth Only - SDK will inject JWT automatically)
      const payload = {
        delivery_address: useShippingAddress ? shippingInfo : customerInfo,
        customer_details: customerInfo,
        notes: null,
        payment_method: 'vesicash',
        send_receipt: sendReceipt
      };

      console.log('Sending Checkout Payload:', payload);

      // SDK automatically includes Authorization header from current session
      const validationResponse = await supabase.functions.invoke('validate-checkout', {
        body: payload,
        headers: {
          Authorization: `Bearer ${session.access_token}`
        }
      });

      if (validationResponse.error) {
        console.error('Checkout Validation Failed:', validationResponse.error);
        const errorBody = await validationResponse.error.context?.json?.().catch(() => validationResponse.error.context?.body) || validationResponse.error;
        console.error('Error Details:', errorBody);

        // Extract Reason
        const reason = (errorBody as { reason?: string; error?: string })?.reason || (errorBody as { reason?: string; error?: string })?.error || validationResponse.error.message;
        throw new Error(`Checkout Failed: ${reason}`);
      }

      const { order_id, payment_link } = validationResponse.data;

      if (!order_id) {
        throw new Error("Failed to create order record (No ID returned)");
      }

      // 2. Redirect to Payment Directly (Consolidated)
      if (payment_link) {
        const { usedPopup } = beginHostedPayment({
          navigate,
          orderId: order_id,
          paymentLink: payment_link,
          popup: paymentPopup,
        });

        toast.success(
          usedPopup
            ? "Payment window opened. You can track status in this page."
            : "Payment window was blocked. Continue payment from the status page."
        );
      } else {
        throw new Error("No payment link generated by secure channel.");
      }

    } catch (error: unknown) {
      if (paymentPopup && !paymentPopup.closed) {
        paymentPopup.close();
      }
      console.error('Checkout Process Error:', error);
      toast.error((error instanceof Error && error.message) || 'Failed to process checkout');
      setIsProcessing(false);
    }
  };

  // ... inside the render ...


  if (items.length === 0 && step !== 3) {
    return (
      <div className="min-h-screen bg-background">
        <Header cartItemsCount={0} onAuthClick={() => navigate('/login')} />
        <main className="container mx-auto px-4 py-8">
          <div className="max-w-2xl mx-auto text-center py-16">
            <h1 className="text-2xl font-bold text-foreground mb-4">
              Your cart is empty
            </h1>
            <p className="text-muted-foreground mb-8">
              Add some spare parts to your cart before proceeding to checkout.
            </p>
            <Button asChild size="lg">
              <Link to="/catalog">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Browse Parts
              </Link>
            </Button>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Header
        cartItemsCount={itemCount}
        onAuthClick={() => navigate('/login')}
      />

      <main className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          {/* Progress Steps */}
          <div className="flex items-center justify-center mb-8">
            <div className="flex items-center space-x-4">
              <div className={`flex items-center ${step >= 1 ? 'text-primary' : 'text-muted-foreground'}`}>
                <div className={`w-8 h-8 rounded-full flex items-center justify-center ${step >= 1 ? 'bg-primary text-primary-foreground' : 'bg-muted'}`}>
                  1
                </div>
                <span className="hidden sm:inline ml-2 font-medium">Customer Info</span>
              </div>
              <div className="w-8 h-px bg-border"></div>
              <div className={`flex items-center ${step >= 2 ? 'text-primary' : 'text-muted-foreground'}`}>
                <div className={`w-8 h-8 rounded-full flex items-center justify-center ${step >= 2 ? 'bg-primary text-primary-foreground' : 'bg-muted'}`}>
                  2
                </div>
                <span className="hidden sm:inline ml-2 font-medium">Payment</span>
              </div>
              <div className="w-8 h-px bg-border"></div>
              <div className={`flex items-center ${step >= 3 ? 'text-primary' : 'text-muted-foreground'}`}>
                <div className={`w-8 h-8 rounded-full flex items-center justify-center ${step >= 3 ? 'bg-primary text-primary-foreground' : 'bg-muted'}`}>
                  {step >= 3 ? <CheckCircle className="h-4 w-4" /> : '3'}
                </div>
                <span className="hidden sm:inline ml-2 font-medium">Confirmation</span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Main Content */}
            <div className="lg:col-span-2">
              {step === 1 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <User className="h-5 w-5" />
                      Customer Information
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <form onSubmit={handleCustomerInfoSubmit} className="space-y-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <Label htmlFor="firstName">First Name *</Label>
                          <Input
                            id="firstName"
                            required
                            value={customerInfo.firstName}
                            onChange={(e) => setCustomerInfo({ ...customerInfo, firstName: e.target.value })}
                          />
                        </div>
                        <div>
                          <Label htmlFor="lastName">Last Name *</Label>
                          <Input
                            id="lastName"
                            required
                            value={customerInfo.lastName}
                            onChange={(e) => setCustomerInfo({ ...customerInfo, lastName: e.target.value })}
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <Label htmlFor="email">Email *</Label>
                          <Input
                            id="email"
                            type="email"
                            required
                            value={customerInfo.email}
                            onChange={(e) => setCustomerInfo({ ...customerInfo, email: e.target.value })}
                          />
                        </div>
                        <div>
                          <Label htmlFor="phone">Phone *</Label>
                          <Input
                            id="phone"
                            type="tel"
                            required
                            value={customerInfo.phone}
                            onChange={(e) => setCustomerInfo({ ...customerInfo, phone: e.target.value })}
                          />
                        </div>
                      </div>

                      <div>
                        <Label htmlFor="company">Company/Farm Name</Label>
                        <Input
                          id="company"
                          value={customerInfo.company}
                          onChange={(e) => setCustomerInfo({ ...customerInfo, company: e.target.value })}
                        />
                      </div>

                      <div>
                        <Label htmlFor="address">Address</Label>
                        <Input
                          id="address"
                          value={customerInfo.address}
                          onChange={(e) => setCustomerInfo({ ...customerInfo, address: e.target.value })}
                        />
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div>
                          <Label htmlFor="city">City</Label>
                          <Input
                            id="city"
                            value={customerInfo.city}
                            onChange={(e) => setCustomerInfo({ ...customerInfo, city: e.target.value })}
                          />
                        </div>
                        <div>
                          <Label htmlFor="state">State/Province</Label>
                          <Input
                            id="state"
                            value={customerInfo.state}
                            onChange={(e) => setCustomerInfo({ ...customerInfo, state: e.target.value })}
                          />
                        </div>
                        <div>
                          <Label htmlFor="zipCode">ZIP/Postal Code</Label>
                          <Input
                            id="zipCode"
                            value={customerInfo.zipCode}
                            onChange={(e) => setCustomerInfo({ ...customerInfo, zipCode: e.target.value })}
                          />
                        </div>
                      </div>

                      <Button type="submit" size="lg" className="w-full">
                        Continue to Payment
                      </Button>
                    </form>
                  </CardContent>
                </Card>
              )}

              {step === 2 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <MapPin className="h-5 w-5" />
                      Shipping Information
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <form onSubmit={handleCreateOrder} className="space-y-4">
                      <div className="flex items-center space-x-2">
                        <Checkbox
                          id="useShippingAddress"
                          checked={useShippingAddress}
                          onCheckedChange={(checked) => setUseShippingAddress(checked === true)}
                        />
                        <Label htmlFor="useShippingAddress">
                          Ship to a different address
                        </Label>
                      </div>

                      {useShippingAddress && (
                        <div className="space-y-4 p-4 border rounded-lg">
                          <h4 className="font-medium">Shipping Address</h4>

                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <Label htmlFor="shippingFirstName">First Name *</Label>
                              <Input
                                id="shippingFirstName"
                                required
                                value={shippingInfo.firstName}
                                onChange={(e) => setShippingInfo({ ...shippingInfo, firstName: e.target.value })}
                              />
                            </div>
                            <div>
                              <Label htmlFor="shippingLastName">Last Name *</Label>
                              <Input
                                id="shippingLastName"
                                required
                                value={shippingInfo.lastName}
                                onChange={(e) => setShippingInfo({ ...shippingInfo, lastName: e.target.value })}
                              />
                            </div>
                          </div>

                          <div>
                            <Label htmlFor="shippingCompany">Company/Farm Name</Label>
                            <Input
                              id="shippingCompany"
                              value={shippingInfo.company}
                              onChange={(e) => setShippingInfo({ ...shippingInfo, company: e.target.value })}
                            />
                          </div>

                          <div>
                            <Label htmlFor="shippingAddress">Address *</Label>
                            <Input
                              id="shippingAddress"
                              required
                              value={shippingInfo.address}
                              onChange={(e) => setShippingInfo({ ...shippingInfo, address: e.target.value })}
                            />
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div>
                              <Label htmlFor="shippingCity">City *</Label>
                              <Input
                                id="shippingCity"
                                required
                                value={shippingInfo.city}
                                onChange={(e) => setShippingInfo({ ...shippingInfo, city: e.target.value })}
                              />
                            </div>
                            <div>
                              <Label htmlFor="shippingState">State/Province *</Label>
                              <Input
                                id="shippingState"
                                required
                                value={shippingInfo.state}
                                onChange={(e) => setShippingInfo({ ...shippingInfo, state: e.target.value })}
                              />
                            </div>
                            <div>
                              <Label htmlFor="shippingZipCode">ZIP/Postal Code *</Label>
                              <Input
                                id="shippingZipCode"
                                required
                                value={shippingInfo.zipCode}
                                onChange={(e) => setShippingInfo({ ...shippingInfo, zipCode: e.target.value })}
                              />
                            </div>
                          </div>
                        </div>
                      )}

                      <div className="flex items-center gap-2 text-sm text-muted-foreground bg-muted p-3 rounded-md">
                        <Lock className="h-4 w-4" />
                        Secure payment processing via Vesicash. Exchange rates are based on current market data and may vary before payment is confirmed.
                      </div>

                      <div>
                        <p className="text-sm text-muted-foreground">
                          You will be redirected to our secure payment partner to complete your purchase.
                        </p>
                      </div>

                      <div className="flex items-center space-x-2 pt-2">
                        <Checkbox
                          id="sendReceipt"
                          checked={sendReceipt}
                          onCheckedChange={(checked) => setSendReceipt(checked === true)}
                        />
                        <Label htmlFor="sendReceipt">
                          Email me a copy of the order receipt
                        </Label>
                      </div>

                      <div className="flex flex-col sm:flex-row gap-4 pt-4">
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => setStep(1)}
                          className="w-full sm:flex-1"
                        >
                          <ArrowLeft className="h-4 w-4 mr-2" />
                          Back
                        </Button>
<Button
                          type="submit"
                          disabled={isProcessing}
                          className="w-full sm:flex-1 bg-primary hover:bg-primary-hover"
                        >
                          {isProcessing ? "Creating Order..." : (
                            <>
                              Proceed to Payment
                              <ExternalLink className="h-4 w-4 ml-2" />
                            </>
                          )}
                        </Button>
                        {fxRateError && (
                          <p className="text-xs text-yellow-600 mt-1">
                            FX rate unavailable - using fallback pricing
                          </p>
                        )}
                      </div>
                    </form>
                  </CardContent>
                </Card>
              )}

              {step === 3 && (
                <Card>
                  <CardContent className="text-center py-12">
                    <CheckCircle className="h-16 w-16 text-success mx-auto mb-6" />
                    <h2 className="text-2xl font-bold text-foreground mb-4">
                      Order Confirmed!
                    </h2>
                    <p className="text-muted-foreground mb-8">
                      Thank you for your order. We'll send you a confirmation email shortly with tracking information.
                    </p>

                    <div className="bg-muted/30 rounded-lg p-6 mb-8 max-w-md mx-auto text-left">
                      <h4 className="font-medium mb-4">Order Summary</h4>
                      <div className="space-y-3">
                        {items.map((item) => {
                          const symbol = item.currency === 'ZMW' ? 'K' : item.currency === 'USD' ? '$' : `${item.currency} `;
                          return (
                            <div key={item.id} className="flex justify-between text-sm">
                              <span className="text-muted-foreground">{item.name} x{item.quantity}</span>
                              <span>{symbol}{(item.price * item.quantity).toLocaleString()}</span>
                            </div>
                          );
                        })}
                        <Separator className="my-2" />
                        <div className="flex justify-between font-bold">
                          <span>Total</span>
                          <span className="text-primary">
                            {items[0]?.currency === 'ZMW' ? 'K' : items[0]?.currency === 'USD' ? '$' : (items[0]?.currency || '$')}
                            {total.toLocaleString()}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="flex gap-4 justify-center">
                      <Button asChild size="lg">
                        <Link to="/catalog">
                          Continue Shopping for Parts
                        </Link>
                      </Button>
                      <Button asChild variant="outline" size="lg">
                        <Link to="/">
                          Back to Home
                        </Link>
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>

            {/* Order Summary Sidebar */}
            {step !== 3 && (
              <div className="lg:col-span-1">
                <Card className="sticky top-8">
                  <CardHeader>
                    <CardTitle>Order Summary</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {items.map((item) => (
                      <div key={item.id} className="flex gap-3">
                        <img
                          src={item.image}
                          alt={item.name}
                          className="w-12 h-12 object-cover rounded"
                          loading="lazy"
                        />
                        <div className="flex-1">
                          <h4 className="font-medium text-sm">{item.name}</h4>
                          <div className="flex justify-between items-center text-sm text-muted-foreground mt-1">
                            <div className="flex items-center gap-1 border rounded-md p-1">
                              <Button
                                size="icon"
                                variant="ghost"
                                className="h-6 w-6"
                                type="button"
                                onClick={() => {
                                  if (item.quantity <= 1) {
                                    removeItem(item.id);
                                  } else {
                                    updateQuantity(item.id, item.quantity - 1);
                                  }
                                }}
                              >
                                <span className="text-lg leading-none mb-1">-</span>
                              </Button>
                              <span className="text-sm font-medium w-6 text-center">{item.quantity}</span>
                              <Button
                                size="icon"
                                variant="ghost"
                                className="h-6 w-6"
                                type="button"
                                onClick={() => updateQuantity(item.id, item.quantity + 1)}
                              >
                                <span className="text-lg leading-none mb-1">+</span>
                              </Button>
                            </div>
                            <span>
                              {item.currency === 'ZMW' ? 'K' : item.currency === 'USD' ? '$' : `${item.currency} `}
                              {(item.price * item.quantity).toLocaleString()}
                            </span>
                          </div>
                        </div>
                      </div>
                    ))}

                    <Separator />

                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span>Subtotal</span>
                        <span>
                          {items[0]?.currency === 'ZMW' ? 'K' : items[0]?.currency === 'USD' ? '$' : (items[0]?.currency || '$')}
                          {total.toLocaleString()}
                        </span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span>Shipping</span>
                        <span>TBD</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span>Tax</span>
                        <span>TBD</span>
                      </div>
                    </div>

                    <Separator />

                    <div className="flex justify-between font-semibold">
                      <span>Total</span>
                      <span className="text-primary">
                        {items[0]?.currency === 'ZMW' ? 'K' : items[0]?.currency === 'USD' ? '$' : (items[0]?.currency || '$')}
                        {total.toLocaleString()}
                      </span>
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}
          </div>
        </div>
      </main>

      <Footer />

      {/* Guest OTP Authentication Modal */}
      <Dialog open={isAuthModalOpen} onOpenChange={setIsAuthModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Verify Email to Continue</DialogTitle>
            <DialogDescription>
              We've sent a code to <strong>{customerInfo.email}</strong>.
              Enter the 6-digit code below to continue to payment.
            </DialogDescription>
          </DialogHeader>

          <div className="flex flex-col items-center justify-center space-y-6 py-4">
            <InputOTP
              maxLength={6}
              value={otpCode}
              onChange={(value) => setOtpCode(value)}
              disabled={isVerifyingOtp}
            >
              <InputOTPGroup>
                <InputOTPSlot index={0} />
                <InputOTPSlot index={1} />
                <InputOTPSlot index={2} />
                <InputOTPSlot index={3} />
                <InputOTPSlot index={4} />
                <InputOTPSlot index={5} />
              </InputOTPGroup>
            </InputOTP>

            <div className="flex flex-col w-full gap-3">
              <Button
                onClick={handleVerifyOtp}
                disabled={isVerifyingOtp || otpCode.length !== 6}
                className="w-full"
              >
                {isVerifyingOtp ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Verifying...
                  </>
                ) : (
                  "Verify & Continue"
                )}
              </Button>

              <Button
                variant="ghost"
                size="sm"
                onClick={handleResendOtp}
                disabled={resendTimer > 0 || isVerifyingOtp}
                className="text-xs"
              >
                {resendTimer > 0
                  ? `Resend code in ${resendTimer}s`
                  : "Didn't receive a code? Resend"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Checkout;
