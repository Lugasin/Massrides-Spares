import React, { useState, useEffect } from "react";
import { Header } from "@/components/Header";
import { HeroCarousel } from "@/components/HeroCarousel";
import { ParallaxHero } from "@/components/ParallaxHero";
import { CompanyRibbon } from "@/components/CompanyRibbon";
import { AutoScrollPartners } from "@/components/AutoScrollPartners";
import { AboutUsTeaser } from "@/components/AboutUsTeaser";
import { FeaturesSection } from "@/components/FeaturesSection";
import { ProductShowcase } from "@/components/ProductShowcase";
import { MasonryProductGrid } from "@/components/MasonryProductGrid";
import { StickyNavBar } from "@/components/StickyNavBar";
import { TestimonialSlider } from "@/components/TestimonialSlider";
import { ContactSection } from "@/components/ContactSection";
import { Footer } from "@/components/Footer";
import { BackToTop } from "@/components/BackToTop";
import { useQuote } from "@/context/QuoteContext";
import { useNavigate, Link } from "react-router-dom";
import { products, Product } from "@/data/products";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ShoppingCart, Star, Tractor, Wrench, Droplets, Wheat } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

const Index = () => {
  const { itemCount, addItem } = useQuote();
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState("");
  const [activeCategory, setActiveCategory] = useState("All");
  const [suggestedProducts, setSuggestedProducts] = useState<Product[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);

  const handleAuthClick = () => {
    navigate('/login');
  };

  // Enhanced categories with icons
  const categories = [
    { id: "All", label: "All Equipment", icon: <Wheat className="h-4 w-4" /> },
    { id: "Tractors", label: "Tractors", icon: <Tractor className="h-4 w-4" /> },
    { id: "Planters", label: "Planters", icon: <Wrench className="h-4 w-4" /> },
    { id: "Irrigation", label: "Irrigation", icon: <Droplets className="h-4 w-4" /> }
  ];

  // Sample partner data
  const partners = [
    {
      id: '1',
      name: 'John Deere',
      logo_url: 'https://logos-world.net/wp-content/uploads/2020/04/John-Deere-Logo.png',
      website_url: 'https://www.deere.com'
    },
    {
      id: '2',
      name: 'Case IH',
      logo_url: 'https://logos-world.net/wp-content/uploads/2020/04/Case-IH-Logo.png',
      website_url: 'https://www.caseih.com'
    },
    {
      id: '3',
      name: 'New Holland',
      logo_url: 'https://logos-world.net/wp-content/uploads/2020/04/New-Holland-Logo.png',
      website_url: 'https://www.newholland.com'
    },
    {
      id: '4',
      name: 'Kubota',
      logo_url: 'https://logos-world.net/wp-content/uploads/2020/04/Kubota-Logo.png',
      website_url: 'https://www.kubota.com'
    },
    {
      id: '5',
      name: 'Massey Ferguson',
      logo_url: 'https://1000logos.net/wp-content/uploads/2020/09/Massey-Ferguson-Logo.png',
      website_url: 'https://www.masseyferguson.com'
    }
  ];

  // Debounce for search input and filter products for suggestions
  useEffect(() => {
    const handler = setTimeout(() => {
      if (searchTerm) {
        const filtered = products.filter(product =>
          product.name.toLowerCase().includes(searchTerm.toLowerCase())
        ).slice(0, 4);
        setSuggestedProducts(filtered);
        setShowSuggestions(true);
      } else {
        setSuggestedProducts([]);
        setShowSuggestions(false);
      }
    }, 300);

    return () => {
      clearTimeout(handler);
    };
  }, [searchTerm]);

  // Filter products based on active category
  const filteredProducts = products.filter(
    product => activeCategory === "All" || product.category === activeCategory
  );

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
          <>
            {/* Enhanced Hero Section with Parallax */}
            <HeroCarousel />
            
            {/* Parallax Hero Section */}
            <ParallaxHero />
            
            {/* Company Partners with Auto-Scroll */}
            <AutoScrollPartners partners={partners} />
            
            {/* About Us Teaser */}
            <AboutUsTeaser />
            
            {/* Features Section */}
            <FeaturesSection />
            
            {/* Sticky Category Navigation */}
            <StickyNavBar 
              categories={categories}
              activeCategory={activeCategory}
              onCategoryChange={setActiveCategory}
            />
            
            {/* Featured Products with Masonry Grid */}
            <section id="featured-products" className="py-20 bg-background">
              <div className="container mx-auto px-4">
                <div className="text-center mb-16 animate-fade-in">
                  <span className="inline-block bg-secondary/10 text-secondary px-4 py-2 rounded-full text-sm font-medium mb-4">
                    Our Equipment
                  </span>
                  <h2 className="text-3xl lg:text-4xl font-bold mb-6 text-foreground">
                    Premium Agriculture Machinery
                  </h2>
                  <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
                    Discover our curated selection of high-quality farming equipment designed to boost your productivity and efficiency.
                  </p>
                </div>

                <MasonryProductGrid products={filteredProducts} />
                
                {/* View All CTA */}
                <div className="text-center mt-12">
                  <Button 
                    asChild
                    size="lg" 
                    className="bg-primary hover:bg-primary-hover group"
                  >
                    <Link to="/catalog">
                      View All Equipment
                      <ShoppingCart className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" />
                    </Link>
                  </Button>
                </div>
              </div>
            </section>
            
            {/* Testimonials Section */}
            <TestimonialSlider />
            
            {/* Contact Section */}
            <ContactSection />
          </>
        ) : (
          <section className="container mx-auto px-4 py-8">
            {suggestedProducts.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {suggestedProducts.map((product) => (
                   <Card key={product.id} className="group overflow-hidden hover:shadow-earth transition-all duration-300 hover-scale border-border/50">
                    <Link to={`/products/${product.id}`} className="block">
                      <div className="relative overflow-hidden">
                        <img
                          src={product.image}
                          alt={product.name}
                          className="w-full h-48 object-cover transition-transform duration-300 group-hover:scale-105"
                        />
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
                      </div>

                      <CardContent className="p-4">
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

                        <h3 className="text-lg font-semibold mb-1 text-card-foreground">
                          {product.name}
                        </h3>
                        <p className="text-sm text-muted-foreground line-clamp-2 mb-3">
                          {product.description}
                        </p>

                        <div className="flex items-center gap-2">
                          <span className="text-xl font-bold text-primary">
                            ${product.price.toLocaleString()}
                          </span>
                        </div>
                      </CardContent>

                      <CardFooter className="p-4 pt-0">
                         <Button 
                          onClick={(e) => { e.stopPropagation(); handleAddToCartFromSuggestion(product); }}
                          className="w-full bg-primary hover:bg-primary-hover"
                        >
                          <ShoppingCart className="h-4 w-4 mr-2" />
                          Add to Cart
                        </Button>
                      </CardFooter>
                    </Link>
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
