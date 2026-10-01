REVOKE ALL ON TABLE public.platform_connections FROM anon, authenticated;
REVOKE ALL ON TABLE public.trading_accounts FROM anon, authenticated;
REVOKE ALL ON TABLE public.external_mining_accounts FROM anon, authenticated;
GRANT SELECT ON TABLE public.user_connections TO authenticated;
GRANT ALL ON TABLE public.user_connections TO service_role;