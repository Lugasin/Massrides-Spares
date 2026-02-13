-- Migration: Seed Categories Only
-- Description: Inserting categories to verify db push works.

INSERT INTO public.categories (name, description, sort_order) VALUES
('Engine Parts', 'Engine components, filters, and internal parts', 1),
('Hydraulic Parts', 'Pumps, cylinders, valves, and hoses', 2),
('Electrical Parts', 'Alternators, starters, lights, and sensors', 3),
('Cooling System', 'Radiators, fans, and water pumps', 4),
('Fuel System', 'Injection pumps, injectors, and fuel lines', 5),
('Brake Parts', 'Brake pads, discs, and cylinders', 6),
('Transmission Parts', 'Clutch kits, gears, and transmission assemblies', 7),
('Drivetrain Parts', 'PTO shafts, axles, and universals', 8),
('Cab & Body', 'Seats, glass, mirrors, and panels', 9)
ON CONFLICT (name) DO NOTHING;
