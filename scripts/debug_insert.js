
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.VITE_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_PUBLIC_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function debugInsert() {
    console.log('Testing insert...');

    // Try to insert a dummy record for product 1 (assuming it exists, or find one)
    const { data: products } = await supabase.from('products').select('id').limit(1);
    if (!products || products.length === 0) {
        console.log('No products.');
        return;
    }
    const pid = products[0].id; // This should be a number
    console.log('Product ID type:', typeof pid, 'Value:', pid);

    // hardcoded
    const payload = {
        product_id: pid, // integer
        vendor_id: null, // let's try null first
        quantity: 10,
        location: 'Debug'
    };

    const { data, error } = await supabase.from('inventory').insert([payload]).select();

    if (error) {
        console.error('Insert specific error:', error);
    } else {
        console.log('Insert success:', data);
    }
}

debugInsert();
