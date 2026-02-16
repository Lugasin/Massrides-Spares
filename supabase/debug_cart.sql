-- Debugging: Check user_carts definition and policies
SELECT 
    column_name, 
    data_type, 
    udt_name
FROM 
    information_schema.columns 
WHERE 
    table_name = 'user_carts';

-- Debugging: Check existing RLS policies
SELECT * FROM pg_policies WHERE tablename = 'user_carts';
