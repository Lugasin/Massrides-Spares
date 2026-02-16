-- Grant permissions to authenticated users
-- RLS policies control *which* rows can be accessed, but users first need permission to access the table itself.

GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.user_carts TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.cart_items TO authenticated;

-- Also grant to service_role just in case
GRANT ALL ON TABLE public.user_carts TO service_role;
GRANT ALL ON TABLE public.cart_items TO service_role;

-- Ensure sequences are accessible if any (though these use uuid)
-- GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO authenticated;

-- Re-verify RLS is enabled
ALTER TABLE public.user_carts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cart_items ENABLE ROW LEVEL SECURITY;
