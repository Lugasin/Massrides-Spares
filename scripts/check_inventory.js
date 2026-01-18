
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.VITE_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || process.env.VITE_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('Missing Supabase credentials');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkInventory() {
    console.log('Checking inventory levels...');

    // Get products first
    const { data: products, error: pError } = await supabase
        .from('products')
        .select('id, title, part_number, in_stock');

    if (pError) {
        console.error('Error fetching products:', pError);
        return;
    }

    if (!products || products.length === 0) {
        console.log('No products found.');
        return;
    }

    // Get inventory for these products
    const productIds = products.map(p => p.id);
    const { data: inventory, error: iError } = await supabase
        .from('inventory')
        .select('*')
        .in('product_id', productIds);

    if (iError) {
        console.error('Error fetching inventory:', iError);
        return;
    }

    console.log(`Found ${products.length} products and ${inventory?.length || 0} inventory records.`);

    // specific check for the fixed items
    const fixedParts = ['TIRE-FRONT-001', 'STEER-WHEEL-001', 'RE62418', 'PLOW-SHARE-001', 'RE234567'];

    console.log('\n--- Inventory Status for Fixed Parts ---');
    fixedParts.forEach(partNum => {
        const prod = products.find(p => p.part_number === partNum);
        if (prod) {
            const inv = inventory?.find(i => i.product_id === prod.id);
            console.log(`[${partNum}] ${prod.title}`);
            console.log(`  Product ID: ${prod.id}`);
            console.log(`  In Stock (Bool): ${prod.in_stock}`);
            console.log(`  Inventory Qty: ${inv ? inv.quantity : 'NO RECORD'}`);
            console.log('---');
        } else {
            console.log(`[${partNum}] NOT FOUND IN DB`);
        }
    });
}

checkInventory();
