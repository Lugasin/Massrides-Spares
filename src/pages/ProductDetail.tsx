import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { BackToTop } from "@/components/BackToTop";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ShoppingCart, Star } from "lucide-react";
import { useQuote } from "@/context/QuoteContext";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase";

const SparePartDetail = () => {
  const { productId, partId } = useParams<{ productId?: string; partId?: string }>();
  const [sparePart, setSparePart] = useState<any | undefined>(undefined);
  const { addItem, itemCount } = useQuote();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchProduct = async () => {
      setLoading(true);
      const id = productId || partId;
      if (!id) {
        setLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from('products')
        .select('*')
        .eq('id', id)
        .single();

      if (data) {
        setSparePart(data);
      } else if (error) {
        console.error('Error fetching product:', error);
      }
      setLoading(false);
    };

    fetchProduct();
  }, [productId, partId]);

  const handleAddToCart = () => {
    if (sparePart) {
      addItem({
        id: String(sparePart.id),
        name: sparePart.title || sparePart.name,
        price: sparePart.price,
        image: sparePart.image,
        specs: sparePart.specs,
        category: sparePart.category
      });
      toast.success(`${sparePart.title || sparePart.name} added to cart!`);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-muted-foreground">Loading...</p>
      </div>
    );
  }

  if (!sparePart) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-muted-foreground">Spare part not found.</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Header cartItemsCount={itemCount} />

      <main className="container mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Spare Part Images */}
          <div className="">
            <img
              src={sparePart.image || '/placeholder-part.png'}
              alt={sparePart.title || sparePart.name}
              className="w-full h-auto aspect-[3/4] object-contain rounded-lg shadow-lg bg-white p-4"
              loading="lazy"
              onError={(e) => {
                (e.target as HTMLImageElement).src = '/placeholder-part.png';
              }}
            />
          </div>

          {/* Spare Part Details */}
          <div className="">
            <h1 className="text-3xl font-bold text-foreground mb-3">{sparePart.title || sparePart.name}</h1>

            {sparePart.part_number && (
              <div className="mb-3">
                <span className="text-sm text-muted-foreground">Part Number: </span>
                <span className="font-mono text-sm font-medium">{sparePart.part_number}</span>
              </div>
            )}

            {/* Rating - Hardcoded for demo if not in DB, assuming 4.8 default */}
            <div className="flex items-center gap-2 mb-3">
              <div className="flex items-center text-yellow-500">
                {[...Array(5)].map((_, i) => (
                  <Star
                    key={i}
                    className={`h-5 w-5 ${i < 4 ? 'fill-current' : 'text-gray-300 fill-transparent'}`}
                  />
                ))}
              </div>
              <span className="text-sm text-muted-foreground">
                4.8 (125 reviews)
              </span>
            </div>

            {/* Description */}
            <p className="text-lg text-muted-foreground mb-6">{sparePart.description}</p>

            {/* Price */}
            <div className="flex items-center gap-4 mb-6">
              <span className="text-4xl font-bold text-primary">${sparePart.price?.toLocaleString()}</span>
              {sparePart.in_stock ? (
                <Badge className="bg-success text-success-foreground">In Stock</Badge>
              ) : (
                <Badge variant="destructive">Out of Stock</Badge>
              )}
              {sparePart.attributes?.warranty && (
                <Badge variant="outline">
                  {JSON.parse(JSON.stringify(sparePart.attributes)).warranty || "12 months"} Warranty
                </Badge>
              )}
            </div>

            {/* Add to Cart */}
            <Button
              size="lg"
              className="w-full bg-primary hover:bg-primary-hover mb-6"
              onClick={handleAddToCart}
              disabled={!sparePart.in_stock}
            >
              <ShoppingCart className="h-5 w-5 mr-2" />
              Add to Cart
            </Button>

            {/* Specifications */}
            {sparePart.specs && (
              <div className="mb-6">
                <h3 className="text-xl font-semibold text-foreground mb-3">Specifications</h3>
                <ul className="list-disc list-inside text-muted-foreground space-y-2">
                  {sparePart.specs.map((spec: string, index: number) => (
                    <li key={index}>{spec}</li>
                  ))}
                </ul>
              </div>
            )}

            {/* Compatibility */}
            <div className="mb-6">
              <h3 className="text-xl font-semibold text-foreground mb-3">Compatibility</h3>
              {sparePart.compatibility && sparePart.compatibility.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {sparePart.compatibility.map((model: string, index: number) => (
                    <Badge key={index} variant="outline">
                      {model}
                    </Badge>
                  ))}
                </div>
              ) : (
                <p className="text-muted-foreground">
                  Contact our technical team for compatibility information.
                </p>
              )}
            </div>

            {/* Warranty */}
            <div className="mb-6">
              <h3 className="text-xl font-semibold text-foreground mb-3">Warranty</h3>
              <p className="text-muted-foreground">
                {JSON.parse(JSON.stringify(sparePart.attributes || {})).warranty || "12 months"} manufacturer's warranty covering defects and performance.
              </p>
            </div>

            {/* Installation Support */}
            <div className="mb-6">
              <h3 className="text-xl font-semibold text-foreground mb-3">Installation Support</h3>
              <p className="text-muted-foreground">
                Professional installation services available. Our certified technicians can help with complex installations.
                <a href="/installation" className="text-primary hover:underline">Learn more</a>.
              </p>
            </div>

            {/* Technical Details */}
            <div>
              <h3 className="text-xl font-semibold text-foreground mb-3">Technical Details</h3>
              <p className="text-muted-foreground">
                Need technical specifications or installation guidance? Contact our parts specialists for detailed information.
              </p>
            </div>

          </div>
        </div>

      </main>

      <Footer />
      <BackToTop />
    </div>
  );
};

export default SparePartDetail;
