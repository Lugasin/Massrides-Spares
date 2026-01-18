-- Fix product image links to use the newly generated accurate images

-- 1. Tractor Battery (Keep existing if correct, but user list has it. Let's assume it was okay, but check others)
-- The user didn't complain about battery, but Front Tire was 404.

-- 2. Front Tire 12.4-24
UPDATE products 
SET image = '/assets/products/tractor_tire.png' 
WHERE part_number = 'TIRE-FRONT-001';

-- 3. Steering Wheel Assembly
UPDATE products 
SET image = '/assets/products/steering_wheel.png' 
WHERE part_number = 'STEER-WHEEL-001';

-- 4. Fuel Filter Water Separator
UPDATE products 
SET image = '/assets/products/fuel_filter_water_separator.png' 
WHERE part_number = 'RE62418';

-- 5. Plow Share 16"
UPDATE products 
SET image = '/assets/products/plow_share.png' 
WHERE part_number = 'PLOW-SHARE-001';

-- 6. Transmission Filter Kit
UPDATE products 
SET image = '/assets/products/transmission_filter_kit.png' 
WHERE part_number = 'RE234567';

-- 7. Operator Seat with Suspension
-- Ensure it points to tractor_seat.png (migrated as tractor_seat.png so it should be fine, but good to be explicit if it was wrong)
UPDATE products 
SET image = '/assets/products/tractor_seat.png' 
WHERE part_number = 'SEAT-SUSP-001';

-- 8. Disc Plough 3-Disc
-- Was using disc_plough.png, confusing with Plow Share. 
-- If Plow Share now uses plow_share.png, disc_plough.png is likely the big plough. 
-- Let's ensure Disc Plough uses disc_plough.png (which exists)
UPDATE products 
SET image = '/assets/products/disc_plough.png' 
WHERE part_number = 'PLOUGH-DISC-003';
