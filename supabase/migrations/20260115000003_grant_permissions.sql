-- Restore permissions for Service Role on Public Schema
-- These are often lost when 'public' schema is dropped and recreated manually.

GRANT USAGE ON SCHEMA public TO service_role;
GRANT ALL ON ALL TABLES IN SCHEMA public TO service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO service_role;
GRANT ALL ON ALL ROUTINES IN SCHEMA public TO service_role;

-- Ensure authenticated and anon can usage schema
GRANT USAGE ON SCHEMA public TO anon, authenticated;

-- Grant standard table access (RLS will restrict rows)
GRANT ALL ON ALL TABLES IN SCHEMA public TO postgres;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO postgres;
GRANT ALL ON ALL ROUTINES IN SCHEMA public TO postgres;
