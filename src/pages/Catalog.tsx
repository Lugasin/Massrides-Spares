import React, { useState } from "react";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { BackToTop } from "@/components/BackToTop";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, ShoppingCart, Filter } from "lucide-react";
import { products, categories, Product } from "@/data/products";
import { useQuote } from "@/context/QuoteContext";
import { toast } from "sonner";

const Catalog = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [sortBy, setSortBy] = useState("name");
  const [selectedBrand, setSelectedBrand] = useState("All");
  const [minPrice, setMinPrice] = useState(""); // New state for min price
  const [maxPrice, setMaxPrice] = useState(""); // New state for max price
  const [partNumberSearch, setPartNumberSearch] = useState(""); // New state for part number search
  const { addItem, itemCount } = useQuote();

  // Extract unique brands from spare parts for the brand filter
  const brands = ["All", ...Array.from(new Set(products.map(part => part.brand))).sort()];

  const filteredProducts = products
    .filter(part =>
      (part.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        part.partNumber?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        part.partNumber?.toLowerCase().includes(partNumberSearch.toLowerCase())) &&
      (selectedCategory === "All" || part.category === selectedCategory) &&
      (selectedBrand === "All" || part.brand === selectedBrand) &&
      (minPrice === "" || part.price >= parseFloat(minPrice)) &&
      (maxPrice === "" || part.price <= parseFloat(maxPrice))
    )
    .sort((a, b) => {
      switch (sortBy) {
        case "price-low":
          return a.price - b.price;
        case "price-high":
          return b.price - a.price;
        case "name":
        default:
          return a.name.localeCompare(b.name);
      }
    });

  const handleAddToCart = (product: Product) => {
    addItem({
      id: product.id.toString(),
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
        onAuthClick={() => { }}
      />

      <main className="container mx-auto px-4 py-8">
        {/* Page Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-foreground mb-4">
            Massrides Spares Catalog
          </h1>
          <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
            Discover our comprehensive range of agricultural spare parts designed to keep your farming equipment running at peak performance.
          </p>
        </div>

        {/* Enhanced Filters for Spare Parts */}
        <div className="sticky top-16 z-10 mb-8 p-6 bg-card rounded-lg border shadow-sm w-full max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4 items-center">
          <div className="relative col-span-full md:col-span-2">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search parts or part numbers..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 w-full"
            />
          </div>

          <Input
            placeholder="Part Number"
            value={partNumberSearch}
            onChange={(e) => setPartNumberSearch(e.target.value)}
            className="w-full"
          />

          <Select value={selectedCategory} onValueChange={setSelectedCategory}>
            <SelectTrigger className="w-full">
              <Filter className="h-4 w-4 mr-2" />
              <SelectValue placeholder="Category" />
            </SelectTrigger>
            <SelectContent>
              {categories.map(category => (
                <SelectItem key={category} value={category}>
                  {category}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={sortBy} onValueChange={setSortBy}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Sort by" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="name">Name A-Z</SelectItem>
              <SelectItem value="price-low">Price: Low to High</SelectItem>
              <SelectItem value="price-high">Price: High to Low</SelectItem>
            </SelectContent>
          </Select>

          <div className="flex items-center text-sm text-muted-foreground col-span-full md:col-span-4 justify-center md:justify-start">
            Showing {filteredProducts.length} of {products.length} spare parts
          </div>
        </div>

        {/* Spare Parts Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {filteredProducts.map((part) => (
            <Card key={part.id} className="group hover-scale overflow-hidden">
              <div className="relative overflow-hidden">
                <img
                  src={part.image}
                  alt={part.name}
                  className="w-full h-48 object-cover transition-transform duration-300 group-hover:scale-105"
                  loading="lazy"
                />
                {part.featured && (
                  <Badge className="absolute top-2 left-2 bg-primary text-primary-foreground">
                    Featured
                  </Badge>
                )}
                {!part.inStock && (
                  <Badge className="absolute top-2 right-2 bg-destructive text-destructive-foreground">
                    Out of Stock
                  </Badge>
                )}
              </div>

              <CardContent className="p-4">
                <h3 className="font-semibold text-card-foreground mb-2 line-clamp-2">
                  {part.name}
                </h3>

                {part.partNumber && (
                  <p className="text-xs text-muted-foreground mb-2">
                    Part #: {part.partNumber}
                  </p>
                )}

                <p className="text-sm text-muted-foreground mb-3 line-clamp-2">
                  {part.description}
                </p>

                <div className="flex flex-wrap gap-1 mb-3">
                  {part.specs.slice(0, 2).map((spec) => (
                    <Badge key={spec} variant="outline" className="text-xs">
                      {spec}
                    </Badge>
                  ))}
                  {part.specs.length > 2 && (
                    <Badge variant="outline" className="text-xs">
                      +{part.specs.length - 2} more
                    </Badge>
                  )}
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-lg font-bold text-primary">
                    ${part.price.toLocaleString()}
                  </span>

                  <Button
                    onClick={() => handleAddToCart(part)}
                    disabled={!part.inStock}
                    size="sm"
                    className="hover-glow"
                  >
                    <ShoppingCart className="h-4 w-4 mr-1" />
                    Add to Cart
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {filteredProducts.length === 0 && (
          <div className="text-center py-12">
            <h3 className="text-lg font-medium text-foreground mb-2">
              No spare parts found
            </h3>
            <p className="text-muted-foreground">
              Try adjusting your search criteria or browse all categories.
            </p>
          </div>
        )}
      </main>

      <Footer />
      <BackToTop />
    </div>
  );
};

export default Catalog;