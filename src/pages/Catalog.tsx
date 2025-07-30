import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, Filter, Grid, List, ShoppingCart } from "lucide-react";
import { useQuote } from "@/context/QuoteContext";
import { toast } from "sonner";

// Product data with actual images
const products = [
  {
    id: 1,
    name: "Advanced Planter 3000",
    image: "/src/assets/planter-seeding.jpg",
    price: 15000,
    category: "Planters",
    brand: "AgriTech",
    specs: ["GPS Guided", "Auto Seed Spacing", "20ft Width"],
    inStock: true,
    featured: true
  },
  {
    id: 2,
    name: "High-Efficiency Combine",
    image: "/src/assets/combine-harvester-working-field.jpg",
    price: 80000,
    category: "Harvesters",
    brand: "HarvestPro",
    specs: ["500HP Engine", "40ft Header", "GPS Navigation"],
    inStock: true,
    featured: true
  },
  {
    id: 3,
    name: "Precision Irrigation System",
    image: "/src/assets/pivot.png",
    price: 25000,
    category: "Irrigation",
    brand: "WaterWise",
    specs: ["Center Pivot", "Smart Controls", "500m Radius"],
    inStock: true,
    featured: false
  },
  {
    id: 4,
    name: "Heavy Duty Tractor",
    image: "/src/assets/farmer-tractor.jpg",
    price: 45000,
    category: "Tractors",
    brand: "PowerFarm",
    specs: ["180HP", "4WD", "Climate Control"],
    inStock: true,
    featured: true
  }
];

const categories = ["All", "Tractors", "Harvesters", "Planters", "Irrigation"];

export default function Catalog() {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("All");
  const { addItem } = useQuote();

  const filteredProducts = products.filter(product => {
    const matchesSearch = product.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = selectedCategory === "All" || product.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const handleAddToCart = (product: typeof products[0]) => {
    addItem({
      id: product.id,
      name: product.name,
      price: product.price,
      quantity: 1,
      image: product.image,
      specs: product.specs
    });
    toast.success(`${product.name} added to cart!`);
  };

  return (
    <div className="min-h-screen bg-gradient-farm pt-24">
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-4xl font-bold text-foreground mb-8">Equipment Catalog</h1>
        
        {/* Filters */}
        <div className="bg-card/80 backdrop-blur-sm border border-border rounded-lg p-6 mb-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search equipment..."
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
                {categories.map(category => (
                  <SelectItem key={category} value={category}>
                    {category}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Product Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredProducts.map(product => (
            <Card key={product.id} className="overflow-hidden hover-glow group">
              <div className="relative overflow-hidden">
                <img
                  src={product.image}
                  alt={product.name}
                  className="w-full h-48 object-cover transition-transform duration-300 group-hover:scale-105"
                />
                {product.featured && (
                  <Badge className="absolute top-4 left-4 bg-secondary text-secondary-foreground">
                    Featured
                  </Badge>
                )}
              </div>
              <CardContent className="p-6">
                <h3 className="text-lg font-semibold text-card-foreground group-hover:text-primary transition-colors mb-2">
                  {product.name}
                </h3>
                <p className="text-sm text-muted-foreground mb-3">by {product.brand}</p>
                <div className="flex flex-wrap gap-1 mb-4">
                  {product.specs.slice(0, 2).map(spec => (
                    <Badge key={spec} variant="secondary" className="text-xs">
                      {spec}
                    </Badge>
                  ))}
                </div>
                <div className="text-2xl font-bold text-primary">
                  ${product.price.toLocaleString()}
                </div>
              </CardContent>
              <CardFooter className="p-6 pt-0">
                <Button
                  onClick={() => handleAddToCart(product)}
                  className="w-full bg-primary hover:bg-primary-hover group"
                >
                  <ShoppingCart className="h-4 w-4 mr-2" />
                  Add to Cart
                </Button>
              </CardFooter>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}