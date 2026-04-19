-- Force PostgREST to reload its schema cache after permission changes
-- Without this, GRANTs applied via migration won't take effect until the next automatic reload

-- Re-apply GRANTs explicitly (belt and suspenders)
GRANT USAGE ON SCHEMA public TO anon, authenticated;

GRANT SELECT ON products TO anon, authenticated;
GRANT SELECT ON categories TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON carts TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE ON profiles TO authenticated;

-- Notify PostgREST to reload schema cache immediately
NOTIFY pgrst, 'reload schema';
NOTIFY pgrst, 'reload config';
