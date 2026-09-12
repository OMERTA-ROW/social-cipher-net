REVOKE SELECT ON public.theater_events FROM anon;
DROP POLICY IF EXISTS "Showtimes are public" ON public.theater_events;
DROP POLICY IF EXISTS "Theater members view full events" ON public.theater_events;
CREATE POLICY "Theater members view full events"
ON public.theater_events
FOR SELECT
TO authenticated
USING (public.is_theater_member(id, auth.uid()));

CREATE OR REPLACE VIEW public.theater_events_public
WITH (security_barrier = true)
AS
SELECT
  id,
  host_id,
  title,
  description,
  poster_url,
  starts_at,
  capacity,
  status,
  is_live,
  created_at,
  updated_at,
  format,
  is_open
FROM public.theater_events;

REVOKE ALL ON public.theater_events_public FROM PUBLIC;
GRANT SELECT ON public.theater_events_public TO anon, authenticated;
GRANT ALL ON public.theater_events_public TO service_role;