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
  brand?: string; // Added brand field for filtering
}

export interface UsedEquipment extends Product {
  year: number;
  hours_of_use: number;
  condition: string; // e.g., "Excellent", "Good", "Fair"
}

export const products: Product[] = [
  {
    id: 1,
    name: "John Deere 6M Series Tractor",
    price: 85000,
    image: tractorPlowing,
    specs: ["120 HP", "4WD", "PTO", "Air Conditioning"],
    category: "Tractors",
    brand: "John Deere",
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
    brand: "Precision",
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
    brand: "Case IH",
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
    brand: "Valley",
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
    brand: "Kubota",
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
    brand: "Goodyear",
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

export const usedEquipmentData: UsedEquipment[] = [
  {
    id: 101,
    name: "Used John Deere 7R Series Tractor",
    price: 150000,
    image: tractorPlowing, // Using existing image for now
    specs: ["210 HP", "MFWD", "IVT Transmission"],
    category: "Tractors",
    brand: "John Deere",
    description: "Well-maintained used tractor with low hours.",
    inStock: true,
    featured: false,
    year: 2018,
    hours_of_use: 1500,
    condition: "Excellent",
  },
  {
    id: 102,
    name: "Used Case IH Axial-Flow Combine",
    price: 250000,
    image: heroCombine, // Using existing image for now
    specs: ["350 HP", "12m Header"],
    category: "Harvesters",
    brand: "Case IH",
    description: "Used combine in good working condition.",
    inStock: true,
    featured: false,
    year: 2015,
    hours_of_use: 2500,
    condition: "Good",
  },
];