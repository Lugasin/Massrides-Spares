import React from "react";
import { useSearchParams, Link } from "react-router-dom";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { XCircle, ArrowLeft, RefreshCw } from "lucide-react";
import { useQuote } from "@/context/QuoteContext";

const CheckoutCancel = () => {
  const [searchParams] = useSearchParams();
  const { itemCount } = useQuote();
  
  const merchantRef = searchParams.get('merchant_ref');

  return (
    <div className="min-h-screen bg-background">
      <Header cartItemsCount={itemCount} />
      
      <main className="container mx-auto px-4 py-8">
        <div className="max-w-2xl mx-auto">
          <Card>
            <CardContent className="text-center py-12">
              <XCircle className="h-16 w-16 text-destructive mx-auto mb-6" />
              <h1 className="text-3xl font-bold text-foreground mb-4">
                Payment Cancelled
              </h1>
              <p className="text-muted-foreground mb-8">
                Your payment was cancelled. Your spare parts are still in your cart and you can try again.
              </p>
              
              {merchantRef && (
                <div className="bg-muted/30 rounded-lg p-4 mb-8">
                  <p className="text-sm text-muted-foreground">Order Reference:</p>
                  <p className="font-medium">{merchantRef}</p>
                </div>
              )}
              
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Button asChild size="lg">
                  <Link to="/cart">
                    <ArrowLeft className="h-4 w-4 mr-2" />
                    Return to Cart
                  </Link>
                </Button>
                <Button asChild variant="outline" size="lg">
                  <Link to="/checkout">
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Try Again
                  </Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default CheckoutCancel;