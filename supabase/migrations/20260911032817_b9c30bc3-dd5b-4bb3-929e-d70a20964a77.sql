DROP VIEW IF EXISTS public.skytech_platform_configs_public;
DROP VIEW IF EXISTS public.skytech_affiliate_programs_public;

-- Column-level grants: credential columns (oauth_config, api_config, metadata) stay service_role/admin-only
GRANT SELECT (id, platform_name, platform_type, display_name, description, icon_url, required_scopes, is_active, auto_enabled, created_at, updated_at)
  ON public.skytech_platform_configs TO anon, authenticated;
GRANT SELECT (id, program_name, network_name, commission_rate, tracking_url, logo_url, description, categories, is_active, auto_enabled, created_at, updated_at)
  ON public.skytech_affiliate_programs TO anon, authenticated;

CREATE POLICY "Public can view active platform configs"
ON public.skytech_platform_configs FOR SELECT TO anon, authenticated
USING (is_active = true);

CREATE POLICY "Public can view active affiliate programs"
ON public.skytech_affiliate_programs FOR SELECT TO anon, authenticated
USING (is_active = true);