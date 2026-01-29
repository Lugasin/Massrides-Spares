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
  ArrowLeft,
  Phone
} from 'lucide-react';
import { useQuote } from '@/context/QuoteContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useNavigate, Link } from 'react-router-dom';

const GuestCheckout = () => {
  const { items, total, itemCount, clearCart } = useQuote();
  const navigate = useNavigate();
  const [step, setStep] = useState(1); // 1: Info, 2: Payment
  const [pendingOrder, setPendingOrder] = useState<any>(null);
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [paymentProcessingMessage, setPaymentProcessingMessage] = useState<string | null>(null);

  useEffect(() => {
    const checkPendingOrder = async () => {
      const sessionId = localStorage.getItem('guest_session_id');
      if (!sessionId) return;
      const { data } = await supabase
        .from('orders')
        .select('*')
        .in('status', ['PENDING', 'PROCESSING', 'INITIATED'])
        .eq('guest_session_id', sessionId)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      if (data) setPendingOrder(data);
    };
    checkPendingOrder();
  }, []);

  const handleResumePayment = async () => {
    if (!pendingOrder) return;
    setIsProcessing(true);
    try {
        const { data, error } = await supabase.functions.invoke('create-payment-session', {
            body: { order_id: pendingOrder.id }
        });
        if (error) throw error;
        if (data.checkout_url) window.location.href = data.checkout_url;
    } catch (e: any) {
        toast.error("Failed to resume payment");
        setIsProcessing(false);
    }
  };

  const handleCancelOrder = async () => {
    if (!pendingOrder) return;
    try {
        await supabase.from('orders').update({ status: 'CANCELLED' }).eq('id', pendingOrder.id);
        setPendingOrder(null);
        toast.success("Order cancelled");
    } catch (e: any) {
        toast.error("Failed to cancel order");
    }
  };

  const handleInfoSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !phone || !firstName || !lastName) {
      toast.error('Please fill in all required fields');
      return;
    }
    setStep(2);
  };

  const handleProceedToPayment = async () => {
    setIsProcessing(true);
    setPaymentProcessingMessage("Initializing secure payment...");

    try {
      const sessionId = localStorage.getItem('guest_session_id');

      // 1. Create Order as Guest
      const { data: orderData, error: orderError } = await supabase.functions.invoke('create-order', {
        body: {
          guest_session_id: sessionId,
          customer_info: {
            email,
            phone,
            firstName,
            lastName,
            address: 'Guest Address',
            city: 'Guest City',
            country: 'Zambia',
          }
        }
      });

      if (orderError) throw new Error(orderError.message);
      const { order } = orderData;

      // 2. Create Payment Session
      const { data: paymentData, error: paymentError } = await supabase.functions.invoke('create-payment-session', {
        body: {
          order_id: order.id,
          return_url: `${window.location.origin}/checkout/success?order=${order.order_number}`
        }
      });

      if (paymentError) throw new Error(paymentError.message);

      if (paymentData.checkout_url) {
        toast.success("Redirecting to payment gateway...");
        window.location.href = paymentData.checkout_url;
      } else {
        throw new Error('No redirect URL received');
      }

    } catch (error: any) {
      console.error('Payment error:', error);
      toast.error(`Failed to process payment: ${error.message}`);
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
            <Button asChild variant="outline" size="sm">
              <Link to="/cart">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Cart
              </Link>
            </Button>
          </div>

          {pendingOrder && (
              <Card className="mb-8 border-yellow-200 bg-yellow-50">
                  <CardHeader>
                      <CardTitle className="text-yellow-800">Pending Order Found</CardTitle>
                  </CardHeader>
                  <CardContent>
                      <p className="text-yellow-700 mb-4 text-sm">
                          You have an unfinished order (#{pendingOrder.order_number}).
                          Would you like to complete the payment or start a new one?
                      </p>
                      <div className="flex gap-4">
                          <Button onClick={handleResumePayment} className="bg-yellow-600 hover:bg-yellow-700">
                              Resume Payment
                          </Button>
                          <Button variant="outline" onClick={handleCancelOrder}>
                              Cancel Order
                          </Button>
                      </div>
                  </CardContent>
              </Card>
          )}

          {/* Progress Steps */}
          <div className="flex items-center justify-center mb-8">
            <div className="flex items-center space-x-4">
              <div className={`flex items-center ${step >= 1 ? 'text-primary' : 'text-muted-foreground'}`}>
                <div className={`w-8 h-8 rounded-full flex items-center justify-center ${step >= 1 ? 'bg-primary text-primary-foreground' : 'bg-muted'}`}>
                  1
                </div>
                <span className="ml-2 font-medium">Info</span>
              </div>
              <div className="w-8 h-px bg-border"></div>
              <div className={`flex items-center ${step >= 2 ? 'text-primary' : 'text-muted-foreground'}`}>
                <div className={`w-8 h-8 rounded-full flex items-center justify-center ${step >= 2 ? 'bg-primary text-primary-foreground' : 'bg-muted'}`}>
                  2
                </div>
                <span className="ml-2 font-medium">Payment</span>
              </div>
            </div>
          </div>

          {step === 1 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <User className="h-5 w-5" />
                  Guest Information
                </CardTitle>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleInfoSubmit} className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="firstName">First Name *</Label>
                      <Input
                        id="firstName"
                        value={firstName}
                        onChange={(e) => setFirstName(e.target.value)}
                        placeholder="John"
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="lastName">Last Name *</Label>
                      <Input
                        id="lastName"
                        value={lastName}
                        onChange={(e) => setLastName(e.target.value)}
                        placeholder="Doe"
                        required
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="email">Email Address *</Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="email"
                        type="email"
                        className="pl-10"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="john@example.com"
                        required
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="phone">Phone Number *</Label>
                    <div className="relative">
                      <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="phone"
                        type="tel"
                        className="pl-10"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        placeholder="+260..."
                        required
                      />
                    </div>
                  </div>

                  <Button type="submit" className="w-full" size="lg">
                    Continue to Payment
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
                  <CreditCard className="h-5 w-5" />
                  Review & Pay
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  <div className="bg-muted/30 rounded-lg p-4">
                    <h4 className="font-medium mb-2">Order Summary</h4>
                    <div className="flex justify-between items-center mb-4">
                      <span>{itemCount} items</span>
                      <span className="text-xl font-bold text-primary">ZK {total.toLocaleString()}</span>
                    </div>
                    <div className="text-sm space-y-1 text-muted-foreground">
                        <p><strong>Name:</strong> {firstName} {lastName}</p>
                        <p><strong>Email:</strong> {email}</p>
                        <p><strong>Phone:</strong> {phone}</p>
                    </div>
                  </div>

                  <div className="text-center">
                    <p className="text-sm text-muted-foreground mb-4">
                      You will be redirected to Vesicash for secure payment processing.
                    </p>

                    <Button
                      onClick={handleProceedToPayment}
                      disabled={isProcessing}
                      className="w-full"
                      size="lg"
                    >
                      {isProcessing ? 'Processing...' : (
                        <>
                          Pay Now with Vesicash
                          <ExternalLink className="ml-2 h-4 w-4" />
                        </>
                      )}
                    </Button>

                    <div className="flex items-center justify-center gap-2 mt-4 text-xs text-muted-foreground">
                      <ShieldCheck className="h-4 w-4" />
                      <span>Secure Payment Verified</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {isProcessing && (
            <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center">
              <Card className="w-full max-w-md p-6 shadow-lg">
                <div className="flex flex-col items-center space-y-4">
                  <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
                  <p className="text-lg font-medium">{paymentProcessingMessage || "Processing..."}</p>
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