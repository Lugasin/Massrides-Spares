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
  ExternalLink,
  Loader2
} from "lucide-react";
import { useQuote } from "@/context/QuoteContext";
import { useAuth } from "@/context/AuthContext";
import { useNavigate, Link } from "react-router-dom";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
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
import { useCurrency } from "@/context/CurrencyContext";

const Checkout = () => {
  const { items, total, updateQuantity, removeItem } = useQuote();
  const { user, profile } = useAuth();
  const { formatPrice } = useCurrency();
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

  const handleInfoSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setStep(2);
  };

  const handleCreateOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsProcessing(true);

    const paymentPopup = preparePaymentPopup();

    try {
      const payload = {
        customer_info: customerInfo,
        shipping_info: useShippingAddress ? shippingInfo : null,
        payment_method: 'vesicash',
        send_receipt: sendReceipt
      };

      const { data, error } = await supabase.functions.invoke('create-order', {
        body: payload
      });

      if (error || !data.success) {
        throw new Error(data?.error || error?.message || "Checkout Failed");
      }

      const { order_id, payment_link } = data;

      if (payment_link) {
        beginHostedPayment({
          navigate,
          orderId: order_id,
          paymentLink: payment_link,
          popup: paymentPopup,
        });
        toast.success("Redirecting to payment...");
      } else {
        throw new Error("No payment link returned");
      }
    } catch (err: any) {
      console.error("Order creation error:", err);
      toast.error(err.message);
      if (paymentPopup) paymentPopup.close();
    } finally {
      setIsProcessing(false);
    }
  };

  if (items.length === 0 && step !== 3) {
      return (
          <div className="min-h-screen bg-background flex flex-col">
              <Header />
              <main className="flex-1 flex items-center justify-center">
                  <div className="text-center">
                      <h2 className="text-2xl font-bold mb-4">Your cart is empty</h2>
                      <Button asChild>
                          <Link to="/catalog">Browse Catalog</Link>
                      </Button>
                  </div>
              </main>
              <Footer />
          </div>
      );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Header />
      <main className="flex-1 py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2">
              {step === 1 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <User className="h-5 w-5 text-primary" />
                      Customer Information
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <form onSubmit={handleInfoSubmit} className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="firstName">First Name</Label>
                          <Input
                            id="firstName"
                            required
                            value={customerInfo.firstName}
                            onChange={(e) => setCustomerInfo({...customerInfo, firstName: e.target.value})}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="lastName">Last Name</Label>
                          <Input
                            id="lastName"
                            required
                            value={customerInfo.lastName}
                            onChange={(e) => setCustomerInfo({...customerInfo, lastName: e.target.value})}
                          />
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="email">Email Address</Label>
                        <Input
                          id="email"
                          type="email"
                          required
                          value={customerInfo.email}
                          onChange={(e) => setCustomerInfo({...customerInfo, email: e.target.value})}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="phone">Phone Number</Label>
                        <Input
                          id="phone"
                          type="tel"
                          value={customerInfo.phone}
                          onChange={(e) => setCustomerInfo({...customerInfo, phone: e.target.value})}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="address">Address</Label>
                        <Input
                          id="address"
                          required
                          value={customerInfo.address}
                          onChange={(e) => setCustomerInfo({...customerInfo, address: e.target.value})}
                        />
                      </div>
                      <Button type="submit" className="w-full">Next: Shipping & Payment</Button>
                    </form>
                  </CardContent>
                </Card>
              )}

              {step === 2 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Lock className="h-5 w-5 text-primary" />
                      Payment
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <form onSubmit={handleCreateOrder} className="space-y-6">
                      <div className="p-4 bg-muted/30 rounded-lg border border-primary/20">
                        <h4 className="font-semibold mb-2 flex items-center gap-2">
                          <CheckCircle className="h-4 w-4 text-primary" />
                          Vesicash Escrow Payment
                        </h4>
                        <p className="text-sm text-muted-foreground">
                          Your payment will be held in escrow until your order is delivered. Safe and secure.
                        </p>
                      </div>

                      <div className="flex items-center space-x-2">
                        <Checkbox
                          id="sendReceipt"
                          checked={sendReceipt}
                          onCheckedChange={(checked) => setSendReceipt(checked === true)}
                        />
                        <Label htmlFor="sendReceipt">Email me a copy of the order receipt</Label>
                      </div>

                      <div className="flex gap-4">
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => setStep(1)}
                          className="flex-1"
                        >
                          <ArrowLeft className="h-4 w-4 mr-2" />
                          Back
                        </Button>
                        <Button
                          type="submit"
                          disabled={isProcessing}
                          className="flex-1"
                        >
                          {isProcessing ? <Loader2 className="animate-spin h-4 w-4" /> : "Pay Now"}
                        </Button>
                      </div>
                    </form>
                  </CardContent>
                </Card>
              )}
            </div>

            <div className="lg:col-span-1">
              <Card className="sticky top-8">
                <CardHeader>
                  <CardTitle>Order Summary</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {items.map((item) => (
                    <div key={item.id} className="flex gap-3">
                      <img src={item.image} alt={item.name} className="w-12 h-12 object-cover rounded" />
                      <div className="flex-1">
                        <h4 className="font-medium text-sm">{item.name}</h4>
                        <div className="flex justify-between text-sm text-muted-foreground">
                          <span>Qty: {item.quantity}</span>
                          <span>{formatPrice(item.price * item.quantity)}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                  <Separator />
                  <div className="flex justify-between font-bold text-lg">
                    <span>Total</span>
                    <span className="text-primary">{formatPrice(total)}</span>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default Checkout;
