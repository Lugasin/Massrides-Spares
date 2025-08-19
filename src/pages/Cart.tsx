import React from "react";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { BackToTop } from "@/components/BackToTop";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { 
  ShoppingCart, 
  Plus, 
  Minus, 
  Trash2, 
  CreditCard,
  ArrowRight,
  ArrowLeft
} from "lucide-react";
import { useQuote } from "@/context/QuoteContext";
import { Link, useNavigate } from "react-router-dom";

const Cart = () => {
  const { items, total, itemCount, updateQuantity, removeItem } = useQuote();
  const navigate = useNavigate();

  const handleCheckout = () => {
    navigate('/checkout');
  };

  return (
    <div className="min-h-screen bg-background">
      <Header 
        cartItemsCount={itemCount}
        onAuthClick={() => navigate('/login')}
      />
      
      <main className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <div className="flex items-center gap-3 mb-8">
            <ShoppingCart className="h-8 w-8 text-primary" />
            <h1 className="text-3xl font-bold text-foreground">Shopping Cart</h1>
            {itemCount > 0 && (
              <Badge className="bg-primary text-primary-foreground text-lg px-3 py-1">
                {itemCount} {itemCount === 1 ? 'part' : 'parts'}
              </Badge>
            )}
          </div>

          {items.length === 0 ? (
            /* Empty Cart */
            <div className="text-center py-16">
              <ShoppingCart className="h-24 w-24 text-muted-foreground mx-auto mb-6 opacity-50" />
              <h2 className="text-2xl font-semibold text-foreground mb-4">
                Your cart is empty
              </h2>
              <p className="text-muted-foreground mb-8 max-w-md mx-auto">
                Start browsing our extensive catalog of agricultural spare parts to find the components you need for your equipment.
              </p>
              <div className="flex gap-4 justify-center">
                <Button asChild size="lg" className="bg-primary hover:bg-primary-hover">
                  <Link to="/catalog">
                    <ArrowLeft className="h-4 w-4 mr-2" />
                    Browse Parts
                  </Link>
                </Button>
                <Button asChild variant="outline" size="lg">
                  <Link to="/">
                    Back to Home
                  </Link>
                </Button>
              </div>
            </div>
          ) : (
            /* Cart with Items */
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              {/* Cart Items */}
              <div className="lg:col-span-2 space-y-4">
                {items.map((item) => (
                  <Card key={item.id} className="overflow-hidden">
                    <CardContent className="p-6">
                      <div className="flex gap-4">
                        <img 
                          src={item.image}
                          alt={item.name}
                          className="w-24 h-24 object-cover rounded-md flex-shrink-0"
                          loading="lazy"
                        />
                        
                        <div className="flex-1">
                          <h3 className="font-semibold text-card-foreground mb-2">
                            {item.name}
                          </h3>
                          
                          <div className="flex flex-wrap gap-1 mb-3">
                            {item.specs.slice(0, 3).map((spec) => (
                              <Badge key={spec} variant="outline" className="text-xs">
                                {spec}
                              </Badge>
                            ))}
                          </div>
                          
                          <div className="flex items-center justify-between">
                            <div className="text-lg font-bold text-primary">
                              ${item.price.toLocaleString()}
                              <span className="text-sm text-muted-foreground font-normal ml-2">
                                each
                              </span>
                            </div>
                            
                            <div className="flex items-center gap-3">
                              <div className="flex items-center gap-2">
                                <Button
                                  size="icon"
                                  variant="outline"
                                  className="h-8 w-8"
                                  onClick={() => updateQuantity(item.id, Math.max(1, item.quantity - 1))}
                                >
                                  <Minus className="h-3 w-3" />
                                </Button>
                                <span className="w-12 text-center font-medium">
                                  {item.quantity}
                                </span>
                                <Button
                                  size="icon"
                                  variant="outline"
                                  className="h-8 w-8"
                                  onClick={() => updateQuantity(item.id, item.quantity + 1)}
                                >
                                  <Plus className="h-3 w-3" />
                                </Button>
                              </div>
                              
                              <Button
                                size="icon"
                                variant="ghost"
                                className="h-8 w-8 text-destructive hover:text-destructive"
                                onClick={() => removeItem(item.id)}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                          
                          <div className="mt-2 text-sm text-muted-foreground">
                            Subtotal: <span className="font-medium text-foreground">
                              ${(item.price * item.quantity).toLocaleString()}
                            </span>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>

              {/* Order Summary */}
              <div className="lg:col-span-1">
                <Card className="sticky top-8">
                  <CardContent className="p-6">
                    <h3 className="text-lg font-semibold text-card-foreground mb-4">
                      Order Summary
                    </h3>
                    
                    <div className="space-y-3 mb-4">
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Parts ({itemCount})</span>
                        <span className="font-medium">${total.toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Shipping</span>
                        <span className="font-medium">Calculated at checkout</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Tax</span>
                        <span className="font-medium">Calculated at checkout</span>
                      </div>
                    </div>
                    
                    <Separator className="my-4" />
                    
                    <div className="flex justify-between items-center mb-6">
                      <span className="text-lg font-semibold text-foreground">Total</span>
                      <span className="text-xl font-bold text-primary">
                        ${total.toLocaleString()}
                      </span>
                    </div>
                    
                    <div className="space-y-3">
                      <Button 
                        onClick={handleCheckout}
                        size="lg"
                        className="w-full bg-primary hover:bg-primary-hover group"
                      >
                        <CreditCard className="h-4 w-4 mr-2" />
                        Proceed to Checkout
                        <ArrowRight className="h-4 w-4 ml-2 transition-transform group-hover:translate-x-1" />
                      </Button>
                      
                      <Button 
                        asChild
                        variant="outline"
                        size="lg"
                        className="w-full"
                      >
                        <Link to="/catalog">
                          <ArrowLeft className="h-4 w-4 mr-2" />
                          Continue Shopping
                        </Link>
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          )}
        </div>
      </main>

      <Footer />
      <BackToTop />
    </div>
  );
};

export default Cart;