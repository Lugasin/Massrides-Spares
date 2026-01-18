
-- Seed Inventory for existing products
-- This ensures every product has an inventory record so we can track quantities.

DO $$
DECLARE
  r_product RECORD;
  v_vendor_id BIGINT;
  v_default_vendor_id BIGINT;
  v_product_id BIGINT;
BEGIN
  -- 1. Ensure a default vendor exists
  SELECT id INTO v_default_vendor_id FROM vendors LIMIT 1;
  
  IF v_default_vendor_id IS NULL THEN
    INSERT INTO vendors (corporate_name, slug, contact_email, is_active)
    VALUES ('System Vendor', 'system-vendor', 'system@example.com', true)
    RETURNING id INTO v_default_vendor_id;
  END IF;

  -- 2. Iterate through all products that don't have an inventory record
  FOR r_product IN SELECT id, vendor_id FROM products WHERE id NOT IN (SELECT product_id FROM inventory) LOOP
    
    v_product_id := r_product.id;
    v_vendor_id := r_product.vendor_id;
    
    IF v_vendor_id IS NULL THEN
        v_vendor_id := v_default_vendor_id;
        -- Update product owner if missing
        UPDATE products SET vendor_id = v_vendor_id WHERE id = v_product_id;
    END IF;

    -- Insert Inventory Record
    INSERT INTO inventory (product_id, vendor_id, quantity, reserved, threshold, location, last_restocked)
    VALUES (v_product_id, v_vendor_id, 50, 0, 5, 'Warehouse A', NOW());
    
  END LOOP;
END $$;
