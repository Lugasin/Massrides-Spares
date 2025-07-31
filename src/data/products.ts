import tractorPlowing from "@/assets/tractor-plowing.jpg";
import planterSeeding from "@/assets/planter-seeding.jpg";
import heroCombine from "@/assets/hero-combine.jpg";
import irrigationAerial from "@/assets/irrigation-aerial.jpg";
import farmerTractor from "@/assets/farmer-tractor.jpg";
import tractorWheel from "@/assets/tractor-wheel.jpg";

export interface Product {
  id: number;
  name: string;
  price: number;
  image: string;
  specs: string[];
  category: string;
  description: string;
  inStock: boolean;
  featured: boolean;
}

export const products: Product[] = [
  {
    id: 1,
    name: "John Deere 6M Series Tractor",
    price: 85000,
    image: tractorPlowing,
    specs: ["120 HP", "4WD", "PTO", "Air Conditioning"],
    category: "Tractors",
    description: "Powerful and reliable tractor perfect for large-scale farming operations.",
    inStock: true,
    featured: true,
  },
  {
    id: 2,
    name: "Precision Seed Planter Pro",
    price: 45000,
    image: planterSeeding,
    specs: ["12 Row", "GPS Ready", "Variable Rate"],
    category: "Planters",
    description: "Advanced planting technology for optimal seed placement and crop yields.",
    inStock: true,
    featured: true,
  },
  {
    id: 3,
    name: "Case IH Combine Harvester",
    price: 320000,
    image: heroCombine,
    specs: ["300 HP", "10m Header", "GPS Guided"],
    category: "Harvesters",
    description: "High-capacity combine harvester for efficient grain harvesting.",
    inStock: true,
    featured: true,
  },
  {
    id: 4,
    name: "Center Pivot Irrigation System",
    price: 75000,
    image: irrigationAerial,
    specs: ["125 Acre Coverage", "Variable Rate", "Remote Control"],
    category: "Irrigation",
    description: "Efficient water management system for precision irrigation.",
    inStock: true,
    featured: false,
  },
  {
    id: 5,
    name: "Utility Farm Tractor",
    price: 55000,
    image: farmerTractor,
    specs: ["85 HP", "Hydrostatic", "Loader Ready"],
    category: "Tractors",
    description: "Versatile tractor ideal for medium-sized farming operations.",
    inStock: true,
    featured: false,
  },
  {
    id: 6,
    name: "Heavy Duty Tractor Wheels",
    price: 1200,
    image: tractorWheel,
    specs: ["R1W Tread", "710/70R42", "Radial"],
    category: "Parts",
    description: "Durable tractor wheels designed for maximum traction and longevity.",
    inStock: true,
    featured: false,
  },
];

export const categories = [
  "All",
  "Tractors", 
  "Planters",
  "Harvesters",
  "Irrigation",
  "Parts"
];