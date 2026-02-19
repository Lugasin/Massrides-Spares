-- Fix duplicates and missing images
-- Run in Supabase SQL Editor

-- 1. Remove duplicate products (keep the one with the lowest id)
-- First delete dependent inventory records for the duplicates
DELETE FROM inventory 
WHERE product_id IN (
  SELECT id FROM products 
  WHERE sku IN ('RE504836', 'PGP511A0280', '87540915')
  AND id NOT IN (
    SELECT MIN(id)
    FROM products
    GROUP BY sku
  )
);

-- Then delete the duplicate products
DELETE FROM products
WHERE id NOT IN (
  SELECT MIN(id)
  FROM products
  GROUP BY sku
)
AND sku IN ('RE504836', 'PGP511A0280', '87540915');

-- 2. Fix main_image paths for products whose images don't exist
-- Map to closest existing image in /assets/products/

-- Engine Parts - use existing images
UPDATE products SET main_image = '/assets/products/engine_oil_filter.png' WHERE sku = 'EP-TBT-3300'; -- turbocharger -> engine filter
UPDATE products SET main_image = '/assets/products/transmission_filter_kit.png' WHERE sku = 'EP-BLT-1100'; -- belt kit -> filter kit

-- Hydraulic Parts - use existing images
UPDATE products SET main_image = '/assets/products/hydraulic_pump.png' WHERE sku = 'HY-HSE-1500'; -- hose -> pump
UPDATE products SET main_image = '/assets/products/fuel_filter_water_separator.png' WHERE sku = 'HY-FLT-800'; -- filter -> fuel filter

-- Electrical Parts - use existing images
UPDATE products SET main_image = '/assets/products/tractor_alternator.png' WHERE sku = 'EL-STR-4400'; -- starter -> alternator
UPDATE products SET main_image = '/assets/products/tractor_headlight.png' WHERE sku = 'EL-HRN-2200'; -- harness -> headlight

-- Cooling System
UPDATE products SET main_image = '/assets/products/radiator_assembly.png' WHERE sku = 'CS-FAN-1800'; -- fan -> radiator

-- Fuel System
UPDATE products SET main_image = '/assets/products/fuel_injection_pump.png' WHERE sku = 'FS-INJ-5600'; -- injector set -> injection pump
UPDATE products SET main_image = '/assets/products/fuel_filter_water_separator.png' WHERE sku = 'FS-PMP-2200'; -- transfer pump -> fuel filter

-- Brake Parts
UPDATE products SET main_image = '/assets/products/brake_pad_set.png' WHERE sku = 'BP-DSC-1100'; -- disc -> pad set

-- Steering Parts
UPDATE products SET main_image = '/assets/products/hydraulic_cylinder.png' WHERE sku = 'SP-CYL-3300'; -- steering cyl -> hyd cyl

-- Cabin Parts
UPDATE products SET main_image = '/assets/products/tractor_headlight.png' WHERE sku = 'CB-LED-200'; -- led bar -> headlight
UPDATE products SET main_image = '/assets/products/tractor_headlight.png' WHERE sku = 'CB-MIR-150'; -- mirror -> headlight

-- Cab & Body
UPDATE products SET main_image = '/assets/products/tractor_seat.png' WHERE sku = 'CB-WND-400'; -- windshield -> seat (cab part)
UPDATE products SET main_image = '/assets/products/tractor_tire.png' WHERE sku = 'CB-FND-600'; -- fender -> tire

-- Implements
UPDATE products SET main_image = '/assets/products/plow_share.png' WHERE sku = 'IM-PLW-8800'; -- plow blade -> plow share
UPDATE products SET main_image = '/assets/products/disc_plough.png' WHERE sku = 'IM-HRW-4400'; -- harrow -> disc plough

-- Wheels & Tires
UPDATE products SET main_image = '/assets/products/tractor_tire.png' WHERE sku = 'WT-TIR-1600'; -- agri tire -> tractor tire
UPDATE products SET main_image = '/assets/products/tractor_tire.png' WHERE sku = 'WT-RIM-800'; -- wheel rim -> tractor tire

-- Drivetrain
UPDATE products SET main_image = '/assets/products/transmission_assembly.png' WHERE sku = 'DT-AXL-9900'; -- ujoint -> transmission

-- Transmission
UPDATE products SET main_image = '/assets/products/transmission_assembly.png' WHERE sku = 'TR-GBX-7200'; -- gearbox -> transmission
