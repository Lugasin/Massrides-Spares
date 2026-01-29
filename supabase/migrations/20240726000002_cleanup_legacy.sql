-- Cleanup Legacy TJ Tables
BEGIN;

DROP TABLE IF EXISTS public.tj_transaction_logs CASCADE;
DROP TABLE IF EXISTS public.tj_payment_methods CASCADE;
DROP TABLE IF EXISTS public.tj_security_logs CASCADE;

COMMIT;
