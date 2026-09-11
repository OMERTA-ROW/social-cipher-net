-- 1. Remove public read access to credential-bearing skytech tables
DROP POLICY IF EXISTS "Everyone can view active platform configs" ON public.skytech_platform_configs;
DROP POLICY IF EXISTS "Everyone can view active affiliate programs" ON public.skytech_affiliate_programs;

REVOKE SELECT ON public.skytech_platform_configs FROM anon, authenticated;
REVOKE SELECT ON public.skytech_affiliate_programs FROM anon, authenticated;
GRANT ALL ON public.skytech_platform_configs TO service_role;
GRANT ALL ON public.skytech_affiliate_programs TO service_role;
GRANT SELECT ON public.skytech_platform_configs TO authenticated;
GRANT SELECT ON public.skytech_affiliate_programs TO authenticated;

-- Admin-only full row access remains via existing "Only admins can manage ..." policies.

-- Safe public views without credential columns
CREATE OR REPLACE VIEW public.skytech_platform_configs_public AS
SELECT id, platform_name, platform_type, display_name, description,
       icon_url, required_scopes, is_active, auto_enabled, created_at, updated_at
FROM public.skytech_platform_configs
WHERE is_active = true;

CREATE OR REPLACE VIEW public.skytech_affiliate_programs_public AS
SELECT id, program_name, network_name, commission_rate, tracking_url,
       logo_url, description, categories, is_active, auto_enabled, created_at, updated_at
FROM public.skytech_affiliate_programs
WHERE is_active = true;

GRANT SELECT ON public.skytech_platform_configs_public TO anon, authenticated;
GRANT SELECT ON public.skytech_affiliate_programs_public TO anon, authenticated;

-- 2. Scope theater chat to event participants
CREATE TABLE IF NOT EXISTS public.theater_participants (
  event_id uuid NOT NULL REFERENCES public.theater_events(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  joined_at timestamptz NOT NULL DEFAULT now(),
  last_seen_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (event_id, user_id)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.theater_participants TO authenticated;
GRANT ALL ON public.theater_participants TO service_role;

ALTER TABLE public.theater_participants ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users manage own participation" ON public.theater_participants;
CREATE POLICY "Users manage own participation"
ON public.theater_participants FOR ALL TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "Hosts view participants of their events" ON public.theater_participants;
CREATE POLICY "Hosts view participants of their events"
ON public.theater_participants FOR SELECT TO authenticated
USING (EXISTS (
  SELECT 1 FROM public.theater_events e
  WHERE e.id = theater_participants.event_id AND e.host_id = auth.uid()
));

CREATE OR REPLACE FUNCTION public.is_theater_member(_event_id uuid, _user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.theater_events e
    WHERE e.id = _event_id AND e.host_id = _user_id
  ) OR EXISTS (
    SELECT 1 FROM public.theater_participants p
    WHERE p.event_id = _event_id AND p.user_id = _user_id
  );
$$;

DROP POLICY IF EXISTS "Signed-in viewers read theater chat" ON public.theater_chat;
CREATE POLICY "Event members read theater chat"
ON public.theater_chat FOR SELECT TO authenticated
USING (public.is_theater_member(event_id, auth.uid()));