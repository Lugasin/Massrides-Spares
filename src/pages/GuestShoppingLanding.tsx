import React, { useEffect, useState } from 'react';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { Card, CardContent } from '@/components/ui/card';
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
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

// Define interface matching DB structure
interface FeaturedPart {
  id: string; // items from DB have numeric ID but we typically handle as string in frontend routing
  sku: string;
  title: string;
  price: number;
  main_image: string | null;
  category: { name: string } | null; // Joined
  attributes: any;
  in_stock: boolean;
}

const GuestShoppingLanding = () => {
  const { itemCount, addItem } = useQuote();
  const [featuredParts, setFeaturedParts] = useState<FeaturedPart[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchFeaturedParts();
  }, []);

  const fetchFeaturedParts = async () => {
    try {
      // Fetch products that are active. 
      // We can interpret "Featured" as either a specific flag or just the latest items for now.
      // Based on previous files, 'featured' is in attributes jsonb.
      // Let's fetch active products and filter or we can use a JSON containment query.
      const { data, error } = await supabase
        .from('products')
        .select(`
          *,
          category:categories(name)
        `)
        .eq('active', true)
        // .contains('attributes', { featured: true }) // Optional: if we want strict featured
        .limit(6);

      if (error) throw error;

      if (data) {
        setFeaturedParts(data as any);
      }
    } catch (error) {
      console.error('Error fetching featured parts:', error);
      toast.error('Failed to load featured products');
    } finally {
      setLoading(false);
    }
  };

  const handleAddToCart = (part: FeaturedPart) => {
    addItem({
      id: String(part.id),
      name: part.title,
      price: Number(part.price),
      image: part.main_image || '/placeholder.png', // Fallback image
      specs: part.attributes?.tags || [],
      category: part.category?.name || 'General'
    });
    toast.success(`${part.title} added to cart`);
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
          <div className="text-center max-w-2xl mx-auto mb-12 animate-fade-in relative z-10">
            <h1 className="text-4xl md:text-5xl font-bold text-[#1A1F2C] mb-4 tracking-tight">
              Welcome to Massrides Spares
            </h1>
            <p className="text-lg text-gray-600 mb-8">
              Browse our extensive catalog of agricultural spare parts.
              <span className="font-semibold text-primary"> No account required to shop.</span>
            </p>
          </div>
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

          {loading ? (
            <div className="flex justify-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
              {featuredParts.map((part) => (
                <Card key={part.id} className="group hover:shadow-lg transition-all duration-300">
                  <Link to={`/parts/${part.id}`} className="block">
                    <div className="relative overflow-hidden bg-muted">
                      <img
                        src={part.main_image || '/placeholder.png'} // Fallback here
                        alt={part.title}
                        className="w-full h-48 object-cover transition-transform duration-300 group-hover:scale-105"
                        loading="lazy"
                        onError={(e) => {
                          const target = e.target as HTMLImageElement;
                          target.src = '/placeholder.png'; // Runtime fallback
                        }}
                      />
                      <Badge className="absolute top-2 left-2 bg-primary text-primary-foreground">
                        Featured
                      </Badge>
                      {part.in_stock ? (
                        <Badge className="absolute top-2 right-2 bg-success text-success-foreground">In Stock</Badge>
                      ) : (
                        <Badge className="absolute top-2 right-2 bg-destructive text-destructive-foreground">Out of Stock</Badge>
                      )}
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
                      <h3 className="font-semibold mb-2 line-clamp-2">{part.title}</h3>
                      <p className="text-sm text-muted-foreground mb-2">
                        Part #: {part.sku}
                      </p>
                      <div className="flex items-center justify-between">
                        <span className="text-lg font-bold text-primary">
                          ${Number(part.price).toLocaleString()}
                        </span>
                        {part.attributes?.brand && (
                          <Badge variant="outline">
                            {part.attributes.brand}
                          </Badge>
                        )}
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
                      disabled={!part.in_stock}
                    >
                      <ShoppingCart className="h-4 w-4 mr-2" />
                      Add to Cart
                    </Button>
                  </div>
                </Card>
              ))}
            </div>
          )}

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