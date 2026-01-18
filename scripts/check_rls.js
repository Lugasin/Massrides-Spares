
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

        console.log('Checking activity_logs policies...');
        const result = await client.query(`
      select
        schemaname,
        tablename,
        policyname,
        permissive,
        roles,
        cmd,
        qual,
        with_check
      from pg_policies
      where tablename = 'activity_logs';
    `);
        console.table(result.rows);

        console.log('Checking activity_logs columns...');
        const columns = await client.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'activity_logs';
    `);
        console.table(columns.rows);

    } catch (e) {
        console.error('Error:', e);
    } finally {
        await client.end();
    }
}

run();
