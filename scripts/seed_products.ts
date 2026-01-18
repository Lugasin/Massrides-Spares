import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

// Try loading .env and .env.local
dotenv.config({ path: path.resolve(process.cwd(), '.env') });
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

// Initialize Supabase client
const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || 'https://ocfljbhgssymtbjsunfr.supabase.co';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_SERVICE_ROLE_KEY; 


if (!supabaseServiceKey) {
  console.error("Error: SUPABASE_SERVICE_ROLE_KEY is required in .env");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

const products = [
  {
    name: "John Deere Engine Oil Filter",
    price: 45.99,
    description: "Genuine John Deere engine oil filter for optimal engine protection and performance.",
    category: "Engine Parts",
    brand: "John Deere",
    part_number: "RE504836", // DB uses snake_case usually, need to check schema
    specs: ["OEM Quality", "High Filtration", "Long Life"],
    warranty: "12 months",
    image: "/assets/products/engine_oil_filter.png", // Storing relative path for PWA
    in_stock: true,
    featured: true
  },
  {
    name: "John Deere Air Filter Element",
    price: 89.50,
    description: "Primary air filter element for John Deere tractors.",
    category: "Engine Parts",
    brand: "John Deere",
    part_number: "AR103033",
    specs: ["High Efficiency", "Dust Holding Capacity"],
    warranty: "12 months",
    image: "/assets/products/air_filter_combine.png", // Reusing combine filter image or generic
    in_stock: true,
    featured: false
  },
  {
    name: "Fuel Filter Water Separator",
    price: 125.00,
    description: "Fuel filter with water separator for diesel engines.",
    category: "Engine Parts",
    brand: "John Deere",
    part_number: "RE62418",
    specs: ["Water Separation", "Micron Rating"],
    warranty: "12 months",
    image: "/assets/products/fuel_injection_pump.png", // Placeholder/Related
    in_stock: true,
    featured: false
  },
  {
    name: "Hydraulic Pump Assembly",
    price: 850.00,
    description: "High-performance hydraulic pump assembly.",
    category: "Hydraulic Parts",
    brand: "Parker",
    part_number: "PGP511A0280",
    specs: ["High Precision", "Durable"],
    warranty: "24 months",
    image: "/assets/products/hydraulic_pump.png",
    in_stock: true,
    featured: true
  },
  {
    name: "Alternator 12V 95A",
    price: 285.00,
    description: "Heavy-duty alternator for Case IH tractors.",
    category: "Electrical Parts",
    brand: "Case IH",
    part_number: "87540915",
    specs: ["12V", "95 Amp"],
    warranty: "18 months",
    image: "/assets/products/tractor_alternator.png",
    in_stock: true,
    featured: true
  },
  {
    name: "Transmission Filter Kit",
    price: 125.00,
    description: "Complete transmission filter kit including gaskets and seals.",
    category: "Transmission Parts",
    brand: "John Deere",
    part_number: "RE234567",
    specs: ["Kit", "Seals Included"],
    warranty: "12 months",
    image: "/assets/products/transmission_assembly.png", 
    in_stock: true,
    featured: false
  },
  {
    name: "Radiator Assembly",
    price: 420.00,
    description: "High-quality radiator assembly for Kubota tractors.",
    category: "Cooling System",
    brand: "Kubota",
    part_number: "1C010-17114",
    specs: ["Aluminum Core", "OEM Fit"],
    warranty: "12 months",
    image: "/assets/products/radiator_assembly.png",
    in_stock: true,
    featured: false
  },
  {
    name: "Fuel Injection Pump",
    price: 1250.00,
    description: "Remanufactured fuel injection pump for Massey Ferguson tractors.",
    category: "Fuel System",
    brand: "Massey Ferguson",
    part_number: "3641832M91",
    specs: ["Remanufactured", "Tested"],
    warranty: "12 months",
    image: "/assets/products/fuel_injection_pump.png",
    in_stock: true,
    featured: false
  },
  {
    name: "Brake Pad Set",
    price: 95.00,
    description: "High-performance brake pads.",
    category: "Brake Parts",
    brand: "Fendt",
    part_number: "F916200060110",
    specs: ["Semi-Metallic", "Low Dust"],
    warranty: "6 months",
    image: "/assets/products/brake_pad_set.png",
    in_stock: true,
    featured: false
  },
  {
    name: "Steering Wheel Assembly",
    price: 145.00,
    description: "Complete steering wheel assembly with horn button.",
    category: "Steering Parts",
    brand: "Universal",
    part_number: "STEER-WHEEL-001",
    specs: ["Universal Fit", "Comfort Grip"],
    warranty: "12 months",
    image: "/assets/products/pto_shaft.png", // Using generic component image
    in_stock: true,
    featured: false
  },
  {
    name: "Operator Seat with Suspension",
    price: 650.00,
    description: "Comfortable operator seat with air suspension.",
    category: "Cabin Parts",
    brand: "Grammer",
    part_number: "SEAT-SUSP-001",
    specs: ["Air Suspension", "Armrests"],
    warranty: "24 months",
    image: "/assets/products/tractor_seat.png",
    in_stock: true,
    featured: true
  },
  {
    name: "Plow Share 16\"",
    price: 85.00,
    description: "Heavy-duty plow share for 16-inch plows.",
    category: "Implements",
    brand: "Generic",
    part_number: "PLOW-SHARE-001",
    specs: ["Hardened Steel", "16 Inch"],
    warranty: "6 months",
    image: "/assets/products/hydraulic_cylinder.png", // Using similar heavy metal part
    in_stock: true,
    featured: false
  },
  {
    name: "Front Tire 12.4-24",
    price: 285.00,
    description: "Front tractor tire with R-1 tread pattern.",
    category: "Wheels & Tires",
    brand: "Firestone",
    part_number: "TIRE-FRONT-001",
    specs: ["R-1 Tread", "Bias Ply"],
    warranty: "12 months",
    image: "/assets/products/tractor_wheel.jpg", // Assuming existing
    in_stock: true,
    featured: false
  }
];

async function seed() {
  console.log('Seeding products...');
  
  for (const product of products) {
    // Check if exists by part number or name
    const { data: existing } = await supabase
      .from('products')
      .select('id')
      .or(`part_number.eq.${product.part_number},name.eq.${product.name}`)
      .maybeSingle();

    if (existing) {
      console.log(`Updating ${product.name}...`);
      await supabase
        .from('products')
        .update({
          price: product.price,
          description: product.description,
          category: product.category,
          brand: product.brand,
          specs: product.specs,
          main_image: product.image, // Ensure column name is 'main_image' or 'image'
          in_stock: product.in_stock,
          is_featured: product.featured, // Ensure column is 'is_featured' or 'featured'
          attributes: { warranty: product.warranty } // Store extra fields in JSONB if needed
        })
        .eq('id', existing.id);
    } else {
      console.log(`Inserting ${product.name}...`);
      const { error } = await supabase
        .from('products')
        .insert({
          name: product.name, // or 'title'
          title: product.name, // Try both if unsure
          price: product.price,
          description: product.description,
          category: product.category,
          brand: product.brand,
          part_number: product.part_number, // or 'sku'
          sku: product.part_number,
          specs: product.specs,
          main_image: product.image,
          image: product.image,
          in_stock: product.in_stock,
          is_featured: product.featured,
          attributes: { warranty: product.warranty }
        });
        
      if (error) {
         // Fallback if columns differ (e.g. title vs name)
         console.warn(`Error inserting ${product.name}, checking schema mismatch:`, error.message);
      }
    }
  }
  console.log('Seeding complete.');
}

seed().catch(console.error);
