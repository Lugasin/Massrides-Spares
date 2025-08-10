import React, { useState, useEffect } from "react";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { BackToTop } from "@/components/BackToTop";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { 
  Search, 
  Filter, 
  SlidersHorizontal,
  Package,
  Wrench,
  Zap,
  Settings,
  Thermometer,
  Fuel,
  Disc,
  Home,
  Tool
} from "lucide-react";
import { sparePartsData, sparePartCategories, SparePart } from "@/data/sparePartsData";
import SparePartsGrid from "@/components/SparePartsGrid";
import { useQuote } from "@/context/QuoteContext";
import { supabase } from "@/lib/supabaseClient";

const categoryIcons: Record<string, React.ReactNode> = {
  'All': <Package className="h-4 w-4" />,
  'Engine Parts': <Package className="h-4 w-4" />,
  'Hydraulic Parts': <Wrench className="h-4 w-4" />,
  'Electrical Parts': <Zap className="h-4 w-4" />,
  'Transmission Parts': <Settings className="h-4 w-4" />,
  'Cooling System': <Thermometer className="h-4 w-4" />,
  'Fuel System': <Fuel className="h-4 w-4" />,
  'Brake Parts': <Disc className="h-4 w-4" />,
  'Steering Parts': <Settings className="h-4 w-4" />,
  'Cabin Parts': <Home className="h-4 w-4" />,
  'Implements': <Tool className="h-4 w-4" />
};

const SparePartsCatalog = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [selectedBrand, setSelectedBrand] = useState("All");
  const [selectedCondition, setSelectedCondition] = useState("All");
  const [sortBy, setSortBy] = useState("name");
  const [minPrice, setMinPrice] = useState("");
  const [maxPrice, setMaxPrice] = useState("");
  const [showFilters, setShowFilters] = useState(false);
  const [spareParts, setSpareParts] = useState<SparePart[]>(sparePartsData);
  const [loading, setLoading] = useState(false);
  const { itemCount } = useQuote();

  // Extract unique brands and conditions
  const brands = ["All", ...Array.from(new Set(sparePartsData.map(part => part.brand))).sort()];
  const conditions = ["All", "new", "used", "refurbished", "oem", "aftermarket"];

  // Enhanced categories with icons
  const categoriesWithIcons = [
    { id: "All", label: "All Parts", icon: categoryIcons['All'] },
    ...sparePartCategories.map(cat => ({
      id: cat,
      label: cat,
      icon: categoryIcons[cat] || <Package className="h-4 w-4" />
    }))
  ];

  useEffect(() => {
    // In a real app, this would fetch from Supabase
    // For now, using local data
    filterAndSortParts();
  }, [searchTerm, selectedCategory, selectedBrand, selectedCondition, sortBy, minPrice, maxPrice]);

  const filterAndSortParts = () => {
    let filtered = sparePartsData.filter(part => {
      const matchesSearch = !searchTerm || 
        part.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        part.partNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
        part.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
        part.brand.toLowerCase().includes(searchTerm.toLowerCase());

      const matchesCategory = selectedCategory === "All" || part.category === selectedCategory;
      const matchesBrand = selectedBrand === "All" || part.brand === selectedBrand;
      const matchesCondition = selectedCondition === "All" || part.condition === selectedCondition;
      
      const matchesPrice = (!minPrice || part.price >= parseFloat(minPrice)) &&
                          (!maxPrice || part.price <= parseFloat(maxPrice));

      return matchesSearch && matchesCategory && matchesBrand && matchesCondition && matchesPrice;
    });

    // Sort parts
    filtered.sort((a, b) => {
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

    setSpareParts(filtered);
  };

  const clearFilters = () => {
    setSearchTerm("");
    setSelectedCategory("All");
    setSelectedBrand("All");
    setSelectedCondition("All");
    setMinPrice("");
    setMaxPrice("");
    setSortBy("name");
  };

  return (
    <div className="min-h-screen bg-background">
      <Header 
        cartItemsCount={itemCount}
        onAuthClick={() => {}}
      />
      
      <main className="container mx-auto px-4 py-8">
        {/* Page Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-foreground mb-4">
            Agricultural Spare Parts Catalog
          </h1>
          <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
            Discover our comprehensive range of genuine and aftermarket spare parts 
            for all your agricultural equipment needs.
          </p>
        </div>

        {/* Search and Quick Filters */}
        <Card className="mb-8">
          <CardContent className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
              <div className="relative md:col-span-2">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search parts, part numbers, or descriptions..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
              
              <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                <SelectTrigger>
                  <SelectValue placeholder="Category" />
                </SelectTrigger>
                <SelectContent>
                  {categoriesWithIcons.map(category => (
                    <SelectItem key={category.id} value={category.id}>
                      <div className="flex items-center gap-2">
                        {category.icon}
                        {category.label}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={sortBy} onValueChange={setSortBy}>
                <SelectTrigger>
                  <SelectValue placeholder="Sort by" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="name">Name A-Z</SelectItem>
                  <SelectItem value="price-low">Price: Low to High</SelectItem>
                  <SelectItem value="price-high">Price: High to Low</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Advanced Filters Toggle */}
            <div className="flex items-center justify-between">
              <Button
                variant="outline"
                onClick={() => setShowFilters(!showFilters)}
                className="flex items-center gap-2"
              >
                <SlidersHorizontal className="h-4 w-4" />
                Advanced Filters
              </Button>
              
              <div className="flex items-center gap-4">
                <span className="text-sm text-muted-foreground">
                  Showing {spareParts.length} of {sparePartsData.length} parts
                </span>
                {(searchTerm || selectedCategory !== "All" || selectedBrand !== "All" || selectedCondition !== "All" || minPrice || maxPrice) && (
                  <Button variant="ghost" size="sm" onClick={clearFilters}>
                    Clear Filters
                  </Button>
                )}
              </div>
            </div>

            {/* Advanced Filters */}
            {showFilters && (
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mt-4 pt-4 border-t">
                <Select value={selectedBrand} onValueChange={setSelectedBrand}>
                  <SelectTrigger>
                    <SelectValue placeholder="Brand" />
                  </SelectTrigger>
                  <SelectContent>
                    {brands.map(brand => (
                      <SelectItem key={brand} value={brand}>
                        {brand}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Select value={selectedCondition} onValueChange={setSelectedCondition}>
                  <SelectTrigger>
                    <SelectValue placeholder="Condition" />
                  </SelectTrigger>
                  <SelectContent>
                    {conditions.map(condition => (
                      <SelectItem key={condition} value={condition}>
                        <span className="capitalize">{condition === "All" ? "All" : condition}</span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Input
                  placeholder="Min Price ($)"
                  type="number"
                  value={minPrice}
                  onChange={(e) => setMinPrice(e.target.value)}
                />

                <Input
                  placeholder="Max Price ($)"
                  type="number"
                  value={maxPrice}
                  onChange={(e) => setMaxPrice(e.target.value)}
                />
              </div>
            )}
          </CardContent>
        </Card>

        {/* Category Quick Filter Pills */}
        <div className="flex flex-wrap gap-2 mb-8">
          {categoriesWithIcons.map((category) => (
            <Button
              key={category.id}
              variant={selectedCategory === category.id ? "default" : "outline"}
              size="sm"
              onClick={() => setSelectedCategory(category.id)}
              className="flex items-center gap-2"
            >
              {category.icon}
              {category.label}
            </Button>
          ))}
        </div>

        {/* Results */}
        {loading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-muted-foreground">Loading spare parts...</p>
          </div>
        ) : spareParts.length === 0 ? (
          <div className="text-center py-12">
            <Package className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-medium text-foreground mb-2">
              No spare parts found
            </h3>
            <p className="text-muted-foreground mb-6">
              Try adjusting your search criteria or browse all categories.
            </p>
            <Button onClick={clearFilters}>
              Clear All Filters
            </Button>
          </div>
        ) : (
          <SparePartsGrid spareParts={spareParts} />
        )}
      </main>

      <Footer />
      <BackToTop />
    </div>
  );
};

export default SparePartsCatalog;