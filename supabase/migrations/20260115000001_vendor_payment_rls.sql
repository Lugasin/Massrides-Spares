-- Add Vendor View Policy for Payments
-- Allow vendors to see payments linked to orders where they are the vendor

CREATE POLICY "Vendors view payments for their orders" ON payments
    FOR SELECT TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM orders 
            WHERE orders.id = payments.order_id 
            AND orders.vendor_id IN (
                SELECT id FROM vendors WHERE owner_id = auth.uid()
            )
        )
    );
