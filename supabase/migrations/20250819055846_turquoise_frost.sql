/*
  # Fix products table constraints

  1. Updates
    - Add condition column if it doesn't exist
    - Add 'remanufactured' to condition enum
    - Ensure all necessary conditions are supported

  2. Changes
    - Add condition column with default 'new'
    - Update condition check constraint to include 'remanufactured'
*/

-- Add condition column if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'products' AND column_name = 'condition'
  ) THEN
    ALTER TABLE products ADD COLUMN condition text DEFAULT 'new';
  END IF;
END $$;

-- Drop existing constraint if it exists
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE table_name = 'products' AND constraint_name LIKE '%condition%'
  ) THEN
    ALTER TABLE products DROP CONSTRAINT IF EXISTS products_condition_check;
  END IF;
END $$;

-- Add updated constraint with remanufactured
ALTER TABLE products 
ADD CONSTRAINT products_condition_check 
CHECK (condition IN ('new', 'used', 'refurbished', 'oem', 'aftermarket', 'remanufactured'));