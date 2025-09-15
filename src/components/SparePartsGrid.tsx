import React, { useState } from 'react';
import { Card, CardContent, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  ShoppingCart, 
  Heart, 
  Eye, 
  Star,
  Package,
  Wrench,
  Zap,
  Settings
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { SparePart } from '@/data/products';
import { useQuote } from '@/context/QuoteContext';
import { toast } from 'sonner';
import { Link } from 'react-router-dom';

interface SparePartsGridProps {
  spareParts: SparePart[];
  className?: string;
}

const categoryIcons: Record<string, React.ReactNode> = {
  'Engine Parts': <Package className="h-4 w-4" />,
  'Hydraulic Parts': <Wrench className="h-4 w-4" />,
  'Electrical Parts': <Zap className="h-4 w-4" />,
  'Transmission Parts': <Settings className="h-4 w-4" />,
  'Cooling System': <Package className="h-4 w-4" />,
  'Fuel System': <Package className="h-4 w-4" />,
  'Brake Parts': <Package className="h-4 w-4" />,
  'Steering Parts': <Settings className="h-4 w-4" />,
  'Cabin Parts': <Package className="h-4 w-4" />,
  'Implements': <Wrench className="h-4 w-4" />
};

export const SparePartsGrid: React.FC<SparePartsGridProps> = ({ 
  spareParts, 
  className 
}) => {
  const { addItem } = useQuote();
  const [favorites, setFavorites] = useState<number[]>([]);

  const handleAddToCart = (sparePart: SparePart) => {
    addItem({
      id: String(sparePart.id),
      name: sparePart.name,
      price: sparePart.price,
      image: sparePart.image || '',
      specs: sparePart.specs,
      category: sparePart.category
    });
    toast.success(`${sparePart.name} added to cart!`);
  };

  const toggleFavorite = (sparePartId: number) => {
    setFavorites(prev => 
      prev.includes(sparePartId) 
        ? prev.filter(id => id !== sparePartId)
        : [...prev, sparePartId]
    );
  };

  const getAvailabilityColor = (status: string) => {
    switch (status) {
      case 'in_stock': return 'bg-success text-success-foreground';
      case 'out_of_stock': return 'bg-destructive text-destructive-foreground';
      case 'on_order': return 'bg-yellow-500 text-white';
      case 'discontinued': return 'bg-gray-500 text-white';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  return (
    <div className={cn("grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6", className)}>
      {spareParts.map((sparePart) => (
        <Card 
          key={sparePart.id}
          className="group overflow-hidden hover:shadow-lg transition-all duration-300 hover-scale border-border/50"
        >
          <Link to={`/parts/${sparePart.id}`} className="block">
            <div className="relative overflow-hidden">
              <img
                src={sparePart.image || '/api/placeholder/300/200'}
                alt={sparePart.name}
                className="w-full h-48 object-cover transition-transform duration-300 group-hover:scale-105"
                loading="lazy"
              />
              
              {/* Overlay Badges */}
              <div className="absolute top-3 left-3 flex flex-col gap-2">
                {sparePart.featured && ( // From products.ts
                  <Badge className="bg-primary text-primary-foreground">
                    <Star className="h-3 w-3 mr-1 fill-current" />
                    Featured
                  </Badge>
                )}
              </div>

              <div className="absolute top-3 right-3">
                {/* Using inStock from products.ts */}
                <Badge className={cn("capitalize", sparePart.inStock ? 'bg-success text-success-foreground' : 'bg-destructive text-destructive-foreground')}>
                  {sparePart.inStock ? 'In Stock' : 'Out of Stock'}
                </Badge>
              </div>

              {/* Quick Actions */}
              <div className="absolute bottom-3 right-3 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                <Button
                  size="icon"
                  variant="secondary"
                  onClick={(e) => { 
                    e.preventDefault(); 
                    e.stopPropagation(); 
                    toggleFavorite(sparePart.id); 
                  }}
                  className={cn(
                    "rounded-full backdrop-blur-sm",
                    favorites.includes(sparePart.id) 
                      ? "bg-red-500 text-white hover:bg-red-600" 
                      : "bg-white/90 hover:bg-white"
                  )}
                >
                  <Heart className={cn(
                    "h-4 w-4",
                    favorites.includes(sparePart.id) && "fill-current"
                  )} />
                </Button>
              </div>
            </div>
          </Link>

          <CardContent className="p-4">
            {/* Category Icon and Name */}
            <div className="flex items-center gap-2 mb-2">
              {categoryIcons[sparePart.category]}
              <span className="text-xs text-muted-foreground">{sparePart.category}</span>
            </div>

            {/* Rating */}
            <div className="flex items-center gap-2 mb-3">
              <div className="flex items-center text-yellow-500">
                {[...Array(5)].map((_, i) => (
                  <Star
                    key={i}
                    className={cn("h-3 w-3", i < 4 ? "fill-current" : "text-gray-300")}
                  />
                ))}
              </div>
              <span className="text-xs text-muted-foreground">4.8 (125)</span>
            </div>

            {/* Product Info */}
            <Link to={`/parts/${sparePart.id}`}>
              <h3 className="font-semibold text-card-foreground mb-2 line-clamp-2 group-hover:text-primary transition-colors">
                {sparePart.name}
              </h3>
            </Link>
            
            <p className="text-xs text-muted-foreground mb-2 font-mono">
              Part #: {sparePart.partNumber}
            </p>
            
            <p className="text-sm text-muted-foreground mb-3 line-clamp-2">
              {sparePart.description} {/* From products.ts */}
            </p>

            {/* Brand and Compatibility */}
            <div className="flex items-center justify-between mb-3">
              {sparePart.brand && <Badge variant="outline" className="text-xs">{sparePart.brand}</Badge>}
              {sparePart.compatibility && <span className="text-xs text-muted-foreground">{sparePart.compatibility.length} compatible</span>}
            </div>

            {/* Price and Stock */}
            <div className="flex items-center justify-between mb-4">
              <div>
                <span className="text-lg font-bold text-primary">
                  ${sparePart.price.toLocaleString()} {/* From products.ts */}
                </span>
              </div>
              <div className="text-right">
                <p className="text-xs text-muted-foreground">
                  {sparePart.warranty} warranty
                </p>
              </div>
            </div>
          </CardContent>

          <CardFooter className="p-4 pt-0">
            <Button 
              onClick={(e) => { 
                e.stopPropagation(); 
                e.preventDefault();
                handleAddToCart(sparePart); 
              }}
              disabled={!sparePart.inStock}
              className="w-full bg-primary hover:bg-primary-hover group"
            >
              <ShoppingCart className="h-4 w-4 mr-2" />
              {sparePart.inStock ? 'Add to Cart' : 'Out of Stock'}
            </Button>
          </CardFooter>
        </Card>
      ))}
    </div>
  );
};

export default SparePartsGrid;