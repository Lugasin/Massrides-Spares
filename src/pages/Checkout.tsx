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

const Checkout = () => {
  const { items, total, itemCount, clearCart } = useQuote();
  const { user, profile } = useAuth();
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [isProcessing, setIsProcessing] = useState(false);
  const [useShippingAddress, setUseShippingAddress] = useState(false);
  
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

  const handleCustomerInfoSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setStep(2);
  };

  const handleCreateOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsProcessing(true);
    
    try {
      // Create order first
      const orderData = {
        customer_info: customerInfo,
        shipping_info: useShippingAddress ? shippingInfo : null,
        guest_session_id: !user ? localStorage.getItem('guest_session_id') : null
      };

      const token = user ? (await supabase.auth.getSession())?.data.session?.access_token : null;
      
      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/create-order`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token && { 'Authorization': `Bearer ${token}` })
        },
        body: JSON.stringify(orderData)
      });

      const orderResult = await response.json();
      
      if (!orderResult.success) {
        throw new Error(orderResult.error || 'Failed to create order');
      }

      // Create TJ payment session
      const paymentSessionData = {
        amount: total,
        currency: 'USD',
        customer_email: customerInfo.email,
        customer_name: `${customerInfo.firstName} ${customerInfo.lastName}`,
        merchant_ref: orderResult.order.order_number,
        success_url: `${window.location.origin}/checkout/success?order=${orderResult.order.order_number}`,
        cancel_url: `${window.location.origin}/checkout/cancel?order=${orderResult.order.order_number}`,
        webhook_url: `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/handle-payment-webhook`
      };

      const paymentResponse = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/create-payment-session`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token && { 'Authorization': `Bearer ${token}` })
        },
        body: JSON.stringify(paymentSessionData)
      });

      const paymentResult = await paymentResponse.json();
      
      if (!paymentResult.success) {
        throw new Error(paymentResult.error || 'Failed to create payment session');
      }

      // Redirect to TJ hosted payment page
      window.location.href = paymentResult.payment_url;
      
    } catch (error: any) {
      console.error('Checkout error:', error);
      toast.error(error.message || 'Failed to process checkout');
      setIsProcessing(false);
    }
  };

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
              Add some items to your cart before proceeding to checkout.
            </p>
            <Button asChild size="lg">
              <Link to="/catalog">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Browse Catalog
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
                <span className="ml-2 font-medium">Customer Info</span>
              </div>
              <div className="w-8 h-px bg-border"></div>
              <div className={`flex items-center ${step >= 2 ? 'text-primary' : 'text-muted-foreground'}`}>
                <div className={`w-8 h-8 rounded-full flex items-center justify-center ${step >= 2 ? 'bg-primary text-primary-foreground' : 'bg-muted'}`}>
                  2
                </div>
                <span className="ml-2 font-medium">Payment</span>
              </div>
              <div className="w-8 h-px bg-border"></div>
              <div className={`flex items-center ${step >= 3 ? 'text-primary' : 'text-muted-foreground'}`}>
                <div className={`w-8 h-8 rounded-full flex items-center justify-center ${step >= 3 ? 'bg-primary text-primary-foreground' : 'bg-muted'}`}>
                  {step >= 3 ? <CheckCircle className="h-4 w-4" /> : '3'}
                </div>
                <span className="ml-2 font-medium">Confirmation</span>
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
                            onChange={(e) => setCustomerInfo({...customerInfo, firstName: e.target.value})}
                          />
                        </div>
                        <div>
                          <Label htmlFor="lastName">Last Name *</Label>
                          <Input
                            id="lastName"
                            required
                            value={customerInfo.lastName}
                            onChange={(e) => setCustomerInfo({...customerInfo, lastName: e.target.value})}
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
                            onChange={(e) => setCustomerInfo({...customerInfo, email: e.target.value})}
                          />
                        </div>
                        <div>
                          <Label htmlFor="phone">Phone *</Label>
                          <Input
                            id="phone"
                            type="tel"
                            required
                            value={customerInfo.phone}
                            onChange={(e) => setCustomerInfo({...customerInfo, phone: e.target.value})}
                          />
                        </div>
                      </div>
                      
                      <div>
                        <Label htmlFor="company">Company/Farm Name</Label>
                        <Input
                          id="company"
                          value={customerInfo.company}
                          onChange={(e) => setCustomerInfo({...customerInfo, company: e.target.value})}
                        />
                      </div>
                      
                      <div>
                        <Label htmlFor="address">Address *</Label>
                        <Input
                          id="address"
                          required
                          value={customerInfo.address}
                          onChange={(e) => setCustomerInfo({...customerInfo, address: e.target.value})}
                        />
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div>
                          <Label htmlFor="city">City *</Label>
                          <Input
                            id="city"
                            required
                            value={customerInfo.city}
                            onChange={(e) => setCustomerInfo({...customerInfo, city: e.target.value})}
                          />
                        </div>
                        <div>
                          <Label htmlFor="state">State/Province *</Label>
                          <Input
                            id="state"
                            required
                            value={customerInfo.state}
                            onChange={(e) => setCustomerInfo({...customerInfo, state: e.target.value})}
                          />
                        </div>
                        <div>
                          <Label htmlFor="zipCode">ZIP/Postal Code *</Label>
                          <Input
                            id="zipCode"
                            required
                            value={customerInfo.zipCode}
                            onChange={(e) => setCustomerInfo({...customerInfo, zipCode: e.target.value})}
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
                                onChange={(e) => setShippingInfo({...shippingInfo, firstName: e.target.value})}
                              />
                            </div>
                            <div>
                              <Label htmlFor="shippingLastName">Last Name *</Label>
                              <Input
                                id="shippingLastName"
                                required
                                value={shippingInfo.lastName}
                                onChange={(e) => setShippingInfo({...shippingInfo, lastName: e.target.value})}
                              />
                            </div>
                          </div>
                          
                          <div>
                            <Label htmlFor="shippingCompany">Company/Farm Name</Label>
                            <Input
                              id="shippingCompany"
                              value={shippingInfo.company}
                              onChange={(e) => setShippingInfo({...shippingInfo, company: e.target.value})}
                            />
                          </div>
                          
                          <div>
                            <Label htmlFor="shippingAddress">Address *</Label>
                            <Input
                              id="shippingAddress"
                              required
                              value={shippingInfo.address}
                              onChange={(e) => setShippingInfo({...shippingInfo, address: e.target.value})}
                            />
                          </div>
                          
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div>
                              <Label htmlFor="shippingCity">City *</Label>
                              <Input
                                id="shippingCity"
                                required
                                value={shippingInfo.city}
                                onChange={(e) => setShippingInfo({...shippingInfo, city: e.target.value})}
                              />
                            </div>
                            <div>
                              <Label htmlFor="shippingState">State/Province *</Label>
                              <Input
                                id="shippingState"
                                required
                                value={shippingInfo.state}
                                onChange={(e) => setShippingInfo({...shippingInfo, state: e.target.value})}
                              />
                            </div>
                            <div>
                              <Label htmlFor="shippingZipCode">ZIP/Postal Code *</Label>
                              <Input
                                id="shippingZipCode"
                                required
                                value={shippingInfo.zipCode}
                                onChange={(e) => setShippingInfo({...shippingInfo, zipCode: e.target.value})}
                              />
                            </div>
                          </div>
                        </div>
                      )}
                      
                      <div className="flex items-center gap-2 text-sm text-muted-foreground bg-muted p-3 rounded-md">
                        <Lock className="h-4 w-4" />
                        Secure payment processing via Transaction Junction
                      </div>
                      
                      <div>
                        <p className="text-sm text-muted-foreground">
                          You will be redirected to our secure payment partner to complete your purchase.
                        </p>
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
                          className="flex-1 bg-primary hover:bg-primary-hover"
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
                    <div className="flex gap-4 justify-center">
                      <Button asChild size="lg">
                        <Link to="/catalog">
                          Continue Shopping
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
                        />
                        <div className="flex-1">
                          <h4 className="font-medium text-sm">{item.name}</h4>
                          <div className="flex justify-between text-sm text-muted-foreground">
                            <span>Qty: {item.quantity}</span>
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
    </div>
  );
};

export default Checkout;