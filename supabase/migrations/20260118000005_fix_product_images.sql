-- Migration to fix product images
-- Updates main_image column to point to the new static files in /public/products/

BEGIN;

-- 1. Engine Oil Filter
UPDATE products 
SET main_image = '/products/engine_oil_filter.png' 
WHERE title ILIKE '%Filter%' OR sku = 'RE504836';

-- 2. Hydraulic Pump
UPDATE products 
SET main_image = '/products/hydraulic_pump.png' 
WHERE title ILIKE '%Generic Hydraulic Pump%' OR sku = 'PGP511A0280';

-- 3. Alternator
UPDATE products 
SET main_image = '/products/tractor_alternator.png' 
WHERE title ILIKE '%Alternator%';

-- 4. Radiator
UPDATE products 
SET main_image = '/products/radiator_assembly.png' 
WHERE title ILIKE '%Radiator%';

-- 5. Fuel Injection Pump
UPDATE products 
SET main_image = '/products/fuel_injection_pump.png' 
WHERE title ILIKE '%Fuel Injection%';

-- 6. Brake Pad Set
UPDATE products 
SET main_image = '/products/brake_pad_set.png' 
WHERE title ILIKE '%Brake Pad%';

-- 7. Tractor Headlight
UPDATE products 
SET main_image = '/products/tractor_headlight.png' 
WHERE title ILIKE '%Light%' OR title ILIKE '%Headlight%';

-- 8. PTO Shaft (The "Yellow Image")
-- We leave this one as is, or explicitly set it to correct one
UPDATE products 
SET main_image = '/products/pto_shaft.png' 
WHERE title ILIKE '%PTO Shaft%' OR sku = 'PTO-G100';

-- 9. Air Filter Combine
UPDATE products 
SET main_image = '/products/air_filter_combine.png' 
WHERE title ILIKE '%Air Filter%' AND title NOT ILIKE '%Oil%';

-- 10. Tractor Seat
UPDATE products 
SET main_image = '/products/tractor_seat.png' 
WHERE title ILIKE '%Seat%';

-- 11. Clutch Kit
UPDATE products 
SET main_image = '/products/clutch_kit.png' 
WHERE title ILIKE '%Clutch%';

-- 12. Transmission
UPDATE products 
SET main_image = '/products/transmission_assembly.png' 
WHERE title ILIKE '%Transmission%';

-- 13. Hydraulic Cylinder
UPDATE products 
SET main_image = '/products/hydraulic_cylinder.png' 
WHERE title ILIKE '%Cylinder%';

COMMIT;
