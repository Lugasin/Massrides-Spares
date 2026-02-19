-- Fix missing columns on categories and add sample seeds
-- Idempotent: will only add columns if they don't exist and only insert missing categories

-- Add `description` column if missing
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='categories' AND column_name='description') THEN
    ALTER TABLE categories ADD COLUMN description text;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='categories' AND column_name='is_active') THEN
    ALTER TABLE categories ADD COLUMN is_active boolean default true;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='categories' AND column_name='sort_order') THEN
    ALTER TABLE categories ADD COLUMN sort_order integer default 0;
  END IF;
END$$;

-- Insert sample categories if they don't exist (use fixed ids to be idempotent)
INSERT INTO categories (id, name, slug, description, is_active, sort_order, created_at)
SELECT * FROM (VALUES
  (1001, 'Engine Parts', 'engine-parts', 'Parts for engines and related components', true, 10, now()),
  (1002, 'Hydraulic Parts', 'hydraulic-parts', 'Hydraulic pumps, hoses, and fittings', true, 20, now()),
  (1003, 'Electrical Parts', 'electrical-parts', 'Alternators, starters, wiring and sensors', true, 30, now()),
  (1004, 'Transmission Parts', 'transmission-parts', 'Clutches, gearboxes and transmission components', true, 40, now()),
  (1005, 'Cooling System', 'cooling-system', 'Radiators, thermostats and hoses', true, 50, now())
) AS v(id, name, slug, description, is_active, sort_order, created_at)
WHERE NOT EXISTS (SELECT 1 FROM categories c WHERE c.id = v.id OR c.slug = v.slug);
