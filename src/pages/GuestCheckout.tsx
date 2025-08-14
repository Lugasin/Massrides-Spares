import React, { useState } from 'react';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { 
  Mail, 
  User, 
  ShieldCheck, 
  ArrowRight,
  CheckCircle,
  CreditCard,
  ExternalLink
} from 'lucide-react';
import { useQuote } from '@/context/QuoteContext';
import { supabase } from '@/lib/supabaseClient';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';

const GuestCheckout = () => {
  const { items, total, itemCount, clearCart } = useQuote();
  const navigate = useNavigate();
  const [step, setStep] = useState(1); // 1: Email, 2: Verification, 3: Payment
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [verificationCode, setVerificationCode] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  const handleSendVerification = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email || !name) {
      toast.error('Please enter both name and email');
      return;
    }

    setIsVerifying(true);
    
    try {
      const sessionId = localStorage.getItem('guest_session_id') || crypto.randomUUID();
      localStorage.setItem('guest_session_id', sessionId);

      // Generate verification code (6 digits)
      const verificationCode = Math.floor(100000 + Math.random() * 900000).toString();

      // Store verification in database
      const { error } = await supabase
        .from('guest_verifications')
        .insert({
          email,
          verification_code: verificationCode,
          session_id: sessionId,
          expires_at: new Date(Date.now() + 60 * 60 * 1000).toISOString() // 1 hour
        });

      if (error) throw error;

      // For demo purposes, show the code (in production, send via email)
      toast.success(`Verification code: ${verificationCode} (Check your email)`);
      setStep(2);
    } catch (error: any) {
      console.error('Error sending verification:', error);
      toast.error('Failed to send verification code');
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
      const sessionId = localStorage.getItem('guest_session_id');
      
      // Check verification code
      const { data: verification, error } = await supabase
        .from('guest_verifications')
        .select('*')
        .eq('email', email)
        .eq('verification_code', verificationCode)
        .eq('session_id', sessionId)
        .is('verified_at', null)
        .gt('expires_at', new Date().toISOString())
        .single();

      if (error || !verification) {
        toast.error('Invalid or expired verification code');
        return;
      }

      // Mark as verified
      await supabase
        .from('guest_verifications')
        .update({ verified_at: new Date().toISOString() })
        .eq('id', verification.id);

      toast.success('Email verified successfully!');
      setStep(3);
    } catch (error: any) {
      console.error('Error verifying code:', error);
      toast.error('Verification failed');
    } finally {
      setIsVerifying(false);
    }
  };

  const handleProceedToPayment = async () => {
    setIsProcessing(true);
    
    try {
      // Create order for guest
      const orderData = {
        order_number: `ORD-${Date.now()}-${Math.random().toString(36).substring(2, 8).toUpperCase()}`,
        status: 'pending',
        payment_status: 'pending',
        total_amount: total,
        billing_address: {
          firstName: name.split(' ')[0],
          lastName: name.split(' ').slice(1).join(' '),
          email: email
        },
        shipping_address: {
          firstName: name.split(' ')[0],
          lastName: name.split(' ').slice(1).join(' '),
          email: email
        }
      };

      const { data: order, error: orderError } = await supabase
        .from('orders')
        .insert(orderData)
        .select()
        .single();

      if (orderError) throw orderError;

      // Create order items from guest cart
      const sessionId = localStorage.getItem('guest_session_id');
      const { data: guestCart } = await supabase
        .from('guest_carts')
        .select('id')
        .eq('session_id', sessionId)
        .single();

      if (guestCart) {
        const { data: cartItems } = await supabase
          .from('guest_cart_items')
          .select(`
            id,
            quantity,
            spare_part_id,
            spare_part:spare_parts(id, price, name)
          `)
          .eq('guest_cart_id', guestCart.id);

        if (cartItems) {
          const orderItems = cartItems.map(item => ({
            order_id: order.id,
            spare_part_id: item.spare_part_id,
            quantity: item.quantity,
            unit_price: (item.spare_part as any)?.price || 0
          }));

          await supabase
            .from('order_items')
            .insert(orderItems);
        }
      }

      // Create TJ payment session
      const response = await supabase.functions.invoke('tj-create-session', {
        body: {
          orderId: order.id,
          amount: total,
          currency: 'USD',
          returnSuccessUrl: `${window.location.origin}/checkout/success?order=${order.order_number}`,
          returnFailedUrl: `${window.location.origin}/checkout/cancel?order=${order.order_number}`,
          customerEmail: email,
          customerName: name
        }
      });

      if (response.error) throw response.error;

      // Redirect to TJ payment page
      window.open(response.data.redirectUrl, '_blank');
      
      // Clear guest cart
      if (guestCart) {
        await supabase
          .from('guest_cart_items')
          .delete()
          .eq('guest_cart_id', guestCart.id);
      }
      
      clearCart();
      
    } catch (error: any) {
      console.error('Payment error:', error);
      toast.error('Failed to process payment');
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
          {/* Back to Home */}
          <div className="mb-6">
            <Button asChild variant="outline">
              <a href="/">← Back to Home</a>
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
                  <div className="bg-muted/30 rounded-lg p-4">
                    <div className="flex justify-between items-center mb-2">
                      <span className="font-medium">Cart Total:</span>
                      <span className="text-xl font-bold text-primary">
                        ${total.toLocaleString()}
                      </span>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {itemCount} items in your cart
                    </p>
                  </div>

                  <div className="text-center">
                    <p className="text-sm text-muted-foreground mb-4">
                      You will be redirected to our secure payment partner to complete your purchase.
                    </p>
                    
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
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default GuestCheckout;