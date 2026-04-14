/**
 * Database Schema Comparison Utility
 * Run this script to compare online Supabase DB with local database.types.ts
 * 
 * Usage: npx tsx scripts/compare-db-schema.ts
 */

import { createClient } from '@supabase/supabase-js';
import type { Database } from '../src/integrations/supabase/database.types';

// Configuration - set these in environment variables
const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || '';
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

interface DbColumn {
  table_name: string;
  column_name: string;
  data_type: string;
  is_nullable: string;
  column_default: string | null;
}

interface SchemaDiff {
  missingInDb: string[];      // Columns in local types but not in DB
  extraInDb: string[];         // Columns in DB but not in local types
  typeMismatches: string[];   // Columns with different types
}

// Tables to check (from database.types.ts)
const TABLES_TO_CHECK = [
  'orders',
  'products', 
  'user_profiles',
  'payments',
  'activity_logs',
  'inventory',
  'cart_items',
  'categories',
  'quotes',
  'notifications'
];

// Local column definitions from database.types.ts (simplified mapping)
const LOCAL_SCHEMA: Record<string, string[]> = {
  orders: [
    'id', 'user_id', 'vendor_id', 'order_number', 'total_amount', 
    'status', 'payment_status', 'shipping_address', 'billing_address',
    'payout_id', 'payout_status', 'platform_fee', 'vendor_earning',
    'fraud_flag', 'created_at'
  ],
  products: [
    'id', 'vendor_id', 'name', 'description', 'price', 'currency',
    'stock_quantity', 'category_id', 'sku', 'main_image', 'media',
    'attributes', 'is_active', 'created_at'
  ],
  user_profiles: [
    'id', 'user_id', 'email', 'full_name', 'phone', 'address',
    'city', 'state', 'country', 'zip_code', 'avatar_url', 'role',
    'is_active', 'is_verified', 'company_name', 'website_url',
    'bio', 'created_at', 'updated_at'
  ],
  payments: [
    'id', 'order_id', 'provider', 'status', 'vesicash_payment_id',
    'vesicash_transaction_id', 'base_currency', 'quote_currency',
    'exchange_rate', 'amount_usd', 'amount_zmw', 'fx_rate_provider',
    'fx_rate_source', 'fx_rate_fetched_at', 'fx_rate_locked_at',
    'fx_rate_payload', 'created_at', 'completed_at'
  ],
  activity_logs: [
    'id', 'user_id', 'action', 'metadata', 'created_at'
  ],
  inventory: [
    'id', 'product_id', 'vendor_id', 'quantity', 'reserved',
    'threshold', 'location', 'last_restocked', 'created_at'
  ],
  cart_items: [
    'id', 'user_id', 'cart_id', 'product_id', 'quantity', 'added_at'
  ],
  categories: [
    'id', 'name', 'description', 'parent_id', 'slug', 'is_active',
    'sort_order', 'created_at'
  ],
  quotes: [
    'id', 'user_id', 'vendor_id', 'client_id', 'quote_number',
    'total_amount', 'status', 'valid_until', 'notes',
    'created_at', 'updated_at'
  ],
  notifications: [
    'id', 'user_id', 'title', 'message', 'type', 'link',
    'read', 'created_at'
  ]
};

async function fetchDbColumns(supabase: any, table: string): Promise<DbColumn[]> {
  const { data, error } = await supabase
    .from('information_schema.columns')
    .select('column_name, data_type, is_nullable, column_default')
    .eq('table_schema', 'public')
    .eq('table_name', table)
    .order('ordinal_position');

  if (error) {
    console.error(`Error fetching columns for ${table}:`, error);
    return [];
  }

  return (data || []).map((col: any) => ({
    table_name: table,
    column_name: col.column_name,
    data_type: col.data_type,
    is_nullable: col.is_nullable,
    column_default: col.column_default
  }));
}

async function compareSchema() {
  if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
    console.error('Missing environment variables. Set VITE_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY');
    process.exit(1);
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

  console.log('🔍 Comparing database schema...\n');
  console.log(`URL: ${SUPABASE_URL}`);
  console.log(`Tables to check: ${TABLES_TO_CHECK.length}\n`);

  const results: Record<string, SchemaDiff> = {};

  for (const table of TABLES_TO_CHECK) {
    console.log(`Checking ${table}...`);
    
    const dbColumns = await fetchDbColumns(supabase, table);
    const dbColumnNames = new Set(dbColumns.map(c => c.column_name.toLowerCase()));
    const localColumns = LOCAL_SCHEMA[table] || [];
    const localColumnSet = new Set(localColumns.map(c => c.toLowerCase()));

    const missingInDb = localColumns.filter(c => !dbColumnNames.has(c.toLowerCase()));
    const extraInDb = dbColumns
      .map(c => c.column_name)
      .filter(c => !localColumnSet.has(c.toLowerCase()));

    results[table] = {
      missingInDb,
      extraInDb,
      typeMismatches: [] // Would need more detailed type comparison
    };

    if (missingInDb.length > 0 || extraInDb.length > 0) {
      console.log(`  ⚠️  Missing in DB: ${missingInDb.join(', ') || 'none'}`);
      console.log(`  ⚠️  Extra in DB: ${extraInDb.join(', ') || 'none'}`);
    } else {
      console.log(`  ✅ Schema matches`);
    }
  }

  // Summary
  console.log('\n📊 Summary');
  console.log('==========');
  
  const tablesWithIssues = Object.entries(results)
    .filter(([_, diff]) => diff.missingInDb.length > 0 || diff.extraInDb.length > 0);

  if (tablesWithIssues.length === 0) {
    console.log('✅ All tables match!');
  } else {
    console.log(`⚠️  ${tablesWithIssues.length} tables have schema differences:`);
    tablesWithIssues.forEach(([table, diff]) => {
      console.log(`\n${table}:`);
      if (diff.missingInDb.length > 0) {
        console.log(`  - Missing in DB: ${diff.missingInDb.join(', ')}`);
      }
      if (diff.extraInDb.length > 0) {
        console.log(`  - Extra in DB: ${diff.extraInDb.join(', ')}`);
      }
    });
  }

  return results;
}

// Run comparison
compareSchema().catch(console.error);