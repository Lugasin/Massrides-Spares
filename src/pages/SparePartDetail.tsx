import React, { useEffect, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { BackToTop } from "@/components/BackToTop";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  ShoppingCart,
  Star,
  Heart,
  Share2,
  Truck,
  Shield,
  Wrench,
  ArrowLeft,
  CheckCircle,
  Package,
  Info
} from "lucide-react";
import { useQuote } from "@/context/QuoteContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface SparePart {
  id: string;
  part_number: string;
  name: string;
  description: string;
  price: number;
  brand: string;
  oem_part_number?: string;
  condition: string;
  availability_status: string;
  stock_quantity: number;
  images: string[];
  technical_specs: any;
  warranty_months?: number | null;
  weight_kg?: number;
  dimensions_cm?: string;
  featured: boolean;
  tags: string[];
  category: {
    name: string;
  };
  equipment_compatibility: Array<{
    equipment_type: {
      name: string;
      brand: string;
    };
    is_direct_fit: boolean;
    compatibility_notes?: string;
  }>;
}

const SparePartDetail = () => {
  const { partId } = useParams<{ partId: string }>();
  const navigate = useNavigate();
  const [sparePart, setSparePart] = useState<SparePart | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedImage, setSelectedImage] = useState(0);
  const [quantity, setQuantity] = useState(1);
  const [isFavorite, setIsFavorite] = useState(false);
  const { addItem, itemCount } = useQuote();

  useEffect(() => {
    if (partId) {
      fetchSparePartDetails();
    }
  }, [partId]);

  const fetchSparePartDetails = async () => {
    try {
      const { data, error } = await supabase
        .from('products')
        .select(`
          *,
          category:categories!category_id(name),
          inventory(quantity)
        `)
        .eq('id', partId)
        .single();

      if (error) throw error;

      const product = data as any;
      const attrs = product.attributes || {};
      const totalStock = product.inventory?.reduce((sum: number, item: any) => sum + (item.quantity || 0), 0) || 0;

      const mappedPart: SparePart = {
        id: product.id.toString(),
        part_number: product.sku || '',
        name: product.title,
        description: product.description || '',
        price: Number(product.price),
        brand: attrs.brand || 'Generic',
        oem_part_number: product.sku,
        condition: attrs.condition || 'new',
        availability_status: totalStock > 0 ? 'in_stock' : 'out_of_stock',
        stock_quantity: totalStock,
        images: product.main_image ? [product.main_image] : [],
        technical_specs: attrs.technicalSpecs || {},
        warranty_months: attrs.warranty ? parseInt(attrs.warranty) : 12,
        weight_kg: attrs.weight,
        dimensions_cm: attrs.dimensions,
        featured: attrs.featured === true,
        tags: attrs.tags || [],
        category: {
          name: product.category?.name || 'General'
        },
        equipment_compatibility: (attrs.compatibility || []).map((comp: string) => ({
          equipment_type: { name: comp, brand: 'Universal' },
          is_direct_fit: true
        }))
      };

      setSparePart(mappedPart);
    } catch (error: any) {
      console.error('Error fetching spare part:', error);
      toast.error('Failed to load spare part details');
    } finally {
      setLoading(false);
    }
  };

  const handleAddToCart = async () => {
    if (!sparePart) return;

    try {
      // Add to cart via Supabase
      const { data: { user } } = await supabase.auth.getUser();

      if (user) {
        // User is logged in
        const { data: profile } = await supabase
          .from('user_profiles')
          .select('id')
          .eq('user_id', user.id)
          .single();

        if (profile) {
          // Get or create cart
          let { data: cart } = await supabase
            .from('user_carts')
            .select('id')
            .eq('user_id', profile.id)
            .single();

          if (!cart) {
            const { data: newCart } = await supabase
              .from('user_carts')
              .insert({ user_id: profile.id })
              .select('id')
              .single();
            cart = newCart;
          }

          // Add item to cart
          const { error } = await supabase
            .from('cart_items')
            .upsert({
              cart_id: cart!.id,
              product_id: parseInt(sparePart.id), // Ensure it's number if DB expects bigint, or string if uuid. Products ID is bigint (serial) in migration? Yes.
              quantity: quantity
            });

          if (error) throw error;
        }
      } else {
        // Guest user
        const sessionId = localStorage.getItem('guest_session_id') || crypto.randomUUID();
        localStorage.setItem('guest_session_id', sessionId);

        let { data: guestCart } = await supabase
          .from('guest_carts')
          .select('id')
          .eq('session_id', sessionId)
          .single();

        if (!guestCart) {
          const { data: newGuestCart } = await supabase
            .from('guest_carts')
            .insert({ session_id: sessionId })
            .select('id')
            .single();
          guestCart = newGuestCart;
        }

        const { error } = await supabase
          .from('guest_cart_items')
          .upsert({
            guest_cart_id: guestCart!.id,
            product_id: parseInt(sparePart.id),
            quantity: quantity
          });

        if (error) throw error;
      }

      // Also add to local cart context for immediate UI update
      addItem({
        id: sparePart.id, // This is a string (UUID) from the database
        name: sparePart.name,
        price: sparePart.price,
        image: sparePart.images[0] || '',
        specs: sparePart.tags,
        category: sparePart.category.name
      });

      toast.success(`${sparePart.name} added to cart!`);
    } catch (error: any) {
      console.error('Error adding to cart:', error);
      toast.error('Failed to add item to cart');
    }
  };

  const toggleFavorite = () => {
    setIsFavorite(!isFavorite);
    toast.success(isFavorite ? 'Removed from favorites' : 'Added to favorites');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Header cartItemsCount={itemCount} />
        <main className="container mx-auto px-4 py-8">
          <div className="animate-pulse">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              <div className="bg-muted rounded-lg h-96"></div>
              <div className="space-y-4">
                <div className="bg-muted rounded h-8 w-3/4"></div>
                <div className="bg-muted rounded h-4 w-1/2"></div>
                <div className="bg-muted rounded h-20"></div>
              </div>
            </div>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  if (!sparePart) {
    return (
      <div className="min-h-screen bg-background">
        <Header cartItemsCount={itemCount} />
        <main className="container mx-auto px-4 py-8">
          <div className="text-center py-16">
            <Package className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
            <h1 className="text-2xl font-bold mb-4">Spare Part Not Found</h1>
            <p className="text-muted-foreground mb-8">
              The spare part you're looking for doesn't exist or has been removed.
            </p>
            <Button asChild>
              <Link to="/catalog">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Browse All Parts
              </Link>
            </Button>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Header cartItemsCount={itemCount} />

      <main className="container mx-auto px-4 py-8">
        {/* Breadcrumb */}
        <nav className="flex items-center space-x-2 text-sm text-muted-foreground mb-6">
          <Link to="/" className="hover:text-primary">Home</Link>
          <span>/</span>
          <Link to="/catalog" className="hover:text-primary">Catalog</Link>
          <span>/</span>
          <Link to={`/catalog?category=${sparePart.category.name}`} className="hover:text-primary">
            {sparePart.category.name}
          </Link>
          <span>/</span>
          <span className="text-foreground">{sparePart.name}</span>
        </nav>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-12">
          {/* Image Gallery */}
          <div className="space-y-4">
            <div className="relative overflow-hidden rounded-lg bg-muted">
              <img
                src={sparePart.images[selectedImage] || sparePart.images[0]}
                alt={sparePart.name}
                className="w-full h-96 object-cover"
                loading="lazy"
              />
              {sparePart.featured && (
                <Badge className="absolute top-4 left-4 bg-primary text-primary-foreground">
                  Featured
                </Badge>
              )}
              <Badge
                className={cn(
                  "absolute top-4 right-4",
                  sparePart.availability_status === 'in_stock'
                    ? "bg-success text-success-foreground"
                    : "bg-destructive text-destructive-foreground"
                )}
              >
                {sparePart.availability_status === 'in_stock' ? 'In Stock' : 'Out of Stock'}
              </Badge>
            </div>

            {/* Thumbnail Gallery */}
            {sparePart.images.length > 1 && (
              <div className="flex gap-2 overflow-x-auto">
                {sparePart.images.map((image, index) => (
                  <button
                    key={index}
                    onClick={() => setSelectedImage(index)}
                    className={cn(
                      "flex-shrink-0 w-20 h-20 rounded-md overflow-hidden border-2 transition-colors",
                      selectedImage === index ? "border-primary" : "border-border"
                    )}
                  >
                    <img
                      src={image}
                      alt={`${sparePart.name} view ${index + 1}`}
                      className="w-full h-full object-cover"
                    />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Product Details */}
          <div className="space-y-6">
            <div>
              <div className="flex items-start justify-between mb-2">
                <h1 className="text-3xl font-bold text-foreground">{sparePart.name}</h1>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={toggleFavorite}
                  className={cn(
                    "transition-colors",
                    isFavorite ? "text-red-500" : "text-muted-foreground"
                  )}
                >
                  <Heart className={cn("h-5 w-5", isFavorite && "fill-current")} />
                </Button>
              </div>

              <div className="flex items-center gap-4 mb-4">
                <div className="flex items-center text-yellow-500">
                  {[...Array(5)].map((_, i) => (
                    <Star
                      key={i}
                      className={cn("h-4 w-4", i < 4 ? "fill-current" : "text-gray-300")}
                    />
                  ))}
                </div>
                <span className="text-sm text-muted-foreground">4.8 (125 reviews)</span>
              </div>

              <div className="space-y-2 text-sm">
                <p><span className="text-muted-foreground">Part Number:</span> <span className="font-mono font-medium">{sparePart.part_number}</span></p>
                {sparePart.oem_part_number && (
                  <p><span className="text-muted-foreground">OEM Part Number:</span> <span className="font-mono font-medium">{sparePart.oem_part_number}</span></p>
                )}
                <p><span className="text-muted-foreground">Brand:</span> <span className="font-medium">{sparePart.brand}</span></p>
                <p><span className="text-muted-foreground">Condition:</span>
                  <Badge variant="outline" className="ml-2 capitalize">{sparePart.condition}</Badge>
                </p>
              </div>
            </div>

            {/* Price and Stock */}
            <div className="space-y-4">
              <div className="flex items-center gap-4">
                <span className="text-4xl font-bold text-primary">${sparePart.price.toLocaleString()}</span>
                <div className="text-sm text-muted-foreground">
                  <p>Stock: {sparePart.stock_quantity} units</p>
                  {sparePart.warranty_months != null && (
                    <p>Warranty: {sparePart.warranty_months} months</p>
                  )}
                </div>
              </div>

              {/* Quantity Selector */}
              <div className="flex items-center gap-4">
                <label className="text-sm font-medium">Quantity:</label>
                <div className="flex items-center border rounded-md">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setQuantity(Math.max(1, quantity - 1))}
                    disabled={quantity <= 1}
                  >
                    -
                  </Button>
                  <span className="px-4 py-2 min-w-[60px] text-center">{quantity}</span>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setQuantity(Math.min(sparePart.stock_quantity, quantity + 1))}
                    disabled={quantity >= sparePart.stock_quantity}
                  >
                    +
                  </Button>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="space-y-3">
                <Button
                  size="lg"
                  className="w-full bg-primary hover:bg-primary-hover"
                  onClick={handleAddToCart}
                  disabled={sparePart.availability_status !== 'in_stock'}
                >
                  <ShoppingCart className="h-5 w-5 mr-2" />
                  Add to Cart - ${(sparePart.price * quantity).toLocaleString()}
                </Button>

                <div className="grid grid-cols-2 gap-3">
                  <Button variant="outline" size="lg">
                    <Heart className="h-4 w-4 mr-2" />
                    Save for Later
                  </Button>
                  <Button variant="outline" size="lg">
                    <Share2 className="h-4 w-4 mr-2" />
                    Share Part
                  </Button>
                </div>
              </div>

              {/* Features */}
              <div className="grid grid-cols-3 gap-4 pt-4 border-t">
                <div className="text-center">
                  <Truck className="h-6 w-6 text-primary mx-auto mb-2" />
                  <p className="text-xs text-muted-foreground">Fast Shipping</p>
                </div>
                <div className="text-center">
                  <Shield className="h-6 w-6 text-primary mx-auto mb-2" />
                  <p className="text-xs text-muted-foreground">{sparePart.warranty_months ?? 'N/A'}mo Warranty</p>
                </div>
                <div className="text-center">
                  <Wrench className="h-6 w-6 text-primary mx-auto mb-2" />
                  <p className="text-xs text-muted-foreground">Expert Support</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Detailed Information Tabs */}
        <Tabs defaultValue="description" className="mb-12">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="description">Description</TabsTrigger>
            <TabsTrigger value="specifications">Specifications</TabsTrigger>
            <TabsTrigger value="compatibility">Compatibility</TabsTrigger>
            <TabsTrigger value="reviews">Reviews</TabsTrigger>
          </TabsList>

          <TabsContent value="description" className="mt-6">
            <Card>
              <CardContent className="p-6">
                <h3 className="text-xl font-semibold mb-4">Product Description</h3>
                <p className="text-muted-foreground leading-relaxed mb-6">
                  {sparePart.description}
                </p>

                {sparePart.tags.length > 0 && (
                  <div>
                    <h4 className="font-medium mb-3">Tags</h4>
                    <div className="flex flex-wrap gap-2">
                      {sparePart.tags.map((tag) => (
                        <Badge key={tag} variant="outline" className="capitalize">
                          {tag}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="specifications" className="mt-6">
            <Card>
              <CardContent className="p-6">
                <h3 className="text-xl font-semibold mb-4">Technical Specifications</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <h4 className="font-medium mb-3">Basic Information</h4>
                    <dl className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <dt className="text-muted-foreground">Part Number:</dt>
                        <dd className="font-mono">{sparePart.part_number}</dd>
                      </div>
                      <div className="flex justify-between">
                        <dt className="text-muted-foreground">Brand:</dt>
                        <dd>{sparePart.brand}</dd>
                      </div>
                      <div className="flex justify-between">
                        <dt className="text-muted-foreground">Condition:</dt>
                        <dd className="capitalize">{sparePart.condition}</dd>
                      </div>
                      {sparePart.weight_kg && (
                        <div className="flex justify-between">
                          <dt className="text-muted-foreground">Weight:</dt>
                          <dd>{sparePart.weight_kg} kg</dd>
                        </div>
                      )}
                      {sparePart.dimensions_cm && (
                        <div className="flex justify-between">
                          <dt className="text-muted-foreground">Dimensions:</dt>
                          <dd>{sparePart.dimensions_cm}</dd>
                        </div>
                      )}
                    </dl>
                  </div>

                  {sparePart.technical_specs && (
                    <div>
                      <h4 className="font-medium mb-3">Technical Details</h4>
                      <dl className="space-y-2 text-sm">
                        {Object.entries(sparePart.technical_specs).map(([key, value]) => (
                          <div key={key} className="flex justify-between">
                            <dt className="text-muted-foreground capitalize">
                              {key.replace(/([A-Z])/g, ' $1').trim()}:
                            </dt>
                            <dd>{String(value)}</dd>
                          </div>
                        ))}
                      </dl>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="compatibility" className="mt-6">
            <Card>
              <CardContent className="p-6">
                <h3 className="text-xl font-semibold mb-4">Equipment Compatibility</h3>
                {sparePart.equipment_compatibility.length > 0 ? (
                  <div className="space-y-4">
                    {sparePart.equipment_compatibility.map((comp, index) => (
                      <div key={index} className="flex items-start gap-3 p-4 bg-muted/30 rounded-lg">
                        <CheckCircle className={cn(
                          "h-5 w-5 mt-0.5",
                          comp.is_direct_fit ? "text-success" : "text-yellow-500"
                        )} />
                        <div>
                          <p className="font-medium">
                            {comp.equipment_type.brand} {comp.equipment_type.name}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            {comp.is_direct_fit ? 'Direct fit' : 'May require modification'}
                          </p>
                          {comp.compatibility_notes && (
                            <p className="text-sm text-muted-foreground mt-1">
                              {comp.compatibility_notes}
                            </p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <Info className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <p className="text-muted-foreground">
                      Contact our technical team for compatibility information.
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="reviews" className="mt-6">
            <Card>
              <CardContent className="p-6">
                <h3 className="text-xl font-semibold mb-4">Customer Reviews</h3>
                <div className="text-center py-8">
                  <Star className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground">
                    Reviews feature coming soon. Be the first to review this part!
                  </p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Related Parts */}
        <section>
          <h2 className="text-2xl font-bold mb-6">Related Spare Parts</h2>
          <div className="text-center py-8 bg-muted/30 rounded-lg">
            <Package className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground">Related parts recommendations coming soon.</p>
          </div>
        </section>
      </main>

      <Footer />
      <BackToTop />
    </div>
  );
};

export default SparePartDetail;