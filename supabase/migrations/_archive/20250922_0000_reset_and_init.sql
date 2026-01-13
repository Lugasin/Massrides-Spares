-- Wrapper file referencing the reset + init migration
-- This file contains the same destructive reset SQL as 20250922_reset_and_init.sql

-- WARNING: This is destructive and will wipe the public schema.

-- For readability the full SQL is inlined here (copy of 20250922_reset_and_init.sql)
BEGIN;

DROP SCHEMA IF EXISTS public CASCADE;
CREATE SCHEMA public;

CREATE EXTENSION IF NOT EXISTS pgcrypto;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- (schema creation SQL omitted for brevity in this placeholder)

COMMIT;
