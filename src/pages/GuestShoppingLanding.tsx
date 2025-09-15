import React from 'react';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  ShoppingCart, 
  Package, 
  Star, 
  ArrowRight,
  User,
  Heart
} from 'lucide-react';
import { useQuote } from '@/context/QuoteContext';
import { Link } from 'react-router-dom';
import { spareParts as sparePartsData, SparePart } from '@/data/products';

const GuestShoppingLanding = () => {
  const { itemCount, addItem } = useQuote();
  
  // Get featured parts for guest users
  const featuredParts = sparePartsData.filter(part => part.featured).slice(0, 6) as SparePart[];

  const handleAddToCart = (part: SparePart) => {
    addItem({
      id: String(part.id),
      name: part.name,
      price: part.price,
      image: part.image || '',
      specs: part.specs,
      category: part.category
    });
  };

  return (
    <div className="min-h-screen bg-background">
      <Header cartItemsCount={itemCount} />
      
      <main className="container mx-auto px-4 py-8">
        {/* Welcome Section */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-2 bg-primary/10 text-primary px-4 py-2 rounded-full mb-4">
            <User className="h-4 w-4" />
            <span className="text-sm font-medium">Shopping as Guest</span>
          </div>
          <h1 className="text-4xl font-bold text-foreground mb-4">
            Welcome to Agri Massrides
          </h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto mb-8">
            Browse our extensive catalog of agricultural spare parts. 
            Create an account for a personalized experience and faster checkout.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button asChild size="lg">
              <Link to="/catalog">
                <Package className="h-4 w-4 mr-2" />
                Browse All Parts
              </Link>
            </Button>
            <Button asChild variant="outline" size="lg">
              <Link to="/register">
                <User className="h-4 w-4 mr-2" />
                Create Account
              </Link>
            </Button>
          </div>
        </div>

        {/* Guest Benefits */}
        <div className="grid md:grid-cols-3 gap-6 mb-12">
          <Card>
            <CardContent className="p-6 text-center">
              <ShoppingCart className="h-12 w-12 text-primary mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">Easy Shopping</h3>
              <p className="text-muted-foreground text-sm">
                Add parts to your cart and checkout without creating an account
              </p>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-6 text-center">
              <Package className="h-12 w-12 text-primary mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">Quality Parts</h3>
              <p className="text-muted-foreground text-sm">
                Access to genuine and aftermarket spare parts from trusted suppliers
              </p>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-6 text-center">
              <Heart className="h-12 w-12 text-primary mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">Expert Support</h3>
              <p className="text-muted-foreground text-sm">
                Get technical assistance and parts compatibility guidance
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Featured Parts */}
        <section>
          <div className="text-center mb-8">
            <h2 className="text-3xl font-bold text-foreground mb-4">Featured Spare Parts</h2>
            <p className="text-muted-foreground">
              Popular parts chosen by our agricultural experts
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
            {featuredParts.map((part) => (
              <Card key={part.id} className="group hover:shadow-lg transition-all duration-300">
                <Link to={`/parts/${part.id}`} className="block">
                  <div className="relative overflow-hidden">
                    <img
                      src={part.image || '/api/placeholder/300/200'}
                      alt={part.name}
                      className="w-full h-48 object-cover transition-transform duration-300 group-hover:scale-105"
                      loading="lazy"
                    />
                    <Badge className="absolute top-2 left-2 bg-primary text-primary-foreground">
                      Featured
                    </Badge>
                  </div>
                  <CardContent className="p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <div className="flex items-center text-yellow-500">
                        {[...Array(5)].map((_, i) => (
                          <Star
                            key={i}
                            className={`h-4 w-4 ${i < 4 ? 'fill-current' : 'text-gray-300'}`}
                          />
                        ))}
                      </div>
                      <span className="text-sm text-muted-foreground">4.8</span>
                    </div>
                    <h3 className="font-semibold mb-2 line-clamp-2">{part.name}</h3>
                    <p className="text-sm text-muted-foreground mb-2">
                      Part #: {part.partNumber}
                    </p>
                    <div className="flex items-center justify-between">
                      <span className="text-lg font-bold text-primary">
                        ${part.price.toLocaleString()}
                      </span>
                      <Badge variant="outline">
                        {part.brand}
                      </Badge>
                    </div>
                  </CardContent>
                </Link>
                <div className="p-4 pt-0">
                  <Button 
                    onClick={(e) => { 
                      e.preventDefault(); 
                      handleAddToCart(part); 
                    }}
                    className="w-full bg-primary hover:bg-primary-hover"
                    disabled={!part.inStock}
                  >
                    <ShoppingCart className="h-4 w-4 mr-2" />
                    Add to Cart
                  </Button>
                </div>
              </Card>
            ))}
          </div>

          <div className="text-center">
            <Button asChild size="lg">
              <Link to="/catalog">
                View All Parts
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </div>
        </section>

        {/* Account Creation CTA */}
        <Card className="bg-gradient-to-r from-primary/10 to-secondary/10 border-primary/20">
          <CardContent className="p-8 text-center">
            <h3 className="text-2xl font-bold mb-4">Get More with an Account</h3>
            <p className="text-muted-foreground mb-6">
              Create an account to save your favorite parts, track orders, and get personalized recommendations.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button asChild size="lg">
                <Link to="/register">
                  Create Free Account
                </Link>
              </Button>
              <Button asChild variant="outline" size="lg">
                <Link to="/login">
                  Sign In
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </main>

      <Footer />
    </div>
  );
};

export default GuestShoppingLanding;