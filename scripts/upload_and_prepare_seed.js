#!/usr/bin/env node
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';

dotenv.config({ path: '.env.local' });

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.VITE_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY = process.env.VITE_SUPABASE_ANON_KEY || process.env.VITE_PUBLIC_SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('Missing Supabase env vars. Create .env.local with VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

const IMAGES_DIR = path.join(process.cwd(), 'public', 'assets', 'products');
const BUCKET = 'product-images';

function listFiles(dir) {
  return fs.readdirSync(dir).filter(f => !f.startsWith('.'));
}

async function uploadFile(filePath, destName) {
  const file = fs.readFileSync(filePath);
  const { data, error } = await supabase.storage.from(BUCKET).upload(destName, file, { cacheControl: '3600', upsert: true });
  if (error) return { error };
  const { data: urlData } = supabase.storage.from(BUCKET).getPublicUrl(destName);
  return { publicUrl: urlData?.publicUrl };
}

async function main() {
  if (!fs.existsSync(IMAGES_DIR)) {
    console.error('Images directory not found:', IMAGES_DIR);
    process.exit(1);
  }

  const files = listFiles(IMAGES_DIR);
  console.log(`Found ${files.length} image files in ${IMAGES_DIR}`);

  const uploads = [];
  for (const f of files) {
    const src = path.join(IMAGES_DIR, f);
    const dest = `products/${f}`;
    console.log('Uploading', f, '->', dest);
    try {
      const res = await uploadFile(src, dest);
      if (res.error) {
        console.error('Upload error for', f, res.error.message || res.error);
        uploads.push({ file: f, error: res.error });
        continue;
      }
      console.log('Uploaded:', res.publicUrl);
      uploads.push({ file: f, publicUrl: res.publicUrl });
    } catch (err) {
      console.error('Unexpected upload error for', f, err);
      uploads.push({ file: f, error: err });
    }
  }

  const outJson = path.join(process.cwd(), 'supabase', 'seed_image_map.json');
  fs.writeFileSync(outJson, JSON.stringify(uploads, null, 2));
  console.log('Wrote image map to', outJson);

  // Prepare SQL inserts referencing the public URLs for manual review/run
  const seedSqlPath = path.join(process.cwd(), 'supabase', 'seed_with_storage_urls.sql');
  const sqlParts = [];
  sqlParts.push('-- Generated seed SQL referencing uploaded product images (manual review recommended)');

  // Example inserts based on existing seed patterns
  const exampleProducts = [
    { sku: 'RE504836', title: 'John Deere Engine Oil Filter', price: 45.99, currency: 'USD', file: 'engine_oil_filter.png', category: 'engine-parts' },
    { sku: 'AR103033', title: 'John Deere Air Filter Element', price: 89.50, currency: 'USD', file: 'air_filter_combine.png', category: 'engine-parts' },
    { sku: 'RE62418', title: 'Fuel Filter Water Separator', price: 125.00, currency: 'USD', file: 'fuel_filter_water_separator.png', category: 'engine-parts' },
    { sku: 'PGP511A0280', title: 'Hydraulic Pump Assembly', price: 850.00, currency: 'USD', file: 'hydraulic_pump.png', category: 'hydraulic-parts' },
    { sku: '87540915', title: 'Alternator 12V 95A', price: 285.00, currency: 'USD', file: 'tractor_alternator.png', category: 'electrical-parts' }
  ];

  for (const p of exampleProducts) {
    const mapEntry = uploads.find(u => u.file === p.file);
    const imgUrl = mapEntry?.publicUrl || '/assets/' + p.file;
    sqlParts.push(`-- ${p.title}`);
    sqlParts.push(`INSERT INTO products (vendor_id, sku, title, description, price, currency, active, category_id, attributes, main_image)`);
    sqlParts.push(`SELECT v.id, '${p.sku}', '${p.title.replace("'","''")}', '${(p.title + " - seeded").replace("'","''")}', ${p.price}, '${p.currency}', true, c.id, '{"brand":"${p.title.split(' ')[0]}"}'::jsonb, '${imgUrl}'`);
    sqlParts.push(`FROM vendors v, categories c WHERE v.slug = 'massrides-system' AND c.slug = '${p.category}';`);
    sqlParts.push('');
  }

  fs.writeFileSync(seedSqlPath, sqlParts.join('\n'));
  console.log('Wrote seed SQL to', seedSqlPath);

  console.log('Done. Review supabase/seed_with_storage_urls.sql before running in Supabase SQL editor.\nIf you want, I can attempt to run inserts using the Supabase client, but that may be blocked by RLS or permissions.');
}

main().catch(err => { console.error('Fatal error:', err); process.exit(1); });
