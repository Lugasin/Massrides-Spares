-- Enable RLS for all relevant tables
ALTER TABLE "public"."orders" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."spare_parts" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."user_profiles" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."activity_logs" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."user_carts" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."cart_items" ENABLE ROW LEVEL SECURITY;

-- Drop existing policies to avoid conflicts
DROP POLICY IF EXISTS "Allow all access to admins" ON "public"."orders";
DROP POLICY IF EXISTS "Allow customer access to their own orders" ON "public"."orders";
DROP POLICY IF EXISTS "Allow vendor access to orders with their parts" ON "public"."orders";
DROP POLICY IF EXISTS "Allow read access to all users" ON "public"."spare_parts";
DROP POLICY IF EXISTS "Allow vendors to manage their own parts" ON "public"."spare_parts";
DROP POLICY IF EXISTS "Allow admin to manage all parts" ON "public"."spare_parts";
DROP POLICY IF EXISTS "Allow users to view their own profile" ON "public"."user_profiles";
DROP POLICY IF EXISTS "Allow users to update their own profile" ON "public"."user_profiles";
DROP POLICY IF EXISTS "Allow admins to view all profiles" ON "public"."user_profiles";
DROP POLICY IF EXISTS "Allow users to see their own activity" ON "public"."activity_logs";
DROP POLICY IF EXISTS "Allow admins to see all activity" ON "public"."activity_logs";
DROP POLICY IF EXISTS "Allow users to manage their own cart" ON "public"."user_carts";
DROP POLICY IF EXISTS "Allow users to manage their own cart items" ON "public"."cart_items";

-- Policies for 'orders'
CREATE POLICY "Allow all access to admins" ON "public"."orders" FOR ALL TO authenticated USING (public.has_role('admin'));
CREATE POLICY "Allow customer access to their own orders" ON "public"."orders" FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Allow vendor access to orders with their parts" ON "public"."orders" FOR SELECT TO authenticated USING (
  EXISTS (
    SELECT 1 FROM "public"."order_items"
    JOIN "public"."spare_parts" ON "public"."order_items"."spare_part_id" = "public"."spare_parts"."id"
    WHERE "public"."order_items"."order_id" = "public"."orders"."id" AND "public"."spare_parts"."vendor_id" = (
      SELECT id FROM "public"."user_profiles" WHERE user_id = auth.uid()
    )
  )
);

-- Policies for 'spare_parts'
CREATE POLICY "Allow read access to all users" ON "public"."spare_parts" FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Allow vendors to manage their own parts" ON "public"."spare_parts" FOR ALL TO authenticated USING (
  (SELECT "public"."user_profiles"."id" FROM "public"."user_profiles" WHERE "public"."user_profiles"."user_id" = auth.uid()) = "public"."spare_parts"."vendor_id"
);
CREATE POLICY "Allow admin to manage all parts" ON "public"."spare_parts" FOR ALL TO authenticated USING (public.has_role('admin'));

-- Policies for 'user_profiles'
CREATE POLICY "Allow users to view their own profile" ON "public"."user_profiles" FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Allow users to update their own profile" ON "public"."user_profiles" FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Allow admins to view all profiles" ON "public"."user_profiles" FOR SELECT TO authenticated USING (public.has_role('admin'));

-- Policies for 'activity_logs'
CREATE POLICY "Allow users to see their own activity" ON "public"."activity_logs" FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Allow admins to see all activity" ON "public"."activity_logs" FOR SELECT TO authenticated USING (public.has_role('admin'));

-- Policies for 'user_carts' and 'cart_items'
CREATE POLICY "Allow users to manage their own cart" ON "public"."user_carts" FOR ALL TO authenticated USING (
  (SELECT id FROM user_profiles WHERE user_id = auth.uid()) = user_id
);
CREATE POLICY "Allow users to manage their own cart items" ON "public"."cart_items" FOR ALL TO authenticated USING (
  (SELECT id FROM user_carts WHERE user_id = (SELECT id FROM user_profiles WHERE user_id = auth.uid())) = cart_id
);
