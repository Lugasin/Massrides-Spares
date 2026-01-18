-- Fix 42501 Permission Denied on Wishlists
BEGIN;
    -- Explicitly grant permissions to authenticated users
    GRANT ALL ON TABLE wishlists TO authenticated;
    GRANT ALL ON TABLE wishlists TO service_role;

    -- Also ensure sequence permission if needed (usually handled by table ownership but good to be safe)
    GRANT USAGE, SELECT ON SEQUENCE wishlists_id_seq TO authenticated;
    GRANT USAGE, SELECT ON SEQUENCE wishlists_id_seq TO service_role;
COMMIT;
