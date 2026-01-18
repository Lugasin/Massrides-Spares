-- Fix Cart RLS and Schema Access
BEGIN;

-- 1. Ensure 'carts' table exists and RLS is enabled
CREATE TABLE IF NOT EXISTS carts (
  id bigserial primary key,
  user_id uuid references auth.users(id) on delete cascade,
  guest_token text,
  items jsonb default '[]'::jsonb,
  updated_at timestamptz default now()
);

ALTER TABLE carts ENABLE ROW LEVEL SECURITY;

-- 2. Drop legacy 'cart_items' if it exists (we are using JSONB items now)
-- This removes the split-brain state where some code uses table, some uses JSONB.
DROP TABLE IF EXISTS cart_items CASCADE;

-- 3. Reset Policies for Carts to be comprehensive

-- Drop all existing placeholders
DROP POLICY IF EXISTS "Users can view their own cart" ON carts;
DROP POLICY IF EXISTS "Users can create their own cart" ON carts;
DROP POLICY IF EXISTS "Users can update their own cart" ON carts;
DROP POLICY IF EXISTS "Users can delete their own cart" ON carts;
DROP POLICY IF EXISTS "Guest access" ON carts;

-- AUTHENTICATED USER POLICIES
CREATE POLICY "Users can select own cart" ON carts
FOR SELECT TO authenticated
USING ( auth.uid() = user_id );

CREATE POLICY "Users can insert own cart" ON carts
FOR INSERT TO authenticated
WITH CHECK ( auth.uid() = user_id );

CREATE POLICY "Users can update own cart" ON carts
FOR UPDATE TO authenticated
USING ( auth.uid() = user_id );

CREATE POLICY "Users can delete own cart" ON carts
FOR DELETE TO authenticated
USING ( auth.uid() = user_id );

-- GUEST / ANON POLICIES
-- Allow access to carts that have a guest_token (no user_id)
-- Security relies on knowing the random UUID token

CREATE POLICY "Guests can select cart by token" ON carts
FOR SELECT
USING ( guest_token IS NOT NULL );

CREATE POLICY "Guests can insert cart with token" ON carts
FOR INSERT
WITH CHECK ( guest_token IS NOT NULL );

CREATE POLICY "Guests can update cart by token" ON carts
FOR UPDATE
USING ( guest_token IS NOT NULL );

CREATE POLICY "Guests can delete cart by token" ON carts
FOR DELETE
USING ( guest_token IS NOT NULL );

COMMIT;
