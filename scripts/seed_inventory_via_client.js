
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.VITE_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY || process.env.VITE_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('Missing Supabase credentials');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function seedInventory() {
    console.log('Seeding inventory...');

    // 1. Get all products
    const { data: products, error: pError } = await supabase
        .from('products')
        .select('id, vendor_id, title');

    if (pError) {
        console.error('Error fetching products:', pError);
        return;
    }

    console.log(`Found ${products.length} products.`);

    // 2. Get existing inventory to avoid duplicates
    const { data: inventory, error: iError } = await supabase
        .from('inventory')
        .select('product_id');

    if (iError) {
        console.error('Error fetching inventory:', iError);
        return;
    }

    const existingProductIds = new Set(inventory?.map(i => i.product_id));
    const productsToSeed = products.filter(p => !existingProductIds.has(p.id));

    console.log(`Products needing inventory: ${productsToSeed.length}`);

    if (productsToSeed.length === 0) {
        console.log('All products have inventory records. Done.');
        return;
    }

    // 3. Get a default vendor ID if needed
    let defaultVendorId = null;
    const { data: vendors } = await supabase.from('vendors').select('id').limit(1);
    if (vendors && vendors.length > 0) {
        defaultVendorId = vendors[0].id;
    }

    // 4. Insert records
    const newRecords = productsToSeed.map(p => ({
        product_id: p.id,
        vendor_id: p.vendor_id || defaultVendorId, // Use product's vendor or default
        quantity: 50,
        reserved: 0,
        threshold: 5,
        location: 'Warehouse A',
        last_restocked: new Date().toISOString()
    }));

    if (newRecords.length > 0) {
        const { error: insError } = await supabase
            .from('inventory')
            .insert(newRecords);

        if (insError) {
            console.error('Error inserting inventory:', insError);
        } else {
            console.log(`Successfully seeded ${newRecords.length} inventory records.`);
        }
    }
}

seedInventory();
