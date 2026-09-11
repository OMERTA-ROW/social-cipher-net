CREATE TABLE public.profile_albums (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  cover_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.profile_albums TO authenticated;
GRANT SELECT ON public.profile_albums TO anon;
GRANT ALL ON public.profile_albums TO service_role;

ALTER TABLE public.profile_albums ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Albums are viewable on public profiles"
ON public.profile_albums FOR SELECT
USING (
  auth.uid() = user_id
  OR EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = profile_albums.user_id AND COALESCE(p.is_private, false) = false
  )
);

CREATE POLICY "Users manage their own albums"
ON public.profile_albums FOR ALL TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE TABLE public.profile_media (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  album_id UUID REFERENCES public.profile_albums(id) ON DELETE SET NULL,
  media_url TEXT NOT NULL,
  media_type TEXT NOT NULL DEFAULT 'image',
  caption TEXT,
  display_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.profile_media TO authenticated;
GRANT SELECT ON public.profile_media TO anon;
GRANT ALL ON public.profile_media TO service_role;

ALTER TABLE public.profile_media ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Media is viewable on public profiles"
ON public.profile_media FOR SELECT
USING (
  auth.uid() = user_id
  OR EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = profile_media.user_id AND COALESCE(p.is_private, false) = false
  )
);

CREATE POLICY "Users manage their own media"
ON public.profile_media FOR ALL TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE INDEX idx_profile_media_user ON public.profile_media(user_id, created_at DESC);
CREATE INDEX idx_profile_media_album ON public.profile_media(album_id);
CREATE INDEX idx_profile_albums_user ON public.profile_albums(user_id, created_at DESC);

CREATE TRIGGER update_profile_albums_updated_at
BEFORE UPDATE ON public.profile_albums
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();