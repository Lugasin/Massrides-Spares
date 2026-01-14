import React, { useState } from 'react';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from "@/components/ui/checkbox";
import {
  Mail,
  User,
  ShieldCheck,
  ArrowRight,
  CheckCircle,
  CreditCard,
  ExternalLink,
  ArrowLeft
} from 'lucide-react';
import { useQuote } from '@/context/QuoteContext';
import { supabase } from '@/integrations/supabase/client';
import { mergeGuestCart } from '@/lib/supabase';
import { toast } from 'sonner';
import { useNavigate, Link } from 'react-router-dom';

const GuestCheckout = () => {
  const { items, total, itemCount, clearCart } = useQuote();
  const navigate = useNavigate(); // Hook must be first
  // Initialize from localStorage immediately
  const [sessionId] = useState(() => localStorage.getItem('guest_session_id') || '');
  const [step, setStep] = useState(1); // 1: Email, 2: Verification, 3: Payment
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [verificationCode, setVerificationCode] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [paymentProcessingMessage, setPaymentProcessingMessage] = useState<string | null>(null);
  const [sendReceipt, setSendReceipt] = useState(true);

  const handleSendVerification = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!email || !name) {
      toast.error('Please enter both name and email');
      return;
    }

    setIsVerifying(true);

    try {
      // Use Supabase Auth for OTP
      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: {
          shouldCreateUser: true,
          data: {
            full_name: name,
            role: 'customer' // Automatically make them a customer
          }
        }
      });

      if (error) throw error;

      toast.success('Verification code sent to your email.');
      setStep(2);
    } catch (error: any) {
      console.error('Error sending verification:', error);
      toast.error(`Failed to send verification code: ${error.message}`);
    } finally {
      setIsVerifying(false);
    }
  };

  const handleVerifyCode = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!verificationCode) {
      toast.error('Please enter the verification code');
      return;
    }

    setIsVerifying(true);

    try {
      // Verify OTP and sign in
      const { data, error } = await supabase.auth.verifyOtp({
        email,
        token: verificationCode,
        type: 'email'
      });

      if (error) throw error;

      if (data.session) {
        toast.success('Email verified successfully! You are now logged in.');

        // Explicitly merge cart before proceeding
        try {
          await mergeGuestCart();
          setStep(3);
        } catch (error) {
          console.error("Cart merge failed", error);
          // Still proceed, as they are logged in, but warn? 
          // Actually, if merge fails, their cart is empty. 
          // But create-order might check guest_session_id if provided.
          // Better to proceed.
          setStep(3);
        }
      } else {
        throw new Error('Verification successful but no session created.');
      }

    } catch (error: any) {
      console.error('Error verifying code:', error);
      toast.error(`Verification failed: ${error.message}`);
    } finally {
      setIsVerifying(false);
    }
  };

  const handleProceedToPayment = async () => {
    setIsProcessing(true);
    setPaymentProcessingMessage("Initializing secure payment...");
    toast.info("Proceeding to payment gateway...");

    // Add delay
    await new Promise(resolve => setTimeout(resolve, 1500));

    try {
      // Use state variable which persists even if localStorage is cleared by mergeGuestCart
      const currentSessionId = sessionId; // Use state

      // If not logged in and no guest session, we can't proceed
      const { data: { session } } = await supabase.auth.getSession();
      if (!session && !currentSessionId) {
        throw new Error("Session not found. Please start checkout again.");
      }

      // Create order using Edge Function
      const { data: orderData, error: orderError } = await supabase.functions.invoke('create-order', {
        body: {
          guest_session_id: currentSessionId,
          customer_info: {
            email,
            firstName: name.split(' ')[0],
            lastName: name.split(' ').slice(1).join(' '),
            address: 'Guest Address', // Minimal info for guest checkout
            city: 'Guest City',
            state: 'Guest State',
            zipCode: '00000',
            country: 'Zambia',
          },
          send_receipt: sendReceipt
        }
      });

      if (orderError) throw new Error(orderError.message);
      const { order } = orderData;

      // Create Payment session (Vesicash via generic endpoint)
      const { data: paymentData, error: paymentError } = await supabase.functions.invoke('create-payment-session', {
        body: {
          amount: order.total_amount,
          currency: 'USD',
          customer_email: email,
          customer_name: name,
          merchant_ref: order.order_number,
          public_key: import.meta.env.VITE_VESICASH_PUBLIC_KEY,
          success_url: `${window.location.origin}/checkout/success?order=${order.order_number}`,
          cancel_url: `${window.location.origin}/checkout/cancel?order=${order.order_number}`,
          webhook_url: `https://ocfljbhgssymtbjsunfr.supabase.co/functions/v1/handle-payment-webhook`
        }
      });

      if (paymentError) throw new Error(paymentError.message);

      // Redirect to payment page
      // Handle both potential response formats (generic or direct)
      const redirectUrl = paymentData.payment_url || paymentData.redirectUrl;
      if (redirectUrl) {
        window.open(redirectUrl, '_blank');
      } else {
        throw new Error('No redirect URL received from payment provider');
      }

      // Clear local cart
      clearCart();

      // Navigate to success page
      navigate(`/checkout/success?order=${order.order_number}`);

    } catch (error: any) {
      console.error('Payment error:', error);
      toast.error(`Failed to process payment: ${error.message}`);
    } finally {
      setIsProcessing(false);
    }
  };

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
        <Footer />
      </div>
    );
  }

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
                <span className="ml-2 font-medium">Email</span>
              </div>
              <div className="w-8 h-px bg-border"></div>
              <div className={`flex items-center ${step >= 2 ? 'text-primary' : 'text-muted-foreground'}`}>
                <div className={`w-8 h-8 rounded-full flex items-center justify-center ${step >= 2 ? 'bg-primary text-primary-foreground' : 'bg-muted'}`}>
                  {step > 2 ? <CheckCircle className="h-4 w-4" /> : '2'}
                </div>
                <span className="ml-2 font-medium">Verify</span>
              </div>
              <div className="w-8 h-px bg-border"></div>
              <div className={`flex items-center ${step >= 3 ? 'text-primary' : 'text-muted-foreground'}`}>
                <div className={`w-8 h-8 rounded-full flex items-center justify-center ${step >= 3 ? 'bg-primary text-primary-foreground' : 'bg-muted'}`}>
                  3
                </div>
                <span className="ml-2 font-medium">Payment</span>
              </div>
            </div>
          </div>

          {step === 1 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Mail className="h-5 w-5" />
                  Guest Checkout
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="mb-6">
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
                    <div className="flex items-center gap-2 mb-2">
                      <User className="h-5 w-5 text-blue-600" />
                      <h3 className="font-medium text-blue-800">Quick Guest Checkout</h3>
                    </div>
                    <p className="text-sm text-blue-700">
                      No account needed! Just verify your email and complete your purchase securely.
                    </p>
                  </div>

                  <div className="bg-muted/30 rounded-lg p-4 mb-6">
                    <h4 className="font-medium mb-2">Order Summary</h4>
                    <div className="flex justify-between items-center">
                      <span>{itemCount} items</span>
                      <span className="text-xl font-bold text-primary">${total.toLocaleString()}</span>
                    </div>
                  </div>
                </div>

                <form onSubmit={handleSendVerification} className="space-y-4">
                  <div>
                    <Label htmlFor="name">Full Name *</Label>
                    <Input
                      id="name"
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="Enter your full name"
                      required
                    />
                  </div>

                  <div>
                    <Label htmlFor="email">Email Address *</Label>
                    <Input
                      id="email"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="Enter your email address"
                      required
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      We'll send a verification code to this email
                    </p>
                  </div>

                  <Button
                    type="submit"
                    className="w-full"
                    size="lg"
                    disabled={isVerifying}
                  >
                    {isVerifying ? 'Sending...' : 'Send Verification Code'}
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </form>

                <div className="mt-6 text-center">
                  <p className="text-sm text-muted-foreground mb-4">
                    Already have an account?
                  </p>
                  <Button asChild variant="outline">
                    <Link to="/login">
                      Sign In Instead
                    </Link>
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {step === 2 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <ShieldCheck className="h-5 w-5" />
                  Verify Your Email
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-center mb-6">
                  <p className="text-muted-foreground">
                    We've sent a 6-digit verification code to:
                  </p>
                  <p className="font-medium text-primary">{email}</p>
                </div>

                <form onSubmit={handleVerifyCode} className="space-y-4">
                  <div>
                    <Label htmlFor="code">Verification Code</Label>
                    <Input
                      id="code"
                      type="text"
                      value={verificationCode}
                      onChange={(e) => setVerificationCode(e.target.value)}
                      placeholder="Enter 6-digit code"
                      maxLength={6}
                      className="text-center text-lg tracking-widest"
                      required
                    />
                  </div>

                  <Button
                    type="submit"
                    className="w-full"
                    size="lg"
                    disabled={isVerifying}
                  >
                    {isVerifying ? 'Verifying...' : 'Verify Email'}
                    <CheckCircle className="ml-2 h-4 w-4" />
                  </Button>

                  <Button
                    type="button"
                    variant="ghost"
                    className="w-full"
                    onClick={() => setStep(1)}
                  >
                    Change Email Address
                  </Button>
                </form>
              </CardContent>
            </Card>
          )}

          {step === 3 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CreditCard className="h-5 w-5" />
                  Complete Payment
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <CheckCircle className="h-5 w-5 text-green-600" />
                      <h3 className="font-medium text-green-800">Email Verified</h3>
                    </div>
                    <p className="text-sm text-green-700">
                      Your email has been verified. You can now proceed to payment.
                    </p>
                  </div>

                  <div className="bg-muted/30 rounded-lg p-4">
                    <h4 className="font-medium mb-3">Order Summary</h4>
                    <div className="space-y-2">
                      {items.slice(0, 3).map((item) => (
                        <div key={item.id} className="flex justify-between text-sm">
                          <span>{item.name} x{item.quantity}</span>
                          <span>${(item.price * item.quantity).toLocaleString()}</span>
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
                            ${total.toLocaleString()}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="text-center">
                    <p className="text-sm text-muted-foreground mb-4">
                      You will be redirected to our secure payment partner to complete your purchase.
                    </p>

                    <div className="flex items-center justify-center space-x-2 mb-4">
                      <Checkbox
                        id="sendReceipt"
                        checked={sendReceipt}
                        onCheckedChange={(checked) => setSendReceipt(checked === true)}
                      />
                      <Label htmlFor="sendReceipt">
                        Email me a copy of the order receipt
                      </Label>
                    </div>

                    <Button
                      onClick={handleProceedToPayment}
                      disabled={isProcessing}
                      className="w-full bg-primary hover:bg-primary-hover"
                      size="lg"
                    >
                      {isProcessing ? 'Processing...' : (
                        <>
                          Proceed to Payment
                          <ExternalLink className="ml-2 h-4 w-4" />
                        </>
                      )}
                    </Button>

                    <div className="flex items-center justify-center gap-2 mt-4 text-xs text-muted-foreground">
                      <ShieldCheck className="h-4 w-4" />
                      <span>Secure payment processing via Vesicash</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {isProcessing && (
            <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center">
              <Card className="w-full max-w-md p-6 shadow-lg border-primary/20">
                <div className="flex flex-col items-center space-y-4">
                  <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
                  <p className="text-lg font-medium">{paymentProcessingMessage || "Processing..."}</p>
                  <p className="text-sm text-muted-foreground">Please do not close this window.</p>
                </div>
              </Card>
            </div>
          )}
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default GuestCheckout;