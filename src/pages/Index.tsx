import React, { useState, useEffect } from "react"; // Import useState and useEffect
import { Header } from "@/components/Header";
import { HeroSection } from "@/components/HeroSection";
import { AboutUsTeaser } from "@/components/AboutUsTeaser";
import { FeaturesSection } from "@/components/FeaturesSection";
import { ProductShowcase } from "@/components/ProductShowcase";
import { ContactSection } from "@/components/ContactSection";
import { Footer } from "@/components/Footer";
import { BackToTop } from "@/components/BackToTop";
import { useQuote } from "@/context/QuoteContext";
import { useNavigate, Link } from "react-router-dom"; // Import useNavigate and Link
import { products, Product } from "@/data/products"; // Import products and Product interface
import { Input } from "@/components/ui/input"; // Import Input for suggestions
import { Card, CardContent, CardFooter } from "@/components/ui/card"; // Import Card components
import { Button } from "@/components/ui/button"; // Import Button
import { Badge } from "@/components/ui/badge"; // Import Badge
import { ShoppingCart, Eye, Star } from "lucide-react"; // Import icons
import { cn } from "@/lib/utils"; // Import cn

const Index = () => {
  const { itemCount, addItem } = useQuote(); // Include addItem
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState("");
  const [suggestedProducts, setSuggestedProducts] = useState<Product[]>([]); // State for suggestions
  const [showSuggestions, setShowSuggestions] = useState(false); // State to control suggestion visibility

  const handleAuthClick = () => {
    navigate('/login');
  };

  const handleCheckout = () => {
    navigate('/checkout');
  };

  // Debounce for search input and filter products for suggestions
  useEffect(() => {
    const handler = setTimeout(() => {
      if (searchTerm) {
        const filtered = products.filter(product =>
          product.name.toLowerCase().includes(searchTerm.toLowerCase())
        ).slice(0, 4); // Limit to 4 suggestions
        setSuggestedProducts(filtered);
        setShowSuggestions(true); // Show suggestions when there's a search term
      } else {
        setSuggestedProducts([]);
        setShowSuggestions(false); // Hide suggestions when search term is empty
      }
    }, 300); // Debounce for 300ms

    return () => {
      clearTimeout(handler);
    };
  }, [searchTerm]); // Re-run effect when searchTerm changes

  // Handle adding item to cart from suggestion card
  const handleAddToCartFromSuggestion = (product: Product) => {
    addItem({
      id: product.id,
      name: product.name,
      price: product.price,
      image: product.image,
      specs: product.specs,
      category: product.category
    });
    toast.success(`${product.name} added to cart!`);
  };

  return (
    <div className="min-h-screen bg-background">
      <Header 
        cartItemsCount={itemCount}
        onAuthClick={handleAuthClick}
        searchTerm={searchTerm}
        onSearchChange={setSearchTerm}
      />
      
      <main>
        {!showSuggestions ? (
          <> {/* Render these sections when no suggestions are shown */}
            <HeroSection />
            <AboutUsTeaser />
            <FeaturesSection />
            <ProductShowcase products={products} /> {/* Show all products in ProductShowcase when no search */}
            <ContactSection />
          </>
        ) : (
          <section className="container mx-auto px-4 py-8"> {/* Section to display suggestions */}
            {/* <h2 className="text-2xl font-bold mb-6 text-foreground">Suggested Products</h2> {/* Optional heading */}
            {suggestedProducts.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {suggestedProducts.map((product) => (
                   <Card key={product.id} className="group overflow-hidden hover:shadow-earth transition-all duration-300 hover-scale border-border/50">
                     {/* Wrap card content in Link */}
                    <Link to={`/products/${product.id}`} className="block">
                      <div className="relative overflow-hidden">
                        <img
                          src={product.image}
                          alt={product.name}
                          className="w-full h-48 object-cover transition-transform duration-300 group-hover:scale-105"
                        />
                        {/* Badges */}
                        <div className="absolute top-3 left-3 flex gap-2">
                          {product.featured && (
                            <Badge className="bg-primary text-primary-foreground">
                              Featured
                            </Badge>
                          )}
                          {product.inStock && (
                            <Badge className="bg-success text-success-foreground">
                              In Stock
                            </Badge>
                          )}
                        </div>

                        {/* Action Buttons */}
                        {/* Add Eye and Heart buttons here if needed in suggestions */}

                      </div>

                      <CardContent className="p-4">
                        {/* Rating */}
                         <div className="flex items-center gap-2 mb-2">
                          <div className="flex items-center text-yellow-500">
                             {[...Array(5)].map((_, i) => (
                              <Star
                                key={i}
                                className={cn("h-4 w-4", i < 4 ? "fill-current" : "text-gray-300 fill-transparent")}
                              />
                            ))}
                          </div>
                          <span className="text-sm text-muted-foreground">
                            4.8 (125 reviews)
                          </span>
                        </div>

                        {/* Product Info */}
                        <h3 className="text-lg font-semibold mb-1 text-card-foreground">
                          {product.name}
                        </h3>
                        <p className="text-sm text-muted-foreground line-clamp-2 mb-3">
                          {product.description}
                        </p>

                        {/* Price */}
                        <div className="flex items-center gap-2">
                          <span className="text-xl font-bold text-primary">
                            ${product.price.toLocaleString()}
                          </span>
                        </div>
                      </CardContent>

                      <CardFooter className="p-4 pt-0">
                         <Button 
                          onClick={(e) => { e.stopPropagation(); handleAddToCartFromSuggestion(product); }} // Prevent link navigation and call add to cart
                          className="w-full bg-primary hover:bg-primary-hover"
                        >
                          <ShoppingCart className="h-4 w-4 mr-2" />
                          Add to Cart
                        </Button>
                      </CardFooter>
                    </Link> {/* Close Link */}
                  </Card>
                ))}
              </div>
            ) : ( searchTerm && (
              <div className="text-center py-12">
                <h3 className="text-lg font-medium text-foreground mb-2">
                  No products found for "{searchTerm}"
                </h3>
                <p className="text-muted-foreground">
                  Try a different search term.
                </p>
              </div>
            ))}
          </section>
        )}
      </main>
      
      <Footer />
      
      <BackToTop />
    </div>
  );
};

export default Index;
