import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  ShoppingCart, 
  Heart, 
  Eye, 
  Star,
  ArrowRight 
} from "lucide-react";
import { cn } from "@/lib/utils";
import planterSeeding from "@/assets/planter-seeding.jpg";
import tractorPlowing from "@/assets/tractor-plowing.jpg";
import irrigationAerial from "@/assets/irrigation-aerial.jpg";

const categories = [
  { id: "all", label: "All Equipment" },
  { id: "tractors", label: "Tractors" },
  { id: "planters", label: "Planters" },
  { id: "irrigation", label: "Irrigation" }
];

const products = [
  {
    id: 1,
    name: "John Deere 6M Series Tractor",
    category: "tractors",
    price: "$85,000",
    originalPrice: "$95,000",
    image: tractorPlowing,
    rating: 4.8,
    reviews: 24,
    isNew: true,
    isFeatured: true,
    description: "Powerful and efficient tractor for medium to large farming operations.",
    specs: ["120 HP", "4WD", "PTO", "Hydraulic System"]
  },
  {
    id: 2,
    name: "Precision Seed Planter Pro",
    category: "planters",
    price: "$45,000",
    originalPrice: null,
    image: planterSeeding,
    rating: 4.9,
    reviews: 18,
    isNew: false,
    isFeatured: true,
    description: "Advanced precision planting technology for optimal seed placement.",
    specs: ["12 Row", "GPS Ready", "Variable Rate", "Fertilizer System"]
  },
  {
    id: 3,
    name: "Smart Pivot Irrigation System",
    category: "irrigation",
    price: "$125,000",
    originalPrice: "$140,000",
    image: irrigationAerial,
    rating: 4.7,
    reviews: 12,
    isNew: true,
    isFeatured: false,
    description: "Automated center pivot irrigation with smart water management.",
    specs: ["500m Radius", "GPS Control", "Weather Station", "Remote Monitoring"]
  }
];

export const ProductShowcase = () => {
  const [activeCategory, setActiveCategory] = useState("all");
  const [favorites, setFavorites] = useState<number[]>([]);

  const filteredProducts = products.filter(
    product => activeCategory === "all" || product.category === activeCategory
  );

  const toggleFavorite = (productId: number) => {
    setFavorites(prev => 
      prev.includes(productId) 
        ? prev.filter(id => id !== productId)
        : [...prev, productId]
    );
  };

  return (
    <section className="py-20 bg-background">
      <div className="container mx-auto px-4">
        {/* Header */}
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

        {/* Category Filter */}
        <div className="flex flex-wrap justify-center gap-3 mb-12">
          {categories.map((category) => (
            <Button
              key={category.id}
              variant={activeCategory === category.id ? "default" : "outline"}
              onClick={() => setActiveCategory(category.id)}
              className={cn(
                "transition-all duration-300",
                activeCategory === category.id 
                  ? "bg-primary hover:bg-primary-hover shadow-primary" 
                  : "hover:border-primary hover:text-primary"
              )}
            >
              {category.label}
            </Button>
          ))}
        </div>

        {/* Products Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8 mb-12">
          {filteredProducts.map((product, index) => (
            <Card 
              key={product.id}
              className={cn(
                "group overflow-hidden hover:shadow-earth transition-all duration-300 hover-scale border-border/50",
                "animate-fade-in"
              )}
              style={{ animationDelay: `${index * 0.1}s` }}
            >
              <div className="relative overflow-hidden">
                <img
                  src={product.image}
                  alt={product.name}
                  className="w-full h-48 object-cover transition-transform duration-300 group-hover:scale-105"
                />
                
                {/* Badges */}
                <div className="absolute top-3 left-3 flex gap-2">
                  {product.isNew && (
                    <Badge className="bg-success text-success-foreground">
                      New
                    </Badge>
                  )}
                  {product.isFeatured && (
                    <Badge className="bg-primary text-primary-foreground">
                      Featured
                    </Badge>
                  )}
                </div>

                {/* Action Buttons */}
                <div className="absolute top-3 right-3 flex flex-col gap-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                  <Button
                    size="icon"
                    variant="secondary"
                    onClick={() => toggleFavorite(product.id)}
                    className={cn(
                      "rounded-full backdrop-blur-sm",
                      favorites.includes(product.id) 
                        ? "bg-red-500 text-white hover:bg-red-600" 
                        : "bg-white/90 hover:bg-white"
                    )}
                  >
                    <Heart className={cn(
                      "h-4 w-4",
                      favorites.includes(product.id) && "fill-current"
                    )} />
                  </Button>
                  <Button
                    size="icon"
                    variant="secondary"
                    className="rounded-full bg-white/90 backdrop-blur-sm hover:bg-white"
                  >
                    <Eye className="h-4 w-4" />
                  </Button>
                </div>

                {/* Price Badge */}
                {product.originalPrice && (
                  <div className="absolute bottom-3 left-3">
                    <Badge variant="destructive" className="bg-destructive/90">
                      Save ${parseInt(product.originalPrice.replace(/[^0-9]/g, '')) - parseInt(product.price.replace(/[^0-9]/g, ''))}
                    </Badge>
                  </div>
                )}
              </div>

              <CardContent className="p-6">
                {/* Rating */}
                <div className="flex items-center gap-2 mb-3">
                  <div className="flex items-center">
                    {[...Array(5)].map((_, i) => (
                      <Star
                        key={i}
                        className={cn(
                          "h-4 w-4",
                          i < Math.floor(product.rating) 
                            ? "text-yellow-500 fill-current" 
                            : "text-gray-300"
                        )}
                      />
                    ))}
                  </div>
                  <span className="text-sm text-muted-foreground">
                    {product.rating} ({product.reviews} reviews)
                  </span>
                </div>

                {/* Product Info */}
                <h3 className="text-lg font-semibold mb-2 text-card-foreground group-hover:text-primary transition-colors">
                  {product.name}
                </h3>
                <p className="text-sm text-muted-foreground mb-4 line-clamp-2">
                  {product.description}
                </p>

                {/* Specs */}
                <div className="flex flex-wrap gap-1 mb-4">
                  {product.specs.slice(0, 3).map((spec) => (
                    <Badge key={spec} variant="outline" className="text-xs">
                      {spec}
                    </Badge>
                  ))}
                  {product.specs.length > 3 && (
                    <Badge variant="outline" className="text-xs">
                      +{product.specs.length - 3}
                    </Badge>
                  )}
                </div>

                {/* Price */}
                <div className="flex items-center gap-2 mb-4">
                  <span className="text-2xl font-bold text-primary">
                    {product.price}
                  </span>
                  {product.originalPrice && (
                    <span className="text-sm text-muted-foreground line-through">
                      {product.originalPrice}
                    </span>
                  )}
                </div>
              </CardContent>

              <CardFooter className="p-6 pt-0">
                <div className="flex gap-3 w-full">
                  <Button 
                    className="flex-1 bg-primary hover:bg-primary-hover group"
                  >
                    <ShoppingCart className="h-4 w-4 mr-2" />
                    Add to Cart
                  </Button>
                  <Button variant="outline" size="icon">
                    <Eye className="h-4 w-4" />
                  </Button>
                </div>
              </CardFooter>
            </Card>
          ))}
        </div>

        {/* View All CTA */}
        <div className="text-center">
          <Button 
            size="lg" 
            variant="outline"
            className="border-primary text-primary hover:bg-primary/10 group"
          >
            View All Equipment
            <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" />
          </Button>
        </div>
      </div>
    </section>
  );
};