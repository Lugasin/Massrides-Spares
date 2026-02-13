import React, { useState } from 'react';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from "@/components/ui/checkbox";
import {
  Mail,
  User,
  ShieldCheck,
  ArrowRight,
  CheckCircle,
  CreditCard,
  ExternalLink,
  ArrowLeft,
  Phone,
  MapPin
} from 'lucide-react';
import { useQuote } from '@/context/QuoteContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useNavigate, Link } from 'react-router-dom';

/**
 * Guest Checkout - Payment First, Account Later
 * 
 * Flow:
 * 1. Customer Info (email, phone, name, address) - NO AUTH REQUIRED
 * 2. Order Review + Proceed to Payment
 * 3. Redirect to Vesicash payment page
 * 4. On success page: Optional "Create Account" prompt
 */

const GuestCheckout = () => {
  const { items, total, itemCount, clearCart } = useQuote();
  const navigate = useNavigate();

  // Guest session for cart tracking
  const [sessionId] = useState(() => localStorage.getItem('guest_session_id') || '');

  // Steps: 1 = Info, 2 = Review & Pay
  const [step, setStep] = useState(1);

  // Form state
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [name, setName] = useState('');
  const [address, setAddress] = useState('');
  const [city, setCity] = useState('');
  const [country, setCountry] = useState('Zambia');

  // Processing state
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingMessage, setProcessingMessage] = useState<string | null>(null);
  const [sendReceipt, setSendReceipt] = useState(true);

  // ==========================================
  // Step 1: Collect Customer Info
  // ==========================================

  const handleInfoSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!email || !name) {
      toast.error('Please enter your name and email');
      return;
    }

    if (!address || !city) {
      toast.error('Please enter your shipping address');
      return;
    }

    // Move to payment step - NO OTP REQUIRED!
    setStep(2);
    toast.success('Information saved! Review your order and proceed to payment.');
  };

  // ==========================================
  // Step 2: Create Order & Redirect to Payment
  // ==========================================

  const handleProceedToPayment = async () => {
    setIsProcessing(true);
    setProcessingMessage("Creating your order...");

    try {
      // ==========================================
      // 1. Create Order (Guest - No Auth)
      // ==========================================

      console.log('Creating guest order with session:', sessionId);

      const { data: orderData, error: orderError } = await supabase.functions.invoke('create-order', {
        body: {
          guest_email: email,
          guest_phone: phone,
          guest_name: name,
          guest_session_id: sessionId,
          shipping_info: {
            firstName: name.split(' ')[0],
            lastName: name.split(' ').slice(1).join(' ') || '',
            address,
            city,
            state: '',
            zipCode: '',
            country
          },
          send_receipt: sendReceipt
        }
      });

      if (orderError) {
        console.error('Order creation error:', orderError);
        throw new Error(orderError.message || 'Failed to create order');
      }

      if (!orderData?.success) {
        throw new Error(orderData?.error || 'Order creation failed');
      }

      const order = orderData.order;
      console.log('Order created:', order);

      setProcessingMessage("Initializing secure payment...");

      // ==========================================
      // 2. Create Payment Session
      // ==========================================

      const { data: paymentData, error: paymentError } = await supabase.functions.invoke('create-payment-session', {
        body: {
          order_id: order.id,
          customer_email: email,
          customer_name: name,
          return_url: `${window.location.origin}/checkout/success?order=${order.order_number}`,
          cancel_url: `${window.location.origin}/checkout/cancel?order=${order.order_number}`
        }
      });

      if (paymentError) {
        console.error('Payment session error:', paymentError);
        throw new Error(paymentError.message || 'Failed to create payment session');
      }

      if (!paymentData?.success && !paymentData?.checkout_url && !paymentData?.payment_url) {
        throw new Error(paymentData?.error || 'Payment session creation failed');
      }

      const redirectUrl = paymentData.checkout_url || paymentData.payment_url;
      console.log('Redirecting to payment:', redirectUrl);

      // ==========================================
      // 3. Clear Local Cart & Redirect
      // ==========================================

      clearCart();
      localStorage.removeItem('guest_session_id');

      // Store order info for success page
      sessionStorage.setItem('pending_order', JSON.stringify({
        order_number: order.order_number,
        email: email,
        total: order.total_amount
      }));

      // Redirect to payment page
      window.location.href = redirectUrl;

    } catch (error: any) {
      console.error('Checkout error:', error);
      toast.error(`Checkout failed: ${error.message}`);
      setProcessingMessage(null);
    } finally {
      setIsProcessing(false);
    }
  };

  // ==========================================
  // Empty Cart State
  // ==========================================

  if (items.length === 0) {
    return (
      <div className="min-h-screen bg-background">
        <Header cartItemsCount={0} />
        <main className="container mx-auto px-4 py-8">
          <div className="text-center py-16">
            <h1 className="text-2xl font-bold mb-4">Your cart is empty</h1>
            <Button onClick={() => navigate('/catalog')}>
              Browse Parts
            </Button>
          </div>
        </main>
      </div>
    );
  }

  // ==========================================
  // Render
  // ==========================================

  return (
    <div className="min-h-screen bg-background">
      <Header cartItemsCount={itemCount} />

      <main className="container mx-auto px-4 py-8">
        <div className="max-w-2xl mx-auto">
          {/* Back to Cart */}
          <div className="mb-6">
            <Button asChild variant="outline">
              <Link to="/cart">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Cart
              </Link>
            </Button>
          </div>

          {/* Progress Steps */}
          <div className="flex items-center justify-center mb-8">
            <div className="flex items-center space-x-4">
              <div className={`flex items-center ${step >= 1 ? 'text-primary' : 'text-muted-foreground'}`}>
                <div className={`w-8 h-8 rounded-full flex items-center justify-center ${step >= 1 ? 'bg-primary text-primary-foreground' : 'bg-muted'}`}>
                  {step > 1 ? <CheckCircle className="h-4 w-4" /> : '1'}
                </div>
                <span className="ml-2 font-medium">Your Info</span>
              </div>
              <div className="w-8 h-px bg-border"></div>
              <div className={`flex items-center ${step >= 2 ? 'text-primary' : 'text-muted-foreground'}`}>
                <div className={`w-8 h-8 rounded-full flex items-center justify-center ${step >= 2 ? 'bg-primary text-primary-foreground' : 'bg-muted'}`}>
                  2
                </div>
                <span className="ml-2 font-medium">Pay</span>
              </div>
            </div>
          </div>

          {/* Step 1: Customer Info */}
          {step === 1 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <User className="h-5 w-5" />
                  Your Information
                </CardTitle>
              </CardHeader>
              <CardContent>
                {/* No Account Required Banner */}
                <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
                  <div className="flex items-center gap-2 mb-2">
                    <ShieldCheck className="h-5 w-5 text-green-600" />
                    <h3 className="font-medium text-green-800">No Account Required</h3>
                  </div>
                  <p className="text-sm text-green-700">
                    Complete your purchase without signing up. You can create an account after payment to track your order.
                  </p>
                </div>

                {/* Order Summary */}
                <div className="bg-muted/30 rounded-lg p-4 mb-6">
                  <h4 className="font-medium mb-2">Order Summary</h4>
                  <div className="flex justify-between items-center">
                    <span>{itemCount} items</span>
                    <span className="text-xl font-bold text-primary">K{total.toLocaleString()}</span>
                  </div>
                </div>

                <form onSubmit={handleInfoSubmit} className="space-y-4">
                  {/* Name */}
                  <div>
                    <Label htmlFor="name">Full Name *</Label>
                    <Input
                      id="name"
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="John Doe"
                      required
                    />
                  </div>

                  {/* Email & Phone */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="email">Email *</Label>
                      <div className="relative">
                        <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                        <Input
                          id="email"
                          type="email"
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          placeholder="you@example.com"
                          className="pl-10"
                          required
                        />
                      </div>
                    </div>
                    <div>
                      <Label htmlFor="phone">Phone (optional)</Label>
                      <div className="relative">
                        <Phone className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                        <Input
                          id="phone"
                          type="tel"
                          value={phone}
                          onChange={(e) => setPhone(e.target.value)}
                          placeholder="+260 97 1234567"
                          className="pl-10"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Shipping Address */}
                  <div className="pt-4 border-t">
                    <h4 className="font-medium mb-3 flex items-center gap-2">
                      <MapPin className="h-4 w-4" />
                      Shipping Address
                    </h4>

                    <div className="space-y-4">
                      <div>
                        <Label htmlFor="address">Street Address *</Label>
                        <Input
                          id="address"
                          type="text"
                          value={address}
                          onChange={(e) => setAddress(e.target.value)}
                          placeholder="123 Main Street"
                          required
                        />
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <Label htmlFor="city">City *</Label>
                          <Input
                            id="city"
                            type="text"
                            value={city}
                            onChange={(e) => setCity(e.target.value)}
                            placeholder="Lusaka"
                            required
                          />
                        </div>
                        <div>
                          <Label htmlFor="country">Country</Label>
                          <Input
                            id="country"
                            type="text"
                            value={country}
                            onChange={(e) => setCountry(e.target.value)}
                            placeholder="Zambia"
                          />
                        </div>
                      </div>
                    </div>
                  </div>

                  <Button
                    type="submit"
                    className="w-full"
                    size="lg"
                  >
                    Continue to Payment
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </form>

                {/* Sign In Link */}
                <div className="mt-6 text-center">
                  <p className="text-sm text-muted-foreground mb-2">
                    Already have an account?
                  </p>
                  <Button asChild variant="outline" size="sm">
                    <Link to="/login?redirect=/checkout">
                      Sign In
                    </Link>
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Step 2: Review & Pay */}
          {step === 2 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CreditCard className="h-5 w-5" />
                  Review & Pay
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  {/* Customer Info Summary */}
                  <div className="bg-muted/30 rounded-lg p-4">
                    <div className="flex justify-between items-start mb-2">
                      <h4 className="font-medium">Shipping To</h4>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setStep(1)}
                      >
                        Edit
                      </Button>
                    </div>
                    <p className="font-medium">{name}</p>
                    <p className="text-sm text-muted-foreground">{email}</p>
                    {phone && <p className="text-sm text-muted-foreground">{phone}</p>}
                    <p className="text-sm text-muted-foreground mt-2">
                      {address}, {city}, {country}
                    </p>
                  </div>

                  {/* Order Items */}
                  <div className="bg-muted/30 rounded-lg p-4">
                    <h4 className="font-medium mb-3">Order Items</h4>
                    <div className="space-y-2">
                      {items.slice(0, 3).map((item) => (
                        <div key={item.id} className="flex justify-between text-sm">
                          <span>{item.name} x{item.quantity}</span>
                          <span>K{(item.price * item.quantity).toLocaleString()}</span>
                        </div>
                      ))}
                      {items.length > 3 && (
                        <div className="text-sm text-muted-foreground">
                          +{items.length - 3} more items
                        </div>
                      )}
                      <div className="border-t pt-2 mt-2">
                        <div className="flex justify-between font-medium">
                          <span>Total:</span>
                          <span className="text-xl font-bold text-primary">
                            K{total.toLocaleString()}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Receipt Option */}
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="sendReceipt"
                      checked={sendReceipt}
                      onCheckedChange={(checked) => setSendReceipt(checked === true)}
                    />
                    <Label htmlFor="sendReceipt">
                      Email me a receipt after payment
                    </Label>
                  </div>

                  {/* Pay Button */}
                  <div className="text-center">
                    <p className="text-sm text-muted-foreground mb-4">
                      You'll be redirected to our secure payment partner.
                    </p>

                    <Button
                      onClick={handleProceedToPayment}
                      disabled={isProcessing}
                      className="w-full bg-primary hover:bg-primary/90"
                      size="lg"
                    >
                      {isProcessing ? (
                        <>
                          <span className="animate-spin mr-2">⏳</span>
                          {processingMessage || 'Processing...'}
                        </>
                      ) : (
                        <>
                          Pay K{total.toLocaleString()}
                          <ExternalLink className="ml-2 h-4 w-4" />
                        </>
                      )}
                    </Button>

                    <div className="flex items-center justify-center gap-2 mt-4 text-xs text-muted-foreground">
                      <ShieldCheck className="h-4 w-4" />
                      <span>Secured by Vesicash</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Processing Overlay */}
          {isProcessing && (
            <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center">
              <Card className="w-full max-w-md p-6 shadow-lg border-primary/20">
                <div className="flex flex-col items-center space-y-4">
                  <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
                  <p className="text-lg font-medium">{processingMessage || "Processing..."}</p>
                  <p className="text-sm text-muted-foreground">Please do not close this window.</p>
                </div>
              </Card>
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default GuestCheckout;