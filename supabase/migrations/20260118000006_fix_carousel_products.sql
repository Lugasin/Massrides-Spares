-- Migration to fix specific missing product images for Tires, Plows, and Steering
-- Uses SKUs provided by user to target specific products.

BEGIN;

-- 1. Front Tire (TIRE-FRONT-001)
-- Using existing asset tractor-wheel.jpg (we will copy it to public/products/tractor-wheel.jpg)
UPDATE products 
SET main_image = '/products/tractor-wheel.jpg' 
WHERE sku = 'TIRE-FRONT-001';

-- 2. Plow Share (PLOW-SHARE-001)
-- Using existing asset Plough.png (copy to public/products/Plough.png)
UPDATE products 
SET main_image = '/products/Plough.png' 
WHERE sku = 'PLOW-SHARE-001';

-- 3. Steering Wheel (STEER-WHEEL-001)
-- Using generated asset tractor_steering_wheel.png (copy to public/products/tractor_steering_wheel.png)
UPDATE products 
SET main_image = '/products/tractor_steering_wheel.png' 
WHERE sku = 'STEER-WHEEL-001';

-- 4. Ensure Categories Exist for Carousel CTAs
INSERT INTO categories (name, slug, is_active)
VALUES 
  ('Implements', 'implements', true),
  ('Wheels & Tires', 'wheels-and-tires', true),
  ('Steering Parts', 'steering-parts', true),
  ('Fuel System', 'fuel-system', true),
  ('Brake Parts', 'brake-parts', true),
  ('Cooling System', 'cooling-system', true),
  ('Transmission Parts', 'transmission-parts', true)
ON CONFLICT (slug) DO NOTHING;
-- Note: slug conflict might fail if names differ but slug is same. 
-- We assume slugs are consistent.

COMMIT;
