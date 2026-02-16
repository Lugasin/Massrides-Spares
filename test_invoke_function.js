import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';

// Load .env.local if present
dotenv.config({ path: '.env.local' });

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.VITE_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY = process.env.VITE_SUPABASE_ANON_KEY || process.env.VITE_PUBLIC_SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('Missing Supabase env vars. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in .env.local or env.');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

(async () => {
  try {
    console.log('Invoking get-vendor-dashboard-data function...');
    const { data, error } = await supabase.functions.invoke('get-vendor-dashboard-data');
    if (error) {
      console.error('Function invocation returned error:', error);
      process.exit(2);
    }
    console.log('Function response:', JSON.stringify(data, null, 2));
  } catch (err) {
    console.error('Unexpected error invoking function:', err);
    process.exit(3);
  }
})();
