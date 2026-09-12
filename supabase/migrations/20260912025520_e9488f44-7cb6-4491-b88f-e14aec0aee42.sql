DROP POLICY IF EXISTS "Public can view active affiliate programs" ON public.skytech_affiliate_programs;
DROP POLICY IF EXISTS "Public can view active platform configs" ON public.skytech_platform_configs;

REVOKE SELECT ON public.skytech_affiliate_programs FROM anon;
REVOKE SELECT ON public.skytech_platform_configs FROM anon;