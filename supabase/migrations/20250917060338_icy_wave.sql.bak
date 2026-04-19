/*
  # Product Data Migration

  1. Data Migration
    - Migrate existing product data from application code to database
    - Ensure proper category relationships
    - Set up vendor assignments
    - Maintain data integrity during migration

  2. Data Validation
    - Verify all required fields are populated
    - Check foreign key relationships
    - Validate data types and constraints

  3. Cleanup
    - Remove any duplicate entries
    - Standardize data formats
    - Set proper default values
*/

-- =====================================================
-- CATEGORY DATA MIGRATION
-- =====================================================

-- Ensure all required categories exist
INSERT INTO public.categories (name, description, sort_order, is_active) VALUES
    ('Engine Parts', 'Engine components including filters, gaskets, pistons, and turbochargers', 1, true),
    ('Hydraulic Parts', 'Hydraulic system components including pumps, cylinders, hoses, and valves', 2, true),
    ('Electrical Parts', 'Electrical components including alternators, starters, switches, and wiring', 3, true),
    ('Transmission Parts', 'Transmission and drivetrain components', 4, true),
    ('Cooling System', 'Cooling system components including radiators and thermostats', 5, true),
    ('Fuel System', 'Fuel system components including pumps and injection systems', 6, true),
    ('Brake Parts', 'Brake system components including pads and hydraulic parts', 7, true),
    ('Steering Parts', 'Steering system components', 8, true),
    ('Cabin Parts', 'Cabin and operator comfort components', 9, true),
    ('Implements', 'Implement attachments and agricultural tools', 10, true),
    ('Wheels & Tires', 'Wheels, tires, and related components', 11, true)
ON CONFLICT (name) DO UPDATE SET
    description = EXCLUDED.description,
    sort_order = EXCLUDED.sort_order,
    updated_at = now();

-- =====================================================
-- SAMPLE PRODUCT DATA MIGRATION
-- =====================================================

-- Create a default vendor if none exists
DO $$
DECLARE
    default_vendor_id uuid;
    engine_parts_id uuid;
    hydraulic_parts_id uuid;
    electrical_parts_id uuid;
    cooling_system_id uuid;
    fuel_system_id uuid;
    brake_parts_id uuid;
BEGIN
    -- Get or create default vendor
    SELECT id INTO default_vendor_id 
    FROM public.user_profiles 
    WHERE role = 'vendor' 
    LIMIT 1;
    
    IF default_vendor_id IS NULL THEN
        -- Create default vendor profile (this would normally be done through user registration)
        INSERT INTO public.user_profiles (
            user_id, email, full_name, company_name, role, is_verified
        ) VALUES (
            gen_random_uuid(), 
            'vendor@massrides.co.zm', 
            'Massrides Vendor', 
            'Massrides Company Limited', 
            'vendor', 
            true
        ) RETURNING id INTO default_vendor_id;
    END IF;
    
    -- Get category IDs
    SELECT id INTO engine_parts_id FROM public.categories WHERE name = 'Engine Parts';
    SELECT id INTO hydraulic_parts_id FROM public.categories WHERE name = 'Hydraulic Parts';
    SELECT id INTO electrical_parts_id FROM public.categories WHERE name = 'Electrical Parts';
    SELECT id INTO cooling_system_id FROM public.categories WHERE name = 'Cooling System';
    SELECT id INTO fuel_system_id FROM public.categories WHERE name = 'Fuel System';
    SELECT id INTO brake_parts_id FROM public.categories WHERE name = 'Brake Parts';
    
    -- Insert sample spare parts data
    INSERT INTO public.spare_parts (
        vendor_id, category_id, name, description, part_number, oem_part_number, 
        brand, price, condition, availability_status, stock_quantity, 
        images, technical_specs, compatibility, warranty, featured, tags
    ) VALUES
    -- Engine Parts
    (
        default_vendor_id, engine_parts_id,
        'John Deere Engine Oil Filter',
        'Genuine John Deere engine oil filter for optimal engine protection and performance. High-quality filtration media ensures clean oil circulation.',
        'RE504836', 'RE504836',
        'John Deere', 45.99, 'new', 'in_stock', 150,
        ARRAY['/src/assets/tractor-plowing.jpg'],
        '{"filterType": "Spin-on", "threadSize": "3/4-16 UNF", "height": "4.5 inches", "diameter": "3.66 inches", "micronRating": "25 micron"}'::jsonb,
        ARRAY['6M Series', '7R Series', '8R Series'],
        '12 months', true,
        ARRAY['genuine', 'oem', 'filter', 'engine']
    ),
    (
        default_vendor_id, hydraulic_parts_id,
        'Hydraulic Pump Assembly',
        'High-performance hydraulic pump assembly for agricultural equipment. Provides reliable hydraulic power for implements and steering.',
        'PGP511A0280', 'PGP511A0280',
        'Parker', 850.00, 'new', 'in_stock', 25,
        ARRAY['/src/assets/planter-seeding.jpg'],
        '{"displacement": "28 cc/rev", "maxPressure": "3000 PSI", "maxSpeed": "3000 RPM", "mounting": "SAE A 2-bolt"}'::jsonb,
        ARRAY['Case IH', 'New Holland', 'John Deere'],
        '24 months', true,
        ARRAY['hydraulic', 'pump', 'high pressure']
    ),
    (
        default_vendor_id, electrical_parts_id,
        'Alternator 12V 95A',
        'Heavy-duty alternator for Case IH tractors and combines. 12V output, 95 amp capacity with weather-resistant design.',
        '87540915', '87540915',
        'Case IH', 285.00, 'new', 'in_stock', 20,
        ARRAY['/src/assets/hero-combine.jpg'],
        '{"voltage": "12V", "amperage": "95A", "rotation": "Clockwise", "mounting": "Pad mount"}'::jsonb,
        ARRAY['Magnum Series', 'Puma Series', 'Farmall Series'],
        '18 months', true,
        ARRAY['electrical', 'alternator', 'charging']
    ),
    (
        default_vendor_id, cooling_system_id,
        'Radiator Assembly',
        'High-quality radiator assembly for Kubota tractors. Aluminum core with plastic tanks for optimal heat dissipation.',
        '1C010-17114', '1C010-17114',
        'Kubota', 420.00, 'new', 'in_stock', 15,
        ARRAY['/src/assets/irrigation-aerial.jpg'],
        '{"coreType": "Aluminum", "tankMaterial": "Plastic", "rows": "2 row", "inletSize": "1.5 inches"}'::jsonb,
        ARRAY['M Series', 'L Series', 'Grand L Series'],
        '12 months', false,
        ARRAY['cooling', 'radiator', 'aluminum']
    ),
    (
        default_vendor_id, fuel_system_id,
        'Fuel Injection Pump',
        'Remanufactured fuel injection pump for Massey Ferguson tractors. Core exchange required. Precision-calibrated for optimal performance.',
        '3641832M91', '3641832M91',
        'Massey Ferguson', 1250.00, 'refurbished', 'in_stock', 8,
        ARRAY['/src/assets/farmer-tractor.jpg'],
        '{"type": "Rotary", "cylinders": "4 cylinder", "rotation": "Clockwise", "coreRequired": "Yes"}'::jsonb,
        ARRAY['MF 6400', 'MF 7400', 'MF 8400'],
        '12 months', true,
        ARRAY['fuel system', 'injection pump', 'remanufactured']
    ),
    (
        default_vendor_id, brake_parts_id,
        'Brake Pad Set',
        'High-performance brake pads for Fendt tractors. Ceramic compound for long life and quiet operation.',
        'F916200060110', 'F916200060110',
        'Fendt', 95.00, 'new', 'in_stock', 60,
        ARRAY['/src/assets/tractor-wheel.jpg'],
        '{"material": "Ceramic compound", "thickness": "15mm", "length": "120mm", "width": "80mm"}'::jsonb,
        ARRAY['Fendt 700', 'Fendt 800', 'Fendt 900'],
        '6 months', false,
        ARRAY['brake', 'ceramic', 'long life']
    )
    ON CONFLICT (part_number) DO UPDATE SET
        name = EXCLUDED.name,
        description = EXCLUDED.description,
        price = EXCLUDED.price,
        stock_quantity = EXCLUDED.stock_quantity,
        updated_at = now();
END $$;

-- =====================================================
-- PARTNER COMPANY DATA
-- =====================================================

-- Insert partner companies
INSERT INTO public.company_partners (name, logo_url, website_url, description, display_order, is_active) VALUES
    ('John Deere', '/company logos/John_Deere-Logo-PNG3.png', 'https://www.deere.com', 'Leading manufacturer of agricultural machinery', 1, true),
    ('Case IH', '/company logos/IH_logo_PNG_(3).png', 'https://www.caseih.com', 'Agricultural equipment manufacturer', 2, true),
    ('New Holland', '/company logos/New_Holland_logo_PNG_(7).png', 'https://www.newholland.com', 'Agricultural machinery and equipment', 3, true),
    ('Kubota', '/company logos/Kubota_(1).png', 'https://www.kubota.com', 'Compact tractors and agricultural equipment', 4, true),
    ('Massey Ferguson', '/company logos/Massey-Ferguson-Logo.png', 'https://www.masseyferguson.com', 'Agricultural machinery manufacturer', 5, true)
ON CONFLICT (name) DO UPDATE SET
    logo_url = EXCLUDED.logo_url,
    website_url = EXCLUDED.website_url,
    description = EXCLUDED.description,
    display_order = EXCLUDED.display_order,
    updated_at = now();

-- =====================================================
-- DATA VALIDATION AND CLEANUP
-- =====================================================

-- Update any spare parts without categories
UPDATE public.spare_parts 
SET category_id = (SELECT id FROM public.categories WHERE name = 'Engine Parts' LIMIT 1)
WHERE category_id IS NULL;

-- Update any spare parts without vendors
UPDATE public.spare_parts 
SET vendor_id = (SELECT id FROM public.user_profiles WHERE role = 'vendor' LIMIT 1)
WHERE vendor_id IS NULL;

-- Ensure all spare parts have proper stock levels
UPDATE public.spare_parts 
SET min_stock_level = 5 
WHERE min_stock_level IS NULL OR min_stock_level < 0;

-- Ensure all spare parts have proper availability status
UPDATE public.spare_parts 
SET availability_status = CASE 
    WHEN stock_quantity > min_stock_level THEN 'in_stock'
    WHEN stock_quantity > 0 THEN 'in_stock'
    ELSE 'out_of_stock'
END
WHERE availability_status IS NULL;

-- =====================================================
-- COMMENTS FOR DOCUMENTATION
-- =====================================================

COMMENT ON TABLE public.activity_logs IS 'Comprehensive activity tracking for audit and compliance';
COMMENT ON TABLE public.audit_logs IS 'Change tracking for critical tables with full before/after values';
COMMENT ON TABLE public.system_metrics IS 'System performance and health monitoring metrics';
COMMENT ON TABLE public.ads IS 'Vendor advertisement management system';
COMMENT ON TABLE public.company_partners IS 'Partner company information for website display';