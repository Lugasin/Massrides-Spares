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
import { products as spareParts, Product } from "@/data/products";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ShoppingCart, Star, Tractor, Wrench, Droplets, Wheat } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

const Index = () => {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState("");
  const [activeCategory, setActiveCategory] = useState("All");
  const [suggestedProducts, setSuggestedProducts] = useState<Product[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const { itemCount, addItem } = useQuote();

  const handleAuthClick = () => {
    navigate('/login');
  };

  // Enhanced categories with icons
  const categories = [
    { id: "All", label: "All Parts", icon: <Wheat className="h-4 w-4" /> },
    { id: "Engine Parts", label: "Engine Parts", icon: <Tractor className="h-4 w-4" /> },
    { id: "Hydraulic Parts", label: "Hydraulic Parts", icon: <Wrench className="h-4 w-4" /> },
    { id: "Electrical Parts", label: "Electrical Parts", icon: <Droplets className="h-4 w-4" /> }
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
        const filtered = spareParts.filter(part =>
          part.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          part.partNumber?.toLowerCase().includes(searchTerm.toLowerCase())
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
  const filteredProducts = spareParts.filter(
    part => activeCategory === "All" || part.category === activeCategory
  );

  // Handle adding item to cart from suggestion card
  const handleAddToCartFromSuggestion = (part: SparePart) => {
    addItem({
      id: part.id,
      name: part.name,
      price: part.price,
      image: part.image,
      specs: part.specs,
      category: part.category
    });
    toast.success(`${part.name} added to cart!`);
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
            
            {/* Featured Spare Parts with Masonry Grid */}
            <section id="featured-parts" className="py-20 bg-background">
              <div className="container mx-auto px-4">
                <div className="text-center mb-16 animate-fade-in">
                  <span className="inline-block bg-secondary/10 text-secondary px-4 py-2 rounded-full text-sm font-medium mb-4">
                    Our Spare Parts
                  </span>
                  <h2 className="text-3xl lg:text-4xl font-bold mb-6 text-foreground">
                    Premium Agricultural Spare Parts
                  </h2>
                  <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
                    Discover our curated selection of high-quality agricultural spare parts designed to keep your equipment running efficiently.
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
                      View All Parts
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
                {suggestedProducts.map((part) => (
                   <Card key={part.id} className="group overflow-hidden hover:shadow-earth transition-all duration-300 hover-scale border-border/50">
                    <Link to={`/parts/${part.id}`} className="block">
                      <div className="relative overflow-hidden">
                        <img
                          src={part.image}
                          alt={part.name}
                          className="w-full h-48 object-cover transition-transform duration-300 group-hover:scale-105"
                        />
                        <div className="absolute top-3 left-3 flex gap-2">
                          {part.featured && (
                            <Badge className="bg-primary text-primary-foreground">
                              Featured
                            </Badge>
                          )}
                          {part.inStock && (
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
                          {part.name}
                        </h3>
                        {part.partNumber && (
                          <p className="text-xs text-muted-foreground mb-2">
                            Part #: {part.partNumber}
                          </p>
                        )}
                        <p className="text-sm text-muted-foreground line-clamp-2 mb-3">
                          {part.description}
                        </p>

                        <div className="flex items-center gap-2">
                          <span className="text-xl font-bold text-primary">
                            ${part.price.toLocaleString()}
                          </span>
                        </div>
                      </CardContent>

                      <CardFooter className="p-4 pt-0">
                         <Button 
                          onClick={(e) => { e.stopPropagation(); handleAddToCartFromSuggestion(part); }}
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
                  No spare parts found for "{searchTerm}"
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
