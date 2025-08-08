import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { spareParts, SparePart } from "@/data/products"; // Import spareParts and SparePart interface
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { BackToTop } from "@/components/BackToTop";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ShoppingCart, Star } from "lucide-react";
import { useQuote } from "@/context/QuoteContext";
import { toast } from "sonner";

const SparePartDetail = () => {
  const { productId, partId } = useParams<{ productId?: string; partId?: string }>();
  const [sparePart, setSparePart] = useState<SparePart | undefined>(undefined);
  const { addItem, itemCount } = useQuote();

  useEffect(() => {
    // Find the spare part by ID (support both productId and partId for backward compatibility)
    const id = productId || partId;
    const foundPart = spareParts.find(p => p.id === Number(id));
    setSparePart(foundPart);
  }, [productId, partId]);

  const handleAddToCart = () => {
    if (sparePart) {
       addItem({
        id: sparePart.id,
        name: sparePart.name,
        price: sparePart.price,
        image: sparePart.image,
        specs: sparePart.specs,
        category: sparePart.category
      });
      toast.success(`${sparePart.name} added to cart!`);
    }
  };

  if (!sparePart) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-muted-foreground">Spare part not found.</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Header cartItemsCount={itemCount} /> {/* Pass itemCount to Header */}
      
      <main className="container mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Spare Part Images */}
          <div className="">
            {/* Main Image */}
            <img 
              src={sparePart.image}
              alt={sparePart.name}
              className="w-full h-96 object-cover rounded-lg shadow-lg"
            />
            {/* Thumbnails (Add more images to product data later) */}
            <div className="flex gap-4 mt-4">
              {/* Example thumbnail - replace with actual image map if multiple images */}
               <img 
                src={sparePart.image}
                alt={`${sparePart.name} thumbnail`}
                className="w-20 h-20 object-cover rounded-md cursor-pointer border-2 border-primary"
              />
              {/* Add more thumbnails here */}
            </div>
          </div>

          {/* Spare Part Details */}
          <div className="">
            <h1 className="text-3xl font-bold text-foreground mb-3">{sparePart.name}</h1>
            
            {sparePart.partNumber && (
              <div className="mb-3">
                <span className="text-sm text-muted-foreground">Part Number: </span>
                <span className="font-mono text-sm font-medium">{sparePart.partNumber}</span>
              </div>
            )}
            
             {/* Rating */}
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
              <span className="text-4xl font-bold text-primary">${sparePart.price.toLocaleString()}</span>
              {sparePart.inStock ? (
                 <Badge className="bg-success text-success-foreground">In Stock</Badge>
              ) : (
                 <Badge variant="destructive">Out of Stock</Badge>
              )}
              {sparePart.warranty && (
                <Badge variant="outline">
                  {sparePart.warranty} Warranty
                </Badge>
              )}
            </div>

            {/* Add to Cart */}
            <Button 
              size="lg" 
              className="w-full bg-primary hover:bg-primary-hover mb-6"
              onClick={handleAddToCart}
              disabled={!sparePart.inStock}
            >
              <ShoppingCart className="h-5 w-5 mr-2" />
              Add to Cart
            </Button>

            {/* Specifications */}
            <div className="mb-6">
              <h3 className="text-xl font-semibold text-foreground mb-3">Specifications</h3>
              <ul className="list-disc list-inside text-muted-foreground space-y-2">
                {sparePart.specs.map((spec, index) => (
                  <li key={index}>{spec}</li>
                ))}
              </ul>
            </div>

            {/* Compatibility */}
            <div className="mb-6">
               <h3 className="text-xl font-semibold text-foreground mb-3">Compatibility</h3>
               {sparePart.compatibility && sparePart.compatibility.length > 0 ? (
                 <div className="flex flex-wrap gap-2">
                   {sparePart.compatibility.map((model, index) => (
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
                 {sparePart.warranty || "12 months"} manufacturer's warranty covering defects and performance. Extended warranty options available.
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
