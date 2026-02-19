import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

// Load environment variables from .env.local
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase environment variables');
  console.error('VITE_SUPABASE_URL:', supabaseUrl);
  console.error('VITE_SUPABASE_ANON_KEY:', supabaseKey ? '***' : 'undefined');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function upgradeUserToVendor() {
  try {
    console.log('Upgrading mambwemwila1@gmail.com to vendor role...');

    const { data, error } = await supabase
      .from('user_profiles')
      .update({
        role: 'vendor',
        is_verified: true
      })
      .eq('email', 'mambwemwila1@gmail.com')
      .select();

    if (error) {
      console.error('Error updating user role:', error);
      return;
    }

    if (data && data.length > 0) {
      console.log('✅ User role updated successfully!');
      console.log('User details:', data[0]);
    } else {
      console.log('⚠️  No user found with email mambwemwila1@gmail.com');
    }
  } catch (err) {
    console.error('Unexpected error:', err);
  }
}

upgradeUserToVendor();