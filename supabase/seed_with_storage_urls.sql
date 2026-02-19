-- Generated seed SQL referencing uploaded product images (manual review recommended)
-- John Deere Engine Oil Filter
INSERT INTO products (vendor_id, sku, title, description, price, currency, active, category_id, attributes, main_image)
SELECT v.id, 'RE504836', 'John Deere Engine Oil Filter', 'John Deere Engine Oil Filter - seeded', 45.99, 'USD', true, c.id, '{"brand":"John"}'::jsonb, '/assets/engine_oil_filter.png'
FROM vendors v, categories c WHERE v.slug = 'massrides-system' AND c.slug = 'engine-parts';

-- John Deere Air Filter Element
INSERT INTO products (vendor_id, sku, title, description, price, currency, active, category_id, attributes, main_image)
SELECT v.id, 'AR103033', 'John Deere Air Filter Element', 'John Deere Air Filter Element - seeded', 89.5, 'USD', true, c.id, '{"brand":"John"}'::jsonb, '/assets/air_filter_combine.png'
FROM vendors v, categories c WHERE v.slug = 'massrides-system' AND c.slug = 'engine-parts';

-- Fuel Filter Water Separator
INSERT INTO products (vendor_id, sku, title, description, price, currency, active, category_id, attributes, main_image)
SELECT v.id, 'RE62418', 'Fuel Filter Water Separator', 'Fuel Filter Water Separator - seeded', 125, 'USD', true, c.id, '{"brand":"Fuel"}'::jsonb, '/assets/fuel_filter_water_separator.png'
FROM vendors v, categories c WHERE v.slug = 'massrides-system' AND c.slug = 'engine-parts';

-- Hydraulic Pump Assembly
INSERT INTO products (vendor_id, sku, title, description, price, currency, active, category_id, attributes, main_image)
SELECT v.id, 'PGP511A0280', 'Hydraulic Pump Assembly', 'Hydraulic Pump Assembly - seeded', 850, 'USD', true, c.id, '{"brand":"Hydraulic"}'::jsonb, '/assets/hydraulic_pump.png'
FROM vendors v, categories c WHERE v.slug = 'massrides-system' AND c.slug = 'hydraulic-parts';

-- Alternator 12V 95A
INSERT INTO products (vendor_id, sku, title, description, price, currency, active, category_id, attributes, main_image)
SELECT v.id, '87540915', 'Alternator 12V 95A', 'Alternator 12V 95A - seeded', 285, 'USD', true, c.id, '{"brand":"Alternator"}'::jsonb, '/assets/tractor_alternator.png'
FROM vendors v, categories c WHERE v.slug = 'massrides-system' AND c.slug = 'electrical-parts';
