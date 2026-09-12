ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS avatar_original_url text,
  ADD COLUMN IF NOT EXISTS avatar_transform jsonb NOT NULL DEFAULT '{"zoom":1,"x":0,"y":0}'::jsonb,
  ADD COLUMN IF NOT EXISTS avatar_mode text NOT NULL DEFAULT 'framed',
  ADD COLUMN IF NOT EXISTS avatar_standing_url text,
  ADD COLUMN IF NOT EXISTS avatar_standing_position jsonb NOT NULL DEFAULT '{"x":0,"y":0,"scale":1}'::jsonb;

ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_avatar_mode_check CHECK (avatar_mode IN ('framed','standing'));