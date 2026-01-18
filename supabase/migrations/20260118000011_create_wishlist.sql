-- Create Wishlist Table and RLS
BEGIN;

CREATE TABLE IF NOT EXISTS wishlists (
  id bigserial primary key,
  user_id uuid references auth.users(id) on delete cascade,
  product_id bigint references products(id) on delete cascade,
  created_at timestamptz default now(),
  UNIQUE(user_id, product_id)
);

ALTER TABLE wishlists ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own wishlist" ON wishlists
FOR ALL TO authenticated
USING ( auth.uid() = user_id )
WITH CHECK ( auth.uid() = user_id );

COMMIT;
