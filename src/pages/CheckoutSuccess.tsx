import React, { useEffect, useState } from "react";
import { useSearchParams, Link } from "react-router-dom";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CheckCircle, Package, ArrowRight, Home, UserPlus } from "lucide-react";
import { useQuote } from "@/context/QuoteContext";
import { useAuth } from "@/context/AuthContext";
import { supabase } from "@/integrations/supabase/client";

const CheckoutSuccess = () => {
  const [searchParams] = useSearchParams();
  const { clearCart, itemCount } = useQuote();
  const { user } = useAuth();
  const [orderDetails, setOrderDetails] = useState<any>(null);

  const orderNumber = searchParams.get('order');

  useEffect(() => {
    clearCart();

    const fetchOrder = async () => {
      if (!orderNumber) return;

      const { data, error } = await supabase
        .from('orders')
        .select(`
          *,
          order_items (
            quantity,
            price_snapshot,
            product:products (
              name,
              main_image
            )
          )
        `)
        .eq('order_number', orderNumber)
        .single();

      if (data) {
        setOrderDetails(data);
      }
    };

    fetchOrder();
  }, [orderNumber, clearCart]);

  return (
    <div className="min-h-screen bg-background">
      <Header cartItemsCount={itemCount} />

      <main className="container mx-auto px-4 py-8">
        <div className="max-w-2xl mx-auto">
          <Card className="border-success/20">
            <CardContent className="text-center py-12">
              <CheckCircle className="h-16 w-16 text-success mx-auto mb-6" />
              <h1 className="text-3xl font-bold text-foreground mb-4">
                Order Confirmed!
              </h1>
              <p className="text-muted-foreground mb-8">
                Your order #{orderNumber} has been placed successfully.
              </p>

              {orderDetails && (
                <div className="bg-muted/30 rounded-lg p-6 mb-8 text-left">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm mb-6">
                    <div>
                      <p className="text-muted-foreground font-semibold uppercase text-xs">Order Reference</p>
                      <p className="font-medium">{orderDetails.order_number}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground font-semibold uppercase text-xs">Payment Status</p>
                      <p className="font-medium text-success">{orderDetails.status}</p>
                    </div>
                  </div>

                  <h4 className="font-medium mb-4 border-b pb-2">Items Ordered</h4>
                  <div className="space-y-3">
                    {orderDetails.order_items?.map((item: any) => (
                      <div key={item.id} className="flex justify-between text-sm">
                        <span className="text-muted-foreground">
                          {item.product?.name} x{item.quantity}
                        </span>
                        <span>ZK {(item.price_snapshot * item.quantity).toLocaleString()}</span>
                      </div>
                    ))}
                    <div className="border-t pt-2 mt-2 flex justify-between font-bold">
                      <span>Total Paid</span>
                      <span className="text-primary text-lg">ZK {orderDetails.total_amount?.toLocaleString()}</span>
                    </div>
                  </div>
                </div>
              )}

              <div className="space-y-8">
                <p className="text-sm text-muted-foreground">
                  A confirmation email has been sent to your inbox.
                </p>

                {!user && (
                    <div className="mt-8 p-6 border-2 border-primary/20 bg-primary/5 rounded-2xl text-center">
                        <UserPlus className="h-10 w-10 text-primary mx-auto mb-3" />
                        <h3 className="text-xl font-bold mb-2">Track your spares!</h3>
                        <p className="text-sm text-muted-foreground mb-6 max-w-sm mx-auto">
                            Create a Massrides account using the same email to automatically link this order and track its shipping status.
                        </p>
                        <Button asChild size="lg" className="w-full sm:w-auto px-10">
                            <Link to={`/register?email=${orderDetails?.guest_email || ''}&phone=${orderDetails?.guest_phone || ''}`}>
                                Create My Account
                                <ArrowRight className="ml-2 h-4 w-4" />
                            </Link>
                        </Button>
                    </div>
                )}

                <div className="flex flex-col sm:flex-row gap-4 justify-center pt-4">
                  <Button asChild variant="outline">
                    <Link to="/catalog">
                      <Package className="h-4 w-4 mr-2" />
                      Back to Catalog
                    </Link>
                  </Button>
                  <Button asChild variant="ghost">
                    <Link to="/">
                      <Home className="h-4 w-4 mr-2" />
                      Home
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