DROP POLICY IF EXISTS "Signed-in members read fee rules" ON public.fee_settings;

DROP POLICY IF EXISTS "Active snipe marks are visible to everyone" ON public.snipe_hits;
CREATE POLICY "Involved users see their snipe marks" ON public.snipe_hits
  FOR SELECT TO authenticated
  USING (auth.uid() = target_user_id OR auth.uid() = sender_id);
REVOKE SELECT ON public.snipe_hits FROM anon;

DROP POLICY IF EXISTS "Playback position is public" ON public.theater_playback_state;
CREATE POLICY "Room members see playback position" ON public.theater_playback_state
  FOR SELECT TO authenticated
  USING (
    public.is_theater_member(event_id, auth.uid())
    OR EXISTS (SELECT 1 FROM public.theater_events e WHERE e.id = event_id AND e.host_id = auth.uid())
  );
REVOKE SELECT ON public.theater_playback_state FROM anon;