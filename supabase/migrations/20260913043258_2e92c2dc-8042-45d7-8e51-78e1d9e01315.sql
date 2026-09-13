-- calculate_mining_multiplier(numeric) was created with an explicit
-- "GRANT EXECUTE TO authenticated" in 20251114222247 and a later migration
-- only revoked it from anon. The previous pass revoked the inherited PUBLIC
-- entry, which left that explicit grant in place. No caller exists in src/**
-- or supabase/functions/**; the value is computed by server-side mining
-- bookkeeping, so the service role keeps it.
REVOKE EXECUTE ON FUNCTION public.calculate_mining_multiplier(numeric) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.calculate_mining_multiplier(numeric) TO service_role;
