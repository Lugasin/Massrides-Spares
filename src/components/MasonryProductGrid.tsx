import React, { useState, useRef } from 'react';
import { Card, CardContent, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  ShoppingCart, 
  Heart, 
  Eye, 
  Star,
  Zap,
  CheckCircle,
  ArrowRight
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Product } from '@/data/products';
import { useQuote } from '@/context/QuoteContext';
import { toast } from 'sonner';
import { Link } from 'react-router-dom';

interface MasonryProductGridProps {
  products: Product[];
  className?: string;
}

export const MasonryProductGrid: React.FC<MasonryProductGridProps> = ({ 
  products, 
  className 
}) => {
  const { addItem } = useQuote();
  const [favorites, setFavorites] = useState<number[]>([]);
  const [hoveredProduct, setHoveredProduct] = useState<number | null>(null);
  const cartIconRef = useRef<HTMLDivElement>(null);

  const handleAddToCart = (product: Product) => {
    addItem({
      id: String(product.id),
      name: product.name,
      price: product.price,
      image: product.image,
      specs: product.specs,
      category: product.category
    });

    // Animate cart icon
    if (cartIconRef.current) {
      cartIconRef.current.classList.add('animate-bounce');
      setTimeout(() => {
        cartIconRef.current?.classList.remove('animate-bounce');
      }, 600);
    }

    toast.success(`${product.name} added to cart!`, {
      icon: <CheckCircle className="h-4 w-4 text-green-500" />,
      duration: 2000,
    });
  };

  const toggleFavorite = (productId: number) => {
    setFavorites(prev => 
      prev.includes(productId) 
        ? prev.filter(id => id !== productId)
        : [...prev, productId]
    );
  };

  return (
    <div className={cn("columns-1 md:columns-2 lg:columns-3 gap-6 space-y-6", className)}>
      {products.map((product, index) => (
        <Card 
          key={product.id}
          className={cn(
            "break-inside-avoid mb-6 group overflow-hidden border-border/50 hover:shadow-xl transition-all duration-300",
            hoveredProduct === product.id ? "scale-[1.02]" : "",
            index % 3 === 0 ? "md:mt-0" : index % 3 === 1 ? "md:mt-8" : "md:mt-4"
          )}
          onMouseEnter={() => setHoveredProduct(product.id)}
          onMouseLeave={() => setHoveredProduct(null)}
        >
          <Link to={`/products/${product.id}`} className="block">
            <div className="relative overflow-hidden">
              <img
                src={product.image}
                alt={product.name}
                className="w-full h-auto object-cover transition-transform duration-300 group-hover:scale-110"
                loading="lazy"
                style={{
                  filter: 'blur(0px)',
                  transition: 'filter 0.3s ease-in-out'
                }}
                onLoad={(e) => {
                  e.currentTarget.style.filter = 'blur(0px)';
                }}
              />
              
              {/* Overlay */}
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
              
              {/* Badges */}
              <div className="absolute top-3 left-3 flex flex-col gap-2">
                {product.featured && (
                  <Badge className="bg-gradient-to-r from-yellow-500 to-orange-500 text-white shadow-lg">
                    <Star className="h-3 w-3 mr-1 fill-current" />
                    Featured
                  </Badge>
                )}
                {product.inStock && (
                  <Badge className="bg-gradient-to-r from-green-500 to-emerald-500 text-white shadow-lg">
                    <CheckCircle className="h-3 w-3 mr-1" />
                    In Stock
                  </Badge>
                )}
              </div>

              {/* Quick Actions */}
              <div className="absolute top-3 right-3 flex flex-col gap-2 opacity-0 group-hover:opacity-100 transition-all duration-300 transform translate-x-2 group-hover:translate-x-0">
                <Button
                  size="icon"
                  variant="secondary"
                  onClick={(e) => { 
                    e.preventDefault(); 
                    e.stopPropagation(); 
                    toggleFavorite(product.id); 
                  }}
                  className={cn(
                    "rounded-full backdrop-blur-sm shadow-lg",
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
                  className="rounded-full bg-white/90 backdrop-blur-sm hover:bg-white shadow-lg"
                >
                  <Eye className="h-4 w-4" />
                </Button>
              </div>

              {/* Price Tag */}
              <div className="absolute bottom-3 left-3 opacity-0 group-hover:opacity-100 transition-all duration-300 transform translate-y-2 group-hover:translate-y-0">
                <div className="bg-white/95 backdrop-blur-sm rounded-lg px-3 py-2 shadow-lg">
                  <span className="text-lg font-bold text-primary">
                    ${product.price.toLocaleString()}
                  </span>
                </div>
              </div>
            </div>
          </Link>

          <CardContent className="p-4">
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
                4.8 (125)
              </span>
            </div>

            {/* Product Info */}
            <Link to={`/products/${product.id}`}>
              <h3 className="text-lg font-semibold mb-2 text-card-foreground group-hover:text-primary transition-colors line-clamp-2">
                {product.name}
              </h3>
            </Link>
            
            <p className="text-sm text-muted-foreground mb-4 line-clamp-3">
              {product.description}
            </p>

            {/* Specs */}
            <div className="flex flex-wrap gap-1 mb-4">
              {product.specs.slice(0, 3).map((spec) => (
                <Badge key={spec} variant="outline" className="text-xs">
                  <Zap className="h-3 w-3 mr-1" />
                  {spec}
                </Badge>
              ))}
              {product.specs.length > 3 && (
                <Badge variant="outline" className="text-xs">
                  +{product.specs.length - 3} more
                </Badge>
              )}
            </div>
          </CardContent>

          <CardFooter className="p-4 pt-0">
            <div className="flex gap-2 w-full">
              <Button 
                onClick={(e) => { 
                  e.stopPropagation(); 
                  e.preventDefault();
                  handleAddToCart(product); 
                }}
                className="flex-1 bg-primary hover:bg-primary-hover group"
              >
                <div ref={cartIconRef}>
                  <ShoppingCart className="h-4 w-4 mr-2" />
                </div>
                Add to Cart
              </Button>
              
              <Button 
                variant="outline" 
                size="icon"
                asChild
              >
                <Link to={`/products/${product.id}`}>
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
            </div>
          </CardFooter>
        </Card>
      ))}
    </div>
  );
};