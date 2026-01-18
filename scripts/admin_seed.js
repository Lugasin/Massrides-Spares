
import pg from 'pg';
const { Client } = pg;

const connectionString = 'postgres://postgres:Busty.07enterprise@db.ocfljbhgssymtbjsunfr.supabase.co:5432/postgres';

const client = new Client({
    connectionString,
    ssl: { rejectUnauthorized: false }
});

async function run() {
    try {
        await client.connect();
        console.log('Connected to DB');

        // 1. Add RLS Policies for Inventory
        console.log('Applying RLS policies...');
        await client.query(`
      ALTER TABLE inventory ENABLE ROW LEVEL SECURITY;

      -- Allow read to authenticated
      DROP POLICY IF EXISTS "inventory_read_all" ON inventory;
      CREATE POLICY "inventory_read_all" ON inventory FOR SELECT TO authenticated USING (true);
      
      -- Allow insert to authenticated (for seeding/vendors)
      DROP POLICY IF EXISTS "inventory_insert_auth" ON inventory;
      CREATE POLICY "inventory_insert_auth" ON inventory FOR INSERT TO authenticated WITH CHECK (true);

       -- Allow update to authenticated (for vendors)
      DROP POLICY IF EXISTS "inventory_update_auth" ON inventory;
      CREATE POLICY "inventory_update_auth" ON inventory FOR UPDATE TO authenticated USING (true);
    `);

        // 2. Seed Data
        console.log('Seeding Inventory...');
        await client.query(`
    DO $$
    DECLARE
      prod RECORD;
      v_id BIGINT;
    BEGIN
      FOR prod IN SELECT * FROM products WHERE id NOT IN (SELECT product_id FROM inventory) LOOP
        v_id := prod.vendor_id;
        IF v_id IS NULL THEN
            SELECT id INTO v_id FROM vendors LIMIT 1;
        END IF;

        IF v_id IS NOT NULL THEN
            INSERT INTO inventory (product_id, vendor_id, quantity, reserved, threshold, location, last_restocked)
            VALUES (prod.id, v_id, 50, 0, 5, 'Warehouse A', NOW());
        ELSE
             -- Just insert with null vendor if needed, but schema might complain if we didn't check. 
             -- assuming vendor_id IS nullable or we skip.
             INSERT INTO inventory (product_id, vendor_id, quantity, reserved, threshold, location, last_restocked)
             VALUES (prod.id, NULL, 50, 0, 5, 'Warehouse A', NOW());
        END IF;
      END LOOP;
    END $$;
    `);

        console.log('Done!');
    } catch (e) {
        console.error('Error:', e);
    } finally {
        await client.end();
    }
}

run();
