DROP POLICY IF EXISTS "Users create their own connections" ON public.user_connections;
DROP POLICY IF EXISTS "Users update their own connections" ON public.user_connections;
DROP POLICY IF EXISTS "Users delete their own connections" ON public.user_connections;
REVOKE INSERT, UPDATE, DELETE ON public.user_connections FROM authenticated, anon;
GRANT SELECT ON public.user_connections TO authenticated;
GRANT ALL ON public.user_connections TO service_role;