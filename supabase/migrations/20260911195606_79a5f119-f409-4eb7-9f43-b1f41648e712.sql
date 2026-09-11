
-- 1. skytech_platform_configs: remove credential columns from public reads
REVOKE SELECT ON public.skytech_platform_configs FROM anon, authenticated;
GRANT SELECT (id, platform_name, platform_type, is_active, auto_enabled, icon_url, display_name, description, required_scopes, created_at, updated_at)
  ON public.skytech_platform_configs TO anon, authenticated;
GRANT ALL ON public.skytech_platform_configs TO service_role;

-- 2. skytech_affiliate_programs: remove credential columns from public reads
REVOKE SELECT ON public.skytech_affiliate_programs FROM anon, authenticated;
GRANT SELECT (id, program_name, network_name, commission_rate, tracking_url, is_active, auto_enabled, logo_url, description, categories, created_at, updated_at)
  ON public.skytech_affiliate_programs TO anon, authenticated;
GRANT ALL ON public.skytech_affiliate_programs TO service_role;

-- 3. stream_gifts: restrict reads to involved parties
DROP POLICY IF EXISTS "Stream gifts are viewable by everyone" ON public.stream_gifts;

CREATE POLICY "Involved users can view stream gifts"
ON public.stream_gifts
FOR SELECT
TO authenticated
USING (
  auth.uid() = sender_id
  OR auth.uid() = receiver_id
  OR public.is_stream_owner(auth.uid(), stream_id)
  OR EXISTS (
    SELECT 1 FROM public.live_stream_participants p
    WHERE p.stream_id = stream_gifts.stream_id
      AND p.user_id = auth.uid()
      AND p.is_active = true
  )
);
