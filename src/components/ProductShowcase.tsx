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
import { Product } from "@/data/products"; // Import Product interface
import { useQuote } from "@/context/QuoteContext";
import { toast } from "sonner";
import { Link } from "react-router-dom"; // Import Link

interface ProductShowcaseProps {
  products: Product[]; // Accept products as a prop
}

const categories = [
  { id: "All", label: "All Equipment" },
  { id: "Tractors", label: "Tractors" },
  { id: "Planters", label: "Planters" },
  { id: "Irrigation", label: "Irrigation" }
];

export const ProductShowcase = ({ products }: ProductShowcaseProps) => { // Receive products prop
  const [activeCategory, setActiveCategory] = useState("All");
  const [favorites, setFavorites] = useState<number[]>([]);
  const { addItem } = useQuote();

  // Filter products based on active category (use the products prop)
  const filteredProducts = products.filter(
    product => activeCategory === "All" || product.category === activeCategory
  );

  const handleAddToCart = (product: Product) => {
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
        {filteredProducts.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 lg:gap-8 mb-12">
            {filteredProducts.map((product, index) => (
              <Card 
                key={product.id}
                className={cn(
                  "group overflow-hidden hover:shadow-earth transition-all duration-300 hover-scale border-border/50",
                  "animate-fade-in"
                )}
                style={{ animationDelay: `${index * 0.1}s` }}
              >
                 {/* Wrap card content in Link */}
                 <Link to={`/products/${product.id}`} className="block">
                  <div className="relative overflow-hidden">
                    <img
                      src={product.image}
                      alt={product.name}
                      className="w-full h-40 sm:h-48 object-cover transition-transform duration-300 group-hover:scale-105"
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

                    {/* Action Buttons (Keep for quick actions like favorite/eye if needed) */}
                    {/* Consider if these actions should navigate or perform quick actions */}
                    <div className="absolute top-3 right-3 flex flex-col gap-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                      <Button
                        size="icon"
                        variant="secondary"
                        onClick={(e) => { e.preventDefault(); toggleFavorite(product.id); }} // Prevent navigation on click
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
                       {/* Example of Eye button - decide if it navigates or opens modal */}
                      {/* <Button
                        size="icon"
                        variant="secondary"
                        className="rounded-full bg-white/90 backdrop-blur-sm hover:bg-white"
                      >
                        <Eye className="h-4 w-4" />
                      </Button> */}
                    </div>

                  </div>

                  <CardContent className="p-4 lg:p-6">
                    {/* Rating */}
                    <div className="flex items-center gap-2 mb-3">
                      <div className="flex items-center">
                        {[...Array(5)].map((_, i) => (
                          <Star
                            key={i}
                            className={cn(
                              "h-4 w-4",
                              i < 4 
                                ? "text-yellow-500 fill-current" 
                                : "text-gray-300"
                            )}
                          />
                        ))}
                      </div>
                      <span className="text-sm text-muted-foreground">
                        4.8 (125 reviews)
                      </span>
                    </div>

                    {/* Product Info */}
                    <h3 className="text-base lg:text-lg font-semibold mb-2 text-card-foreground group-hover:text-primary transition-colors line-clamp-2">
                      {product.name}
                    </h3>
                    <p className="text-xs lg:text-sm text-muted-foreground mb-4 line-clamp-2">
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
                      <span className="text-lg lg:text-2xl font-bold text-primary">
                        ${product.price.toLocaleString()}
                      </span>
                    </div>
                  </CardContent>

                  <CardFooter className="p-4 lg:p-6 pt-0">
                    <div className="flex gap-3 w-full">
                      {/* Add to Cart Button - Keep separate from the link that wraps the card content */}
                       <Button 
                        onClick={(e) => { e.stopPropagation(); handleAddToCart(product); }} // Prevent link navigation and call add to cart
                        className="flex-1 bg-primary hover:bg-primary-hover group text-sm lg:text-base"
                      >
                        <ShoppingCart className="h-4 w-4 mr-2" />
                        Add to Cart
                      </Button>
                       {/* Eye button example - if it navigates, use Link; if modal, keep Button */}
                      {/* <Button variant="outline" size="icon">
                        <Eye className="h-4 w-4" />
                      </Button> */}
                    </div>
                  </CardFooter>
                 </Link> {/* Close Link */}
              </Card>
            ))}
          </div>
        ) : (
          <div className="text-center py-12">
            <h3 className="text-lg font-medium text-foreground mb-2">
              No products found
            </h3>
            <p className="text-muted-foreground">
              Try adjusting your search criteria.
            </p>
          </div>
        )}

        {/* View All CTA */}
        {filteredProducts.length > 0 && (
          <div className="text-center">
            <Button 
              asChild
              size="lg" 
              variant="outline"
              className="border-primary text-primary hover:bg-primary/10 group"
            >
              <Link to="/catalog">
                View All Equipment
                <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" />
              </Link>
            </Button>
          </div>
        )}
      </div>
    </section>
  );
};
