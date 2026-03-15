-- fix_topup_orders_permissions.sql
-- Grant access to the topup_orders table so that the API can read/write to it.
-- When creating tables via standard SQL instead of the Supabase UI, 
-- these grants must be manually applied.

GRANT ALL ON TABLE public.topup_orders TO anon;
GRANT ALL ON TABLE public.topup_orders TO authenticated;
GRANT ALL ON TABLE public.topup_orders TO service_role;
