import tractorPlowing from "@/assets/tractor-plowing.jpg";
import planterSeeding from "@/assets/planter-seeding.jpg";
import heroCombine from "@/assets/hero-combine.jpg";
import irrigationAerial from "@/assets/irrigation-aerial.jpg";
import farmerTractor from "@/assets/farmer-tractor.jpg";
import tractorWheel from "@/assets/tractor-wheel.jpg";

export interface SparePart {
  id: number;
  name: string;
  price: number;
  image: string;
  specs: string[];
  category: string;
  description: string;
  inStock: boolean;
  featured: boolean;
  brand?: string;
  partNumber?: string; // Added part number for spare parts
  compatibility?: string[]; // Added compatibility info
  warranty?: string; // Added warranty info
}

export interface UsedSparePart extends SparePart {
  condition: string; // e.g., "New", "Used", "Refurbished"
  originalEquipment?: string; // What equipment it came from
}

export const spareParts: SparePart[] = [
  {
    id: 1,
    name: "John Deere Engine Oil Filter",
    price: 45,
    image: tractorPlowing,
    specs: ["OEM Quality", "High Filtration", "Long Life", "Easy Installation"],
    category: "Engine Parts",
    brand: "John Deere",
    partNumber: "RE504836",
    compatibility: ["6M Series", "7R Series", "8R Series"],
    warranty: "12 months",
    description: "Genuine John Deere engine oil filter for optimal engine protection and performance.",
    inStock: true,
    featured: true,
  },
  {
    id: 2,
    name: "Hydraulic Pump Assembly",
    price: 850,
    image: planterSeeding,
    specs: ["High Pressure", "Durable", "OEM Replacement", "2 Year Warranty"],
    category: "Hydraulic Parts",
    brand: "Parker",
    partNumber: "PGP511A0280",
    compatibility: ["Case IH", "New Holland", "John Deere"],
    warranty: "24 months",
    description: "High-performance hydraulic pump assembly for agricultural equipment.",
    inStock: true,
    featured: true,
  },
  {
    id: 3,
    name: "Alternator 12V 95A",
    price: 285,
    image: heroCombine,
    specs: ["12V Output", "95 Amp", "Heavy Duty", "Weather Resistant"],
    category: "Electrical Parts",
    brand: "Case IH",
    partNumber: "87540915",
    compatibility: ["Magnum Series", "Puma Series", "Farmall Series"],
    warranty: "18 months",
    description: "Heavy-duty alternator for Case IH tractors and combines.",
    inStock: true,
    featured: true,
  },
  {
    id: 4,
    name: "Radiator Assembly",
    price: 420,
    image: irrigationAerial,
    specs: ["Aluminum Core", "Plastic Tank", "OEM Fit", "Pressure Tested"],
    category: "Cooling System",
    brand: "Kubota",
    partNumber: "1C010-17114",
    compatibility: ["M Series", "L Series", "Grand L Series"],
    warranty: "12 months",
    description: "High-quality radiator assembly for Kubota tractors.",
    inStock: true,
    featured: false,
  },
  {
    id: 5,
    name: "Fuel Injection Pump",
    price: 1250,
    image: farmerTractor,
    specs: ["High Precision", "Rebuilt", "Tested", "Core Exchange"],
    category: "Fuel System",
    brand: "Massey Ferguson",
    partNumber: "3641832M91",
    compatibility: ["MF 6400", "MF 7400", "MF 8400"],
    warranty: "12 months",
    description: "Remanufactured fuel injection pump for Massey Ferguson tractors.",
    inStock: true,
    featured: false,
  },
  {
    id: 6,
    name: "Brake Pad Set",
    price: 95,
    image: tractorWheel,
    specs: ["Ceramic Compound", "Low Dust", "Quiet Operation", "Long Lasting"],
    category: "Brake Parts",
    brand: "Fendt",
    partNumber: "F916200060110",
    compatibility: ["Fendt 700", "Fendt 800", "Fendt 900"],
    warranty: "6 months",
    description: "High-performance brake pads for Fendt tractors.",
    inStock: true,
    featured: false,
  },
];

// Keep products as alias for backward compatibility
export const products = spareParts;
export type Product = SparePart;

export const categories = [
  "All",
  "Engine Parts",
  "Hydraulic Parts", 
  "Electrical Parts",
  "Cooling System",
  "Fuel System",
  "Brake Parts"
];

export const usedSparePartsData: UsedSparePart[] = [
  {
    id: 101,
    name: "Used Transmission Assembly",
    price: 2500,
    image: tractorPlowing,
    specs: ["Rebuilt", "Tested", "6 Month Warranty", "Core Required"],
    category: "Transmission Parts",
    brand: "John Deere",
    partNumber: "RE234567",
    compatibility: ["7R Series", "8R Series"],
    warranty: "6 months",
    description: "Remanufactured transmission assembly from John Deere 7R series.",
    inStock: true,
    featured: false,
    condition: "Refurbished",
    originalEquipment: "John Deere 7R 290",
  },
  {
    id: 102,
    name: "Used Hydraulic Cylinder",
    price: 450,
    image: heroCombine,
    specs: ["Resealed", "Pressure Tested", "90 Day Warranty"],
    category: "Hydraulic Parts",
    brand: "Case IH",
    partNumber: "87540123",
    compatibility: ["Magnum Series", "Puma Series"],
    warranty: "3 months",
    description: "Resealed hydraulic cylinder from Case IH Magnum tractor.",
    inStock: true,
    featured: false,
    condition: "Used",
    originalEquipment: "Case IH Magnum 340",
  },
];

// Keep backward compatibility
export const usedEquipmentData = usedSparePartsData;
export type UsedEquipment = UsedSparePart;