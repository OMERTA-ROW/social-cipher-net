INSERT INTO public.gifts (name, description, price, icon_url, animation_type)
SELECT 'Sniper', 'One shot. The crack stays.', 1000, '🎯', 'sniper'
WHERE NOT EXISTS (SELECT 1 FROM public.gifts WHERE name = 'Sniper');

CREATE TABLE IF NOT EXISTS public.snipe_hits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  target_user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  sender_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  sender_name text,
  sender_avatar text,
  stream_id uuid,
  impact_x numeric NOT NULL DEFAULT 50,
  impact_y numeric NOT NULL DEFAULT 45,
  seed integer NOT NULL DEFAULT floor(random() * 100000),
  expires_at timestamptz NOT NULL DEFAULT now() + interval '5 hours',
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.snipe_hits TO anon;
GRANT SELECT, INSERT ON public.snipe_hits TO authenticated;
GRANT ALL ON public.snipe_hits TO service_role;

ALTER TABLE public.snipe_hits ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Active snipe marks are visible to everyone"
  ON public.snipe_hits FOR SELECT
  USING (true);

CREATE POLICY "Senders can record their own shot"
  ON public.snipe_hits FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = sender_id AND auth.uid() <> target_user_id);

CREATE INDEX IF NOT EXISTS idx_snipe_hits_target_active
  ON public.snipe_hits (target_user_id, expires_at DESC);

-- Duration scales with hits taken in the last 30 days: 5 hits => 24h minimum.
CREATE OR REPLACE FUNCTION public.set_snipe_expiry()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  recent_hits integer;
BEGIN
  SELECT count(*) + 1 INTO recent_hits
  FROM public.snipe_hits
  WHERE target_user_id = NEW.target_user_id
    AND created_at > now() - interval '30 days';

  NEW.expires_at := now() + (recent_hits * interval '4 hours 48 minutes');
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_snipe_expiry ON public.snipe_hits;
CREATE TRIGGER trg_snipe_expiry
  BEFORE INSERT ON public.snipe_hits
  FOR EACH ROW EXECUTE FUNCTION public.set_snipe_expiry();

ALTER PUBLICATION supabase_realtime ADD TABLE public.snipe_hits;