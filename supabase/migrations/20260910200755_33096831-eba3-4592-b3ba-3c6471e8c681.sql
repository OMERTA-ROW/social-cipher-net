ALTER TABLE public.profile_private ADD COLUMN IF NOT EXISTS two_factor_enabled boolean NOT NULL DEFAULT false;

INSERT INTO public.profile_private (user_id, two_factor_enabled)
SELECT p.id, COALESCE(p.two_factor_enabled, false)
FROM public.profiles p
ON CONFLICT (user_id) DO UPDATE SET two_factor_enabled = COALESCE(EXCLUDED.two_factor_enabled, false);

ALTER TABLE public.profiles DROP COLUMN IF EXISTS two_factor_enabled;