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

// Import all images from assets that are used
import image8_8 from "@/assets/8-8.png";
import combineImage from "@/assets/Combine.jpg";
import droneSprayer from "@/assets/Dronesprayer.png";
import harvesterImage from "@/assets/Harverster.jpg";
import harvestersImage from "@/assets/Harversters.jpg.png";
import maizeSprinklers from "@/assets/Maizesprinklers.png";
import newTractor from "@/assets/Newtractor.png";
import newTractor1 from "@/assets/Newtractor1.png";
import newTractor10 from "@/assets/Newtractor10.png";
import newTractor11 from "@/assets/Newtractor11.png";
import newTractor2 from "@/assets/Newtractor2.png";
import newTractor3 from "@/assets/Newtractor3.png";
import newTractor4 from "@/assets/Newtractor4.png";
import newTractor5 from "@/assets/Newtractor5.png";
import newTractor6 from "@/assets/Newtractor6.png";
import newTractor7 from "@/assets/Newtractor7.png";
import newTractor8 from "@/assets/Newtractor8.png";
import newTractor9 from "@/assets/Newtractor9.png";
import newTractorFreight from "@/assets/Newtractorfreight.png";
import newTractors from "@/assets/Newtractors.png";
import newTractors1 from "@/assets/Newtractors1.jpg.png";
import pivot3 from "@/assets/Pivot3.png";
import ploughImage from "@/assets/Plough.png";
import ploughsImage from "@/assets/Ploughs.png";
import rotavatorImage from "@/assets/Rotavator-5-1.png";
// import screenshotImage from "@/assets/Screenshot 2025-07-29 131548.png"; // Removed unused import
import sprinklersImage from "@/assets/Sprinklers.png";
import sprinklers1Image from "@/assets/Sprinklers1.png";
import tractorPloughingImage from "@/assets/Tractorplouging.jpg.png";
import tractorPloughing1Image from "@/assets/Tractorplouging1.png";
import tractorsImage from "@/assets/Tractors.jpg";
import tractors1Image from "@/assets/Tractors1.jpg.png";
import tractorsDiscImage from "@/assets/Tractorsdisc.jpg";
import tractorsSprayingImage from "@/assets/Tractorsspraying.jpg.png";
import seederCloseUp from "@/assets/close-up-seeder-attached-tractor-field.jpg";
import combineHarvesterWorking from "@/assets/combine-harvester-working-field.jpg";
import cornFieldSunset from "@/assets/corn-field-sunset.jpg";
import discHarrow from "@/assets/disc-harrow-76-1696055574.png";
import discHarrow1 from "@/assets/disc-harrow-76-1711433455.png";
import discMounted from "@/assets/disc-mounted-47004.png";
import hydraulicHarrow from "@/assets/hydraulic-harrow-76-1608289508.png";
import largeRiceField from "@/assets/large-green-rice-field-with-green-rice-plants-rows.jpg";
import matTillage from "@/assets/mat-multi-application-tillage-unit-76-1673517805.png";
import matTillageWebp from "@/assets/mat-multi-application-tillage-unit-76-1673517805.webp";
import newRedSeeder from "@/assets/new-red-agricultural-seeder-close-up-view-background-combine.jpg";
import newTractorsImage from "@/assets/newTractors.jpg.png";
import pivotImage from "@/assets/pivot.png";
import pivot1Image from "@/assets/pivot1.png";
import pivot2Image from "@/assets/pivot2.png";
import pivotsImage from "@/assets/pivots.png";
import planterSeedingImage from "@/assets/planter-seeding.jpg";
import polyDiscHarrow from "@/assets/poly-disc-harrow-plough-76-1673336488..png";
import ripeWheatCutting from "@/assets/ripe-wheat-cutting-with-heavy-machinery-outdoors-generated-by-ai.jpg";
import seed1 from "@/assets/seed-1.png";
import tandemDiscHarrow from "@/assets/tandem-disc-harrow-heavy-series-76-1673002303.png";
import topViewTractors from "@/assets/top-view-tractors-doing-harvest-field.jpg";
import tractorWheel from "@/assets/tractor-wheel.jpg";
import tractorWorkingField from "@/assets/tractor-working-green-field.jpg";
import truckWorkingField from "@/assets/truck-working-field-sunny-day.jpg";
import irrigationAerial from "@/assets/irrigation-aerial.jpg";

const categories = [
  { id: "all", label: "All Equipment" },
  { id: "tractors", label: "Tractors" },
  { id: "planters", label: "Planters" },
  { id: "irrigation", label: "Irrigation" },
  { id: "harvesters", label: "Harvesters" },
  { id: "plows", label: "Plows" },
  { id: "harrows", label: "Harrows" },
  { id: "seeders", label: "Seeders" },
  { id: "sprayers", label: "Sprayers" },
];

const products = [
  {
    id: 1,
    name: "John Deere 6M Series Tractor",
    category: "tractors",
    price: "$85,000",
    originalPrice: "$95,000",
    image: tractorPloughingImage,
    rating: 4.8,
    reviews: 24,
    isNew: true,
    isFeatured: true,
    description: "Powerful and efficient tractor for medium to large farming operations.",
    specs: ["120 HP", "4WD", "PTO", "Hydraulic System"]
  },
  {
    id: 2,
    name: "Precision Seed Planter Pro",
    category: "planters",
    price: "$45,000",
    originalPrice: null,
    image: planterSeedingImage,
    rating: 4.9,
    reviews: 18,
    isNew: false,
    isFeatured: true,
    description: "Advanced precision planting technology for optimal seed placement.",
    specs: ["12 Row", "GPS Ready", "Variable Rate", "Fertilizer System"]
  },
  {
    id: 3,
    name: "Smart Pivot Irrigation System",
    category: "irrigation",
    price: "$125,000",
    originalPrice: "$140,000",
    image: irrigationAerial,
    rating: 4.7,
    reviews: 12,
    isNew: true,
    isFeatured: false,
    description: "Automated center pivot irrigation with smart water management.",
    specs: ["500m Radius", "GPS Control", "Weather Station", "Remote Monitoring"]
  },
  {
    id: 4,
    name: "Heavy Duty Combine Harvester",
    category: "harvesters",
    price: "$250,000",
    originalPrice: null,
    image: combineImage,
    rating: 4.9,
    reviews: 30,
    isNew: true,
    isFeatured: true,
    description: "High-capacity combine for efficient grain harvesting.",
    specs: ["30ft Header", "Large Grain Tank", "GPS Guidance"]
  },
  {
    id: 5,
    name: "Advanced Drone Sprayer",
    category: "sprayers",
    price: "$15,000",
    originalPrice: null,
    image: droneSprayer,
    rating: 4.5,
    reviews: 8,
    isNew: true,
    isFeatured: false,
    description: "Precise aerial spraying with advanced drone technology.",
    specs: ["10L Capacity", "GPS Waypoints", "Autonomous Flight"]
  },
  {
    id: 6,
    name: "Maize Sprinkler System",
    category: "irrigation",
    price: "$10,000",
    originalPrice: null,
    image: maizeSprinklers,
    rating: 4.0,
    reviews: 5,
    isNew: false,
    isFeatured: false,
    description: "Efficient sprinkler system designed for maize fields.",
    specs: ["Adjustable Range", "Durable Materials"]
  },
  {
    id: 7,
    name: "Compact New Tractor",
    category: "tractors",
    price: "$30,000",
    originalPrice: null,
    image: newTractor,
    rating: 4.2,
    reviews: 15,
    isNew: true,
    isFeatured: false,
    description: "Versatile compact tractor for small farms and various tasks.",
    specs: ["50 HP", "2WD", "PTO"]
  },
  {
    id: 8,
    name: "Modern Tractor 1",
    category: "tractors",
    price: "$75,000",
    originalPrice: null,
    image: newTractor1,
    rating: 4.7,
    reviews: 20,
    isNew: false,
    isFeatured: true,
    description: "Powerful and comfortable tractor with modern features.",
    specs: ["100 HP", "4WD", "Enclosed Cab"]
  },
    {
    id: 9,
    name: "Heavy Duty Plough",
    category: "plows",
    price: "$12,000",
    originalPrice: null,
    image: ploughImage,
    rating: 4.1,
    reviews: 9,
    isNew: true,
    isFeatured: false,
    description: "Robust plough for preparing soil in tough conditions.",
    specs: ["5 Bottom", "Durable Steel"]
  },
  {
    id: 10,
    name: "Disc Harrow for Soil Prep",
    category: "harrows",
    price: "$8,000",
    originalPrice: null,
    image: discHarrow,
    rating: 4.3,
    reviews: 11,
    isNew: false,
    isFeatured: false,
    description: "Efficient disc harrow for breaking up soil clumps.",
    specs: ["Offset Design", "Heavy Duty Discs"]
  },
    {
    id: 11,
    name: "Rotary Tiller",
    category: "plows",
    price: "$6,000",
    originalPrice: null,
    image: rotavatorImage,
    rating: 4.0,
    reviews: 7,
    isNew: true,
    isFeatured: false,
    description: "Ideal for preparing seed beds and managing weeds.",
    specs: ["Adjustable Depth", " PTO Driven"]
  },
    {
    id: 12,
    name: "Seed Drill Machine",
    category: "seeders",
    price: "$18,000",
    originalPrice: null,
    image: seed1,
    rating: 4.5,
    reviews: 14,
    isNew: false,
    isFeatured: true,
    description: "Precise seed placement for optimal crop growth.",
    specs: ["Multiple Hoppers", "Adjustable Row Spacing"]
  },
    {
    id: 13,
    name: "Tractor Sprayer",
    category: "sprayers",
    price: "$10,000",
    originalPrice: null,
    image: tractorsSprayingImage,
    rating: 4.4,
    reviews: 10,
    isNew: true,
    isFeatured: false,
    description: "Broad coverage sprayer for crop protection.",
    specs: ["Boom Sprayer", "Large Tank Capacity"]
  },
    {
    id: 14,
    name: "Farm Trailer",
    category: "other", // Assuming 'other' category for non-core equipment
    price: "$5,000",
    originalPrice: null,
    image: newTractorFreight,
    rating: 4.0,
    reviews: 6,
    isNew: false,
    isFeatured: false,
    description: "Durable farm trailer for transporting goods.",
    specs: ["Heavy Duty", "Various Sizes"]
  },
     {
    id: 15,
    name: "Cultivator Equipment",
    category: "plows",
    price: "$7,000",
    originalPrice: null,
    image: matTillage,
    rating: 4.2,
    reviews: 8,
    isNew: true,
    isFeatured: false,
    description: "Effective for soil aeration and weed control.",
    specs: ["Adjustable Tines", "PTO Driven"]
  }
];

export const ProductShowcase = () => {
  const [activeCategory, setActiveCategory] = useState("all");
  const [favorites, setFavorites] = useState<number[]>([]);

  const filteredProducts = products.filter(
    product => activeCategory === "all" || product.category === activeCategory
  );

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
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8 mb-12">
          {filteredProducts.map((product, index) => (
            <Card 
              key={product.id}
              className={cn(
                "group overflow-hidden hover:shadow-earth transition-all duration-300 hover-scale border-border/50",
                "animate-fade-in"
              )}
              style={{ animationDelay: `${index * 0.1}s` }}
            >
              <div className="relative overflow-hidden">
                <img
                  src={product.image}
                  alt={product.name}
                  className="w-full h-48 object-cover transition-transform duration-300 group-hover:scale-105"
                />
                
                {/* Badges */}
                <div className="absolute top-3 left-3 flex gap-2">
                  {product.isNew && (
                    <Badge className="bg-success text-success-foreground">
                      New
                    </Badge>
                  )}
                  {product.isFeatured && (
                    <Badge className="bg-primary text-primary-foreground">
                      Featured
                    </Badge>
                  )}
                </div>

                {/* Action Buttons */}
                <div className="absolute top-3 right-3 flex flex-col gap-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                  <Button
                    size="icon"
                    variant="secondary"
                    onClick={() => toggleFavorite(product.id)}
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
                  <Button
                    size="icon"
                    variant="secondary"
                    className="rounded-full bg-white/90 backdrop-blur-sm hover:bg-white"
                  >
                    <Eye className="h-4 w-4" />
                  </Button>
                </div>

                {/* Price Badge */}
                {product.originalPrice && (
                  <div className="absolute bottom-3 left-3">
                    <Badge variant="destructive" className="bg-destructive/90">
                      Save ${parseInt(product.originalPrice.replace(/[^0-9]/g, '')) - parseInt(product.price.replace(/[^0-9]/g, ''))}
                    </Badge>
                  </div>
                )}
              </div>

              <CardContent className="p-6">
                {/* Rating */}
                <div className="flex items-center gap-2 mb-3">
                  <div className="flex items-center">
                    {[...Array(5)].map((_, i) => (
                      <Star
                        key={i}
                        className={cn(
                          "h-4 w-4",
                          i < Math.floor(product.rating) 
                            ? "text-yellow-500 fill-current" 
                            : "text-gray-300"
                        )}
                      />
                    ))}
                  </div>
                  <span className="text-sm text-muted-foreground">
                    {product.rating} ({product.reviews} reviews)
                  </span>
                </div>

                {/* Product Info */}
                <h3 className="text-lg font-semibold mb-2 text-card-foreground group-hover:text-primary transition-colors">
                  {product.name}
                </h3>
                <p className="text-sm text-muted-foreground mb-4 line-clamp-2">
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
                  <span className="text-2xl font-bold text-primary">
                    {product.price}
                  </span>
                  {product.originalPrice && (
                    <span className="text-sm text-muted-foreground line-through">
                      {product.originalPrice}
                    </span>
                  )}
                </div>
              </CardContent>

              <CardFooter className="p-6 pt-0">
                <div className="flex gap-3 w-full">
                  <Button 
                    className="flex-1 bg-primary hover:bg-primary-hover group"
                  >
                    <ShoppingCart className="h-4 w-4 mr-2" />
                    Add to Cart
                  </Button>
                  <Button variant="outline" size="icon">
                    <Eye className="h-4 w-4" />
                  </Button>
                </div>
              </CardFooter>
            </Card>
          ))}
        </div>

        {/* View All CTA */}
        <div className="text-center">
          <Button 
            size="lg" 
            variant="outline"
            className="border-primary text-primary hover:bg-primary/10 group"
          >
            View All Equipment
            <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" />
          </Button>
        </div>
      </div>
    </section>
  );
};