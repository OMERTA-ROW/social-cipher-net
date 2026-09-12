CREATE TABLE public.profile_radio_playlists (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  provider TEXT NOT NULL,
  playlist_url TEXT NOT NULL,
  embed_url TEXT NOT NULL,
  title TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE INDEX profile_radio_playlists_user_idx ON public.profile_radio_playlists(user_id, created_at DESC);

GRANT SELECT ON public.profile_radio_playlists TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.profile_radio_playlists TO authenticated;
GRANT ALL ON public.profile_radio_playlists TO service_role;

ALTER TABLE public.profile_radio_playlists ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view saved playlists"
  ON public.profile_radio_playlists FOR SELECT
  USING (true);

CREATE POLICY "Owners manage their saved playlists"
  ON public.profile_radio_playlists FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);