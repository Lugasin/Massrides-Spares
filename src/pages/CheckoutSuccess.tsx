import React, { useEffect, useState } from "react";
import { useSearchParams, Link } from "react-router-dom";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CheckCircle, Package, ArrowRight, Home } from "lucide-react";
import { useQuote } from "@/context/QuoteContext";
import { supabase } from "@/integrations/supabase/client";

const CheckoutSuccess = () => {
  const [searchParams] = useSearchParams();
  const { clearCart, itemCount } = useQuote();
  const [orderDetails, setOrderDetails] = useState<any>(null);

  const success = searchParams.get('success');
  const status = searchParams.get('status');
  const merchantRef = searchParams.get('merchant_ref');
  const transactionId = searchParams.get('transaction_id');
  const orderId = searchParams.get('order') || merchantRef;

  useEffect(() => {
    // Clear cart on successful payment or if we have an order ID (assuming success for now)
    if (success === 'true' || orderId) {
      clearCart();

      const fetchOrder = async () => {
        if (!orderId) return;

        const { data, error } = await supabase
          .from('orders')
          .select(`
            *,
            order_items (
              quantity,
              price,
              product:products (
                name,
                image_url
              )
            )
          `)
          .eq('order_number', orderId)
          .single();

        if (data) {
          setOrderDetails(data);
        }
      };

      fetchOrder();
    }
  }, [success, status, merchantRef, transactionId, clearCart, orderId]);

  return (
    <div className="min-h-screen bg-background">
      <Header cartItemsCount={itemCount} />

      <main className="container mx-auto px-4 py-8">
        <div className="max-w-2xl mx-auto">
          <Card>
            <CardContent className="text-center py-12">
              <CheckCircle className="h-16 w-16 text-success mx-auto mb-6" />
              <h1 className="text-3xl font-bold text-foreground mb-4">
                Thank You!
              </h1>
              <p className="text-muted-foreground mb-8">
                Your order has been placed successfully.
              </p>

              {orderDetails && (
                <div className="bg-muted/30 rounded-lg p-6 mb-8 text-left">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm mb-6">
                    <div>
                      <p className="text-muted-foreground">Order Number:</p>
                      <p className="font-medium">{orderDetails.order_number}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Status:</p>
                      <p className="font-medium capitalize">{orderDetails.payment_status || 'Pending'}</p>
                    </div>
                  </div>

                  <h4 className="font-medium mb-4">Order Summary</h4>
                  <div className="space-y-3">
                    {orderDetails.order_items?.map((item: any) => (
                      <div key={item.id} className="flex justify-between text-sm">
                        <span className="text-muted-foreground">
                          {item.product?.name} x{item.quantity}
                        </span>
                        <span>${(item.price * item.quantity).toLocaleString()}</span>
                      </div>
                    ))}
                    <div className="border-t pt-2 mt-2 flex justify-between font-bold">
                      <span>Total</span>
                      <span className="text-primary">${orderDetails.total_amount?.toLocaleString()}</span>
                    </div>
                  </div>
                </div>
              )}

              <div className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  You will receive an email confirmation shortly with your order details and tracking information.
                </p>

                <div className="flex flex-col sm:flex-row gap-4 justify-center">
                  <Button asChild size="lg">
                    <Link to="/catalog">
                      <Package className="h-4 w-4 mr-2" />
                      Continue Shopping for Parts
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
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default CheckoutSuccess;