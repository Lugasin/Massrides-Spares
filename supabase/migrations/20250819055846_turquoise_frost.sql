/*
  # Fix spare_parts table constraints

  1. Updates
    - Add 'remanufactured' to condition enum
    - Ensure all necessary conditions are supported

  2. Changes
    - Update condition check constraint to include 'remanufactured'
*/

-- Drop existing constraint if it exists
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE table_name = 'spare_parts' AND constraint_name LIKE '%condition%'
  ) THEN
    ALTER TABLE spare_parts DROP CONSTRAINT IF EXISTS spare_parts_condition_check;
  END IF;
END $$;

-- Add updated constraint with remanufactured
ALTER TABLE spare_parts 
ADD CONSTRAINT spare_parts_condition_check 
CHECK (condition IN ('new', 'used', 'refurbished', 'oem', 'aftermarket', 'remanufactured'));