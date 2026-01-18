import React, { useState, useEffect } from "react";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { BackToTop } from "@/components/BackToTop";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Search, Filter, SlidersHorizontal, Package, Wrench, Zap, Settings, Thermometer, Fuel, Disc, Home, PenTool as Tool, X } from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
  SheetFooter,
  SheetClose
} from "@/components/ui/sheet";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
  PaginationEllipsis
} from "@/components/ui/pagination";
import { sparePartsData, sparePartCategories, SparePart } from "@/data/sparePartsData";
import SparePartsGrid from "@/components/SparePartsGrid";
import { useQuote } from "@/context/QuoteContext";
import { supabase } from "@/lib/supabaseClient";
import { toast } from "sonner";

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

const ITEMS_PER_PAGE = 12;

const SparePartsCatalog = () => {
  // Search & Filter State
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [selectedBrand, setSelectedBrand] = useState("All");
  const [selectedCondition, setSelectedCondition] = useState("All");
  const [sortBy, setSortBy] = useState("name");
  const [minPrice, setMinPrice] = useState("");
  const [maxPrice, setMaxPrice] = useState("");
  const [showFilters, setShowFilters] = useState(false);

  // Data & Pagination State
  const [spareParts, setSpareParts] = useState<SparePart[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalItems, setTotalItems] = useState(0);

  const { itemCount } = useQuote();

  // Extract unique brands and conditions (Keep using local data for filter options to avoid heavy DISTINCT queries)
  const brands = ["All", ...Array.from(new Set(sparePartsData.map(part => part.brand))).sort()];
  const conditions = ["All", "new", "used", "refurbished", "oem", "aftermarket"];

  // Enhanced categories
  const categoriesWithIcons = [
    { id: "All", label: "All Parts", icon: categoryIcons['All'] },
    ...sparePartCategories.map(cat => ({
      id: cat,
      label: cat,
      icon: categoryIcons[cat] || <Package className="h-4 w-4" />
    }))
  ];

  const totalPages = Math.ceil(totalItems / ITEMS_PER_PAGE);

  // Debounce Search Term
  useEffect(() => {
    const timer = setTimeout(() => {
      setPage(1); // Reset to page 1 on search
      fetchParts();
    }, 500);

    return () => clearTimeout(timer);
  }, [searchTerm]);

  // Fetch when filters change (immediate)
  useEffect(() => {
    setPage(1); // Reset to page 1 on filter change
    fetchParts();
  }, [selectedCategory, selectedBrand, selectedCondition, minPrice, maxPrice, sortBy]);

  // Fetch when page changes
  useEffect(() => {
    fetchParts();
  }, [page]);

  const fetchParts = async () => {
    try {
      setLoading(true);

      // Construct Query
      let query = supabase
        .from('products')
        .select(`
          *,
          category:categories!inner(name),
          inventory(quantity)
        `, { count: 'exact' })
        .eq('active', true);

      // 1. Text Search (Title or SKU)
      if (searchTerm) {
        query = query.or(`title.ilike.%${searchTerm}%,sku.ilike.%${searchTerm}%`);
      }

      // 2. Category Filter (Filter locally on the joined table)
      // Note: 'categories!inner(name)' in select ensures we can filter by 'categories.name'
      if (selectedCategory && selectedCategory !== 'All') {
        query = query.eq('categories.name', selectedCategory);
      }

      // 3. Brand Filter (JSONB Containment)
      if (selectedBrand && selectedBrand !== 'All') {
        query = query.contains('attributes', { brand: selectedBrand });
      }

      // 4. Condition Filter (JSONB Containment)
      if (selectedCondition && selectedCondition !== 'All') {
        query = query.contains('attributes', { condition: selectedCondition });
      }

      // 5. Price Range
      if (minPrice) query = query.gte('price', minPrice);
      if (maxPrice) query = query.lte('price', maxPrice);

      // 6. Sorting
      if (sortBy === 'price-low') {
        query = query.order('price', { ascending: true });
      } else if (sortBy === 'price-high') {
        query = query.order('price', { ascending: false });
      } else {
        // Default: Name (title)
        query = query.order('title', { ascending: true });
      }

      // 7. Pagination
      const from = (page - 1) * ITEMS_PER_PAGE;
      const to = from + ITEMS_PER_PAGE - 1;
      query = query.range(from, to);

      // Execute
      const { data: dbParts, count, error } = await query;

      if (error) {
        console.error('Error fetching parts:', error);
        toast.error('Failed to load catalog');
        // Fallback to local data if DB fails completely
        setSpareParts(sparePartsData.slice(0, ITEMS_PER_PAGE));
        setTotalItems(sparePartsData.length);
      } else {
        // Transform Data
        const transformedParts: SparePart[] = (dbParts || []).map(part => {
          const attrs = part.attributes || {};
          const totalStock = part.inventory?.reduce((sum: number, item: any) => sum + (item.quantity || 0), 0) || 0;

          return {
            id: part.id.toString(),
            partNumber: part.sku || '',
            name: part.title,
            description: part.description || '',
            category: (part.category as any)?.name || 'General',
            brand: attrs.brand || 'Generic',
            oemPartNumber: part.sku,
            price: parseFloat(part.price.toString()),
            condition: (attrs.condition as any) || 'new',
            availabilityStatus: (totalStock > 0 || part.in_stock) ? 'in_stock' : 'out_of_stock',
            stockQuantity: totalStock,
            images: part.main_image ? [part.main_image] : [],
            technicalSpecs: attrs.technicalSpecs || {},
            compatibility: attrs.compatibility || [],
            warranty: attrs.warranty || '12 months',
            weight: attrs.weight ? parseFloat(attrs.weight.toString()) : undefined,
            dimensions: attrs.dimensions,
            featured: (attrs.featured === true || attrs.featured === 'true'),
            tags: attrs.tags || []
          };
        });

        setSpareParts(transformedParts);
        setTotalItems(count || 0);
      }
    } catch (error) {
      console.error('Error in fetchParts:', error);
      toast.error('An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  };

  const clearFilters = () => {
    setSearchTerm("");
    setSelectedCategory("All");
    setSelectedBrand("All");
    setSelectedCondition("All");
    setMinPrice("");
    setMaxPrice("");
    setSortBy("name");
    setPage(1);
  };

  // Pagination Handlers
  const handlePageChange = (newPage: number) => {
    if (newPage >= 1 && newPage <= totalPages) {
      setPage(newPage);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
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
            Discover our comprehensive range of genuine and aftermarket spare parts
            for all your agricultural equipment needs.
          </p>
        </div>

        {/* Search and Quick Filters */}
        <Card className="mb-8">
          <CardContent className="p-4 md:p-6">
            {/* Mobile View: Search + Filter Button */}
            <div className="flex gap-2 md:hidden">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search parts..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Sheet>
                <SheetTrigger asChild>
                  <Button variant="outline" size="icon">
                    <Filter className="h-4 w-4" />
                  </Button>
                </SheetTrigger>
                <SheetContent side="left" className="w-[300px] sm:w-[540px] overflow-y-auto">
                  <SheetHeader>
                    <SheetTitle>Filter & Sort</SheetTitle>
                    <SheetDescription>
                      Refine your search to find the exact parts you need.
                    </SheetDescription>
                  </SheetHeader>
                  <div className="py-6 space-y-6">
                    {/* Sort By */}
                    <div className="space-y-2">
                      <h4 className="font-medium text-sm">Sort By</h4>
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

                    {/* Category */}
                    <div className="space-y-2">
                      <h4 className="font-medium text-sm">Category</h4>
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
                    </div>

                    {/* Brand */}
                    <div className="space-y-2">
                      <h4 className="font-medium text-sm">Brand</h4>
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
                    </div>

                    {/* Condition */}
                    <div className="space-y-2">
                      <h4 className="font-medium text-sm">Condition</h4>
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
                    </div>

                    {/* Price Range */}
                    <div className="space-y-2">
                      <h4 className="font-medium text-sm">Price Range</h4>
                      <div className="flex gap-2">
                        <Input
                          placeholder="Min $"
                          type="number"
                          value={minPrice}
                          onChange={(e) => setMinPrice(e.target.value)}
                        />
                        <Input
                          placeholder="Max $"
                          type="number"
                          value={maxPrice}
                          onChange={(e) => setMaxPrice(e.target.value)}
                        />
                      </div>
                    </div>

                    <Button onClick={clearFilters} variant="outline" className="w-full">
                      Clear All Filters
                    </Button>
                  </div>
                  <SheetFooter>
                    <SheetClose asChild>
                      <Button type="submit" className="w-full">Show Results ({totalItems})</Button>
                    </SheetClose>
                  </SheetFooter>
                </SheetContent>
              </Sheet>
            </div>

            {/* Desktop View: Existing Layout (Hidden on Mobile) */}
            <div className="hidden md:block">
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
                    Showing {spareParts.length} of {totalItems} parts
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
            </div>
          </CardContent>
        </Card>

        {/* Category Quick Filter Pills - Hidden on mobile as they are in the drawer */}
        <div className="hidden md:flex flex-wrap gap-2 mb-8">
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
          <>
            <SparePartsGrid spareParts={spareParts.map(part => ({
              ...part,
              image: part.images[0] || '/placeholder.png',
              specs: Object.values(part.technicalSpecs || {}),
              inStock: part.availabilityStatus === 'in_stock'
            }))} />

            {/* Pagination Controls */}
            {totalPages > 1 && (
              <div className="mt-8">
                <Pagination>
                  <PaginationContent>
                    <PaginationItem>
                      <PaginationPrevious
                        onClick={() => handlePageChange(page - 1)}
                        className={page === 1 ? "pointer-events-none opacity-50" : "cursor-pointer"}
                      />
                    </PaginationItem>

                    <PaginationItem>
                      <span className="px-4 text-sm text-muted-foreground">
                        Page {page} of {totalPages}
                      </span>
                    </PaginationItem>

                    <PaginationItem>
                      <PaginationNext
                        onClick={() => handlePageChange(page + 1)}
                        className={page === totalPages ? "pointer-events-none opacity-50" : "cursor-pointer"}
                      />
                    </PaginationItem>
                  </PaginationContent>
                </Pagination>
              </div>
            )}
          </>
        )}
      </main>

      <Footer />
      <BackToTop />
    </div>
  );
};

export default SparePartsCatalog;