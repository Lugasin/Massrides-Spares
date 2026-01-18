import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const products = [
  {
    part_number: "RE504836",
    name: "John Deere Engine Oil Filter",
    image: "/assets/products/engine_oil_filter.png",
    in_stock: true
  },
  {
    part_number: "AR103033",
    name: "John Deere Air Filter Element",
    image: "/assets/products/air_filter_combine.png",
    in_stock: true
  },
  {
    part_number: "RE62418",
    name: "Fuel Filter Water Separator",
    image: "/assets/products/fuel_injection_pump.png", 
    in_stock: true
  },
  {
    part_number: "PGP511A0280",
    name: "Hydraulic Pump Assembly",
    image: "/assets/products/hydraulic_pump.png",
    in_stock: true
  },
  {
    part_number: "87540915",
    name: "Alternator 12V 95A",
    image: "/assets/products/tractor_alternator.png",
    in_stock: true
  },
  {
    part_number: "RE234567",
    name: "Transmission Filter Kit",
    image: "/assets/products/transmission_assembly.png", 
    in_stock: true
  },
  {
    part_number: "1C010-17114",
    name: "Radiator Assembly",
    image: "/assets/products/radiator_assembly.png",
    in_stock: true
  },
  {
    part_number: "3641832M91",
    name: "Fuel Injection Pump",
    image: "/assets/products/fuel_injection_pump.png",
    in_stock: true
  },
  {
    part_number: "F916200060110",
    name: "Brake Pad Set",
    image: "/assets/products/brake_pad_set.png",
    in_stock: true
  },
  {
    part_number: "STEER-WHEEL-001",
    name: "Steering Wheel Assembly",
    image: "/assets/products/pto_shaft.png",
    in_stock: true
  },
  {
    part_number: "SEAT-SUSP-001",
    name: "Operator Seat with Suspension",
    image: "/assets/products/tractor_seat.png",
    in_stock: true
  },
  {
    part_number: "PLOW-SHARE-001",
    name: "Plow Share 16\"",
    image: "/assets/products/hydraulic_cylinder.png", 
    in_stock: true
  },
  {
    part_number: "TIRE-FRONT-001",
    name: "Front Tire 12.4-24",
    image: "/assets/products/tractor_wheel.jpg", 
    in_stock: true
  }
];

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const results = [];
    for (const p of products) {
      // Update by part_number OR name
      const { data, error } = await supabaseClient
        .from('products')
        .update({ 
          main_image: p.image, 
          image: p.image,
          in_stock: p.in_stock 
        })
        .or(`part_number.eq.${p.part_number},name.eq.${p.name}`)
        .select();
        
      if (error) {
        console.error(`Error updating ${p.name}:`, error);
        results.push({ name: p.name, status: 'error', error: error.message });
      } else if (!data || data.length === 0) {
        // If not found, try to insert? The user said "already in db", but maybe safer to upsert.
        // Let's try inserting if update failed to match.
        console.log(`Product ${p.name} not found for update, attempting insert...`);
         const { error: insertError } = await supabaseClient
            .from('products')
            .insert({
                name: p.name,
                title: p.name,
                part_number: p.part_number,
                sku: p.part_number,
                main_image: p.image,
                image: p.image,
                in_stock: p.in_stock,
                price: 0, // Fallback
                description: "Auto-seeded",
                category: "Uncategorized"
            });
            
          if (insertError) {
             results.push({ name: p.name, status: 'not_found_and_insert_failed', error: insertError.message });
          } else {
             results.push({ name: p.name, status: 'inserted' });
          }
      } else {
        results.push({ name: p.name, status: 'updated' });
      }
    }

    return new Response(
      JSON.stringify(results),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 },
    );
  }
});
