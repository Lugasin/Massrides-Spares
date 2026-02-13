import React, { useEffect, useState } from "react";
import { useSearchParams, Link, useNavigate } from "react-router-dom";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  CheckCircle,
  Package,
  Home,
  UserPlus,
  Phone,
  Mail,
  ShieldCheck,
  ArrowRight
} from "lucide-react";
import { useQuote } from "@/context/QuoteContext";
import { useAuth } from "@/context/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

/**
 * Checkout Success Page
 * 
 * For guest checkouts, offers optional account creation to:
 * 1. Track orders
 * 2. Save addresses
 * 3. Link past orders
 */

const CheckoutSuccess = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { clearCart, itemCount } = useQuote();
  const { user } = useAuth();

  const [orderDetails, setOrderDetails] = useState<any>(null);
  const [pendingOrder, setPendingOrder] = useState<any>(null);

  // Account creation state
  const [showAccountCreate, setShowAccountCreate] = useState(false);
  const [phone, setPhone] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [otp, setOtp] = useState('');
  const [isCreating, setIsCreating] = useState(false);

  const success = searchParams.get('success');
  const status = searchParams.get('status');
  const merchantRef = searchParams.get('merchant_ref');
  const transactionId = searchParams.get('transaction_id');
  const orderId = searchParams.get('order') || merchantRef;

  useEffect(() => {
    // Get pending order from session storage
    const stored = sessionStorage.getItem('pending_order');
    if (stored) {
      try {
        setPendingOrder(JSON.parse(stored));
      } catch (e) {
        console.error('Failed to parse pending order:', e);
      }
    }

    // Clear cart on successful payment
    if (success === 'true' || orderId || status === 'success') {
      clearCart();

      const fetchOrder = async () => {
        if (!orderId) return;

        // Try to fetch by order number first
        let query = supabase
          .from('orders')
          .select(`
            *,
            order_items (
              quantity,
              price_snapshot,
            spare_part:spare_parts (
                name,
                images
              )
            )
          `);

        // Check if orderId is numeric (id) or string (order_number)
        if (/^\d+$/.test(orderId)) {
          query = query.eq('id', orderId);
        } else {
          query = query.ilike('id', `%${orderId.split('-')[1] || orderId}%`);
        }

        const { data, error } = await query.single();

        if (data) {
          setOrderDetails(data);
          // Show account creation for guest orders
          if (!data.user_id && !user) {
            setShowAccountCreate(true);
          }
        }
      };

      fetchOrder();
    }
  }, [success, status, merchantRef, transactionId, clearCart, orderId, user]);

  // Send OTP for account creation
  const handleSendOtp = async () => {
    if (!phone) {
      toast.error('Please enter your phone number');
      return;
    }

    setIsCreating(true);
    try {
      const { error } = await supabase.auth.signInWithOtp({
        phone: phone.startsWith('+') ? phone : `+260${phone.replace(/^0/, '')}`
      });

      if (error) throw error;

      setOtpSent(true);
      toast.success('Verification code sent to your phone');
    } catch (error: any) {
      console.error('OTP error:', error);
      // Fallback to email if phone fails
      if (pendingOrder?.email) {
        try {
          const { error: emailError } = await supabase.auth.signInWithOtp({
            email: pendingOrder.email
          });
          if (!emailError) {
            setOtpSent(true);
            toast.success('Verification code sent to your email');
            return;
          }
        } catch (e) { }
      }
      toast.error(error.message || 'Failed to send verification code');
    } finally {
      setIsCreating(false);
    }
  };

  // Verify OTP and create account
  const handleVerifyOtp = async () => {
    if (!otp || otp.length < 6) {
      toast.error('Please enter the 6-digit code');
      return;
    }

    setIsCreating(true);
    try {
      const { data, error } = await supabase.auth.verifyOtp({
        phone: phone.startsWith('+') ? phone : `+260${phone.replace(/^0/, '')}`,
        token: otp,
        type: 'sms'
      });

      if (error) throw error;

      // Account created! Now link orders
      toast.success('Account created successfully!');

      // Call Edge Function to attach past orders
      const { error: attachError } = await supabase.functions.invoke('attach-order-to-user', {
        body: { email: pendingOrder?.email }
      });

      if (!attachError) {
        toast.success('Your previous orders have been linked to your account.');
      }

      // Clear session storage
      sessionStorage.removeItem('pending_order');

      // Redirect to dashboard/profile
      setTimeout(() => {
        navigate('/profile');
      }, 1500);

    } catch (error: any) {
      console.error('Verify error:', error);
      toast.error(error.message || 'Verification failed');
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Header cartItemsCount={itemCount} />

      <main className="container mx-auto px-4 py-8">
        <div className="max-w-2xl mx-auto space-y-6">
          {/* Success Card */}
          <Card>
            <CardContent className="text-center py-12">
              <CheckCircle className="h-16 w-16 text-green-500 mx-auto mb-6" />
              <h1 className="text-3xl font-bold text-foreground mb-4">
                Thank You!
              </h1>
              <p className="text-muted-foreground mb-8">
                Your order has been placed successfully.
              </p>

              {/* Order Details */}
              {(orderDetails || pendingOrder) && (
                <div className="bg-muted/30 rounded-lg p-6 mb-8 text-left">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm mb-6">
                    <div>
                      <p className="text-muted-foreground">Order Number:</p>
                      <p className="font-medium">
                        {pendingOrder?.order_number || `#${String(orderDetails?.id || orderId).slice(0, 8)}`}
                      </p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Status:</p>
                      <p className="font-medium capitalize text-green-600">
                        Payment Received
                      </p>
                    </div>
                    {pendingOrder?.email && (
                      <div className="md:col-span-2">
                        <p className="text-muted-foreground">Confirmation sent to:</p>
                        <p className="font-medium">{pendingOrder.email}</p>
                      </div>
                    )}
                  </div>

                  {orderDetails?.order_items && (
                    <>
                      <h4 className="font-medium mb-4">Order Summary</h4>
                      <div className="space-y-3">
                        {orderDetails.order_items.map((item: any) => (
                          <div key={item.id} className="flex justify-between text-sm">
                            <span className="text-muted-foreground">
                              {item.spare_part?.name || item.product_name} x{item.quantity}
                            </span>
                            <span>K{((item.price_snapshot || item.price) * item.quantity).toLocaleString()}</span>
                          </div>
                        ))}
                        <div className="border-t pt-2 mt-2 flex justify-between font-bold">
                          <span>Total</span>
                          <span className="text-primary">
                            K{(orderDetails.total_amount || pendingOrder?.total)?.toLocaleString()}
                          </span>
                        </div>
                      </div>
                    </>
                  )}
                </div>
              )}

              {/* Navigation Buttons */}
              <div className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  You will receive an email confirmation shortly with your order details and tracking information.
                </p>

                <div className="flex flex-col sm:flex-row gap-4 justify-center">
                  <Button asChild size="lg">
                    <Link to="/catalog">
                      <Package className="h-4 w-4 mr-2" />
                      Continue Shopping
                    </Link>
                  </Button>
                  <Button asChild variant="outline" size="lg">
                    <Link to="/">
                      <Home className="h-4 w-4 mr-2" />
                      Back to Home
                    </Link>
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Account Creation Card (Guest Only) */}
          {showAccountCreate && !user && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <UserPlus className="h-5 w-5" />
                  Create an Account (Optional)
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
                  <div className="flex items-center gap-2 mb-2">
                    <ShieldCheck className="h-5 w-5 text-blue-600" />
                    <h4 className="font-medium text-blue-800">Benefits of Creating an Account</h4>
                  </div>
                  <ul className="text-sm text-blue-700 space-y-1 ml-7">
                    <li>• Track your order status</li>
                    <li>• View order history</li>
                    <li>• Save addresses for faster checkout</li>
                    <li>• Get exclusive offers</li>
                  </ul>
                </div>

                {!otpSent ? (
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="phone">Phone Number</Label>
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
                      <p className="text-xs text-muted-foreground mt-1">
                        Or we'll use your email: {pendingOrder?.email}
                      </p>
                    </div>

                    <Button
                      onClick={handleSendOtp}
                      disabled={isCreating}
                      className="w-full"
                    >
                      {isCreating ? 'Sending...' : 'Send Verification Code'}
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="otp">Verification Code</Label>
                      <Input
                        id="otp"
                        type="text"
                        value={otp}
                        onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                        placeholder="Enter 6-digit code"
                        className="text-center text-2xl tracking-widest"
                        maxLength={6}
                      />
                    </div>

                    <Button
                      onClick={handleVerifyOtp}
                      disabled={isCreating || otp.length < 6}
                      className="w-full"
                    >
                      {isCreating ? 'Verifying...' : 'Create Account'}
                    </Button>

                    <Button
                      variant="ghost"
                      onClick={() => setOtpSent(false)}
                      className="w-full"
                    >
                      Use a different phone number
                    </Button>
                  </div>
                )}

                <div className="mt-6 text-center">
                  <button
                    onClick={() => setShowAccountCreate(false)}
                    className="text-sm text-muted-foreground hover:text-foreground"
                  >
                    Skip for now
                  </button>
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

export default CheckoutSuccess;