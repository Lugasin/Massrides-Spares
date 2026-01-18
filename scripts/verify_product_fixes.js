
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

// Load env vars
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.VITE_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || process.env.VITE_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('Missing Supabase credentials in .env');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function verify() {
    console.log('Verifying product fixes...');

    // Check specific products that had missing images
    const productsToCheck = [
        'TIRE-FRONT-001',
        'STEER-WHEEL-001',
        'RE62418',
        'PLOW-SHARE-001',
        'RE234567'
    ];

    const { data: products, error } = await supabase
        .from('products')
        .select('title, part_number, image, in_stock')
        .in('part_number', productsToCheck);

    if (error) {
        console.error('Error fetching products:', error);
        return;
    }

    console.log('\n--- Image Fix Verification ---');
    products.forEach(p => {
        console.log(`[${p.part_number}] ${p.title}`);
        console.log(`  Image: ${p.image}`);
        console.log(`  In Stock: ${p.in_stock}`);
        console.log('---');
    });

    // Check "Tractor Battery" specifically for stock status as user reported it OUT OF STOCK
    const { data: battery } = await supabase
        .from('products')
        .select('title, part_number, in_stock')
        .eq('part_number', 'BATTERY-12V-100AH') // detailed in seed data
        .single();

    if (battery) {
        console.log('\n--- Battery Stock Check ---');
        console.log(`[${battery.part_number}] ${battery.title}: In Stock = ${battery.in_stock}`);
    }
}

verify();
