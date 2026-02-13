-- Migration: Fix Product Images
-- Description: Updates spare parts with correct image paths from public/products instead of placeholders.

-- 1. John Deere Engine Oil Filter
UPDATE public.spare_parts 
SET images = ARRAY['/products/engine_oil_filter.png']
WHERE part_number = 'RE504836';

-- 2. Hydraulic Pump Assembly
UPDATE public.spare_parts 
SET images = ARRAY['/products/hydraulic_pump.png']
WHERE part_number = 'PGP511A0280';

-- 3. Alternator 12V 95A
UPDATE public.spare_parts 
SET images = ARRAY['/products/tractor_alternator.png']
WHERE part_number = '87540915';

-- 4. Radiator Assembly
UPDATE public.spare_parts 
SET images = ARRAY['/products/radiator_assembly.png']
WHERE part_number = '1C010-17114';

-- 5. Fuel Injection Pump
UPDATE public.spare_parts 
SET images = ARRAY['/products/fuel_injection_pump.png']
WHERE part_number = '3641832M91';

-- 6. Brake Pad Set
UPDATE public.spare_parts 
SET images = ARRAY['/products/brake_pad_set.png']
WHERE part_number = 'F916200060110';

-- 7. LED Work Light
UPDATE public.spare_parts 
SET images = ARRAY['/products/tractor_headlight.png']
WHERE part_number = 'LED-WL48S';

-- 8. PTO Shaft Guard
UPDATE public.spare_parts 
SET images = ARRAY['/products/pto_shaft.png']
WHERE part_number = 'PTO-G100';

-- 9. Combine Air Filter
UPDATE public.spare_parts 
SET images = ARRAY['/products/air_filter_combine.png']
WHERE part_number = 'P181052';

-- 10. Suspension Seat
UPDATE public.spare_parts 
SET images = ARRAY['/products/tractor_seat.png']
WHERE part_number = 'MSG85/721';

-- 11. Tractor Clutch Kit
UPDATE public.spare_parts 
SET images = ARRAY['/products/clutch_kit.png']
WHERE part_number = '628302009';

-- 12. Used Transmission Assembly
UPDATE public.spare_parts 
SET images = ARRAY['/products/transmission_assembly.png']
WHERE part_number = 'RE234567';

-- 13. Used Hydraulic Cylinder
UPDATE public.spare_parts 
SET images = ARRAY['/products/hydraulic_cylinder.png']
WHERE part_number = '87540123';
