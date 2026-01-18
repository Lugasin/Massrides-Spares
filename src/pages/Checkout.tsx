import React, { useState } from "react";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  CreditCard,
  Lock,
  ArrowLeft,
  CheckCircle,
  User,
  MapPin,
  Phone,
  Mail,
  ExternalLink
} from "lucide-react";
import { useQuote } from "@/context/QuoteContext";
import { useAuth } from "@/context/AuthContext";
import { useNavigate, Link } from "react-router-dom";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
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

const Checkout = () => {
  const { items, total, itemCount, clearCart, updateQuantity, removeItem } = useQuote();
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
  const [isVerifyingOtp, setIsVerifyingOtp] = useState(false);
  const [resendTimer, setResendTimer] = useState(120);
  const [verifyAttempts, setVerifyAttempts] = useState(0);

  React.useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isAuthModalOpen && resendTimer > 0) {
      interval = setInterval(() => {
        setResendTimer((prev) => prev - 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isAuthModalOpen, resendTimer]);

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

      // 1. Check if user already exists
      const { data: checkData, error: checkError } = await supabase.functions.invoke('check-email', {
        body: { email: customerInfo.email }
      });

      if (checkError) throw checkError;

      if (checkData?.exists) {
        toast.info("You already have an account! Please log in.");
        // Redirect to login with email pre-filled and return URL
        navigate(`/login?email=${encodeURIComponent(customerInfo.email)}&returnUrl=/checkout`);
        return;
      }

      // 2. If new user, send OTP
      const { error } = await supabase.auth.signInWithOtp({
        email: customerInfo.email,
        options: {
          shouldCreateUser: true, // Only create if not exists (redundant check but safe)
        }
      });

      if (error) throw error;

      setResendTimer(120); // Reset timer 2 mins
      setVerifyAttempts(0);
      toast.success("OTP sent to your email!");
      setIsAuthModalOpen(true);
    } catch (error: any) {
      toast.error(error.message || "Failed to send OTP");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleVerifyOtp = async () => {
    if (otpCode.length < 6 || otpCode.length > 8) {
      toast.error("Please enter a valid verification code (6-8 digits)");
      return;
    }

    try {
      setIsVerifyingOtp(true);

      // Attempt 1: Try as 'signup' (most likely for this flow)
      let { data, error } = await supabase.auth.verifyOtp({
        email: customerInfo.email,
        token: otpCode,
        type: 'signup',
      });

      // Attempt 2: If failed, try as 'magiclink' (if user implicitly existed)
      if (error) {
        console.log('Signup verification failed, trying magiclink...');
        const retry1 = await supabase.auth.verifyOtp({
          email: customerInfo.email,
          token: otpCode,
          type: 'magiclink',
        });
        error = retry1.error;
        data = retry1.data;
      }

      // Attempt 3: If failed, try as generic 'email'
      if (error) {
        console.log('Magiclink verification failed, trying generic email...');
        const retry2 = await supabase.auth.verifyOtp({
          email: customerInfo.email,
          token: otpCode,
          type: 'email',
        });
        error = retry2.error;
        data = retry2.data;
      }

      if (error) throw error;

      toast.success("Authenticated successfully!");
      setIsAuthModalOpen(false);
      localStorage.removeItem('otp_lockout_until'); // Clear any lockout
      setStep(2); // Proceed to Payment Step
    } catch (error: any) {
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
      const { error } = await supabase.auth.signInWithOtp({
        email: customerInfo.email,
        options: { shouldCreateUser: true }
      });
      if (error) throw error;
      toast.success("New code sent!");
    } catch (error: any) {
      toast.error("Failed to resend code: " + error.message);
    }
  };

  const [paymentProcessingMessage, setPaymentProcessingMessage] = useState<string | null>(null);

  const handleCreateOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsProcessing(true);
    setPaymentProcessingMessage("Initializing secure payment...");

    try {
      // 1. Validate Checkout & Create Order (Server-Side)
      toast.info("Validating order...");

      const session_id = localStorage.getItem('guest_session_id');
      const { data: { user } } = await supabase.auth.getUser();

      const validationResponse = await supabase.functions.invoke('validate-checkout', {
        body: {
          user_id: user?.id,
          guest_session_id: session_id
        }
      });

      if (validationResponse.error) {
        throw new Error(validationResponse.error.message || 'Validation failed');
      }

      const { order_id, total, order_reference } = validationResponse.data;

      if (!order_id) {
        throw new Error("Failed to create order record");
      }

      // 2. Initialize Payment Session (Fintech-Grade)
      toast.info("Connecting to secure payment gateway...");

      const paymentResponse = await supabase.functions.invoke('create-payment-session', {
        body: {
          order_id: order_id, // Pass UUID from validate-checkout
          return_url: `${window.location.origin}/checkout/success`
        }
      });

      if (paymentResponse.error) {
        throw new Error(paymentResponse.error.message || 'Payment session creation failed');
      }

      const { checkout_url, error } = paymentResponse.data;

      if (error) throw new Error(error);

      // 3. Redirect to Payment
      if (checkout_url) {
        toast.success("Redirecting to payment...");
        window.location.href = checkout_url;
      } else {
        throw new Error("No payment URL received via secure channel.");
      }

    } catch (error: any) {
      console.error('Checkout error:', error);
      toast.error(error.message || 'Failed to process checkout');
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
                        Secure payment processing via Vesicash
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
                        {items.map((item) => (
                          <div key={item.id} className="flex justify-between text-sm">
                            <span className="text-muted-foreground">{item.name} x{item.quantity}</span>
                            <span>${(item.price * item.quantity).toLocaleString()}</span>
                          </div>
                        ))}
                        <Separator className="my-2" />
                        <div className="flex justify-between font-bold">
                          <span>Total</span>
                          <span className="text-primary">${total.toLocaleString()}</span>
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
                            <span>${(item.price * item.quantity).toLocaleString()}</span>
                          </div>
                        </div>
                      </div>
                    ))}

                    <Separator />

                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span>Subtotal</span>
                        <span>${total.toLocaleString()}</span>
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
                      <span className="text-primary">${total.toLocaleString()}</span>
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
              We sent a verification code to <strong>{customerInfo.email}</strong>.
              Please enter it below to secure your order.
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col items-center justify-center space-y-4 py-4">
            <InputOTP
              maxLength={8}
              value={otpCode}
              onChange={(value) => setOtpCode(value)}
            >
              <InputOTPGroup>
                <InputOTPSlot index={0} />
                <InputOTPSlot index={1} />
                <InputOTPSlot index={2} />
                <InputOTPSlot index={3} />
              </InputOTPGroup>
              <InputOTPGroup>
                <InputOTPSlot index={4} />
                <InputOTPSlot index={5} />
                <InputOTPSlot index={6} />
                <InputOTPSlot index={7} />
              </InputOTPGroup>
            </InputOTP>

            <div className="flex gap-2 w-full mt-4">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => setIsAuthModalOpen(false)}
                disabled={isVerifyingOtp}
              >
                Cancel
              </Button>
              <Button
                className="flex-1"
                onClick={handleVerifyOtp}
                disabled={isVerifyingOtp || otpCode.length < 6}
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
            </div>
            <p className="text-xs text-muted-foreground text-center px-4">
              By verifying, you create a secure account to track your order and receive updates.
            </p>

            <div className="text-center w-full mt-2">
              {resendTimer > 0 ? (
                <p className="text-sm text-muted-foreground">
                  Resend code in <span className="font-medium text-foreground">{resendTimer}s</span>
                </p>
              ) : (
                <Button
                  variant="link"
                  size="sm"
                  className="text-primary h-auto p-0"
                  onClick={handleResendOtp}
                >
                  Resend Code
                </Button>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Checkout;