-- Grant full access to service_role for checkout flow
GRANT ALL ON public.cart_items TO service_role;
GRANT ALL ON public.spare_parts TO service_role;
GRANT ALL ON public.orders TO service_role;
GRANT ALL ON public.order_items TO service_role;
GRANT ALL ON public.payments TO service_role;
