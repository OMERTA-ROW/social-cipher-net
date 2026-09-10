CREATE TABLE IF NOT EXISTS public.profile_private (
  user_id uuid PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
  birthdate date,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE ON public.profile_private TO authenticated;
GRANT ALL ON public.profile_private TO service_role;

ALTER TABLE public.profile_private ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own private profile"
ON public.profile_private FOR SELECT TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own private profile"
ON public.profile_private FOR INSERT TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own private profile"
ON public.profile_private FOR UPDATE TO authenticated
USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE TRIGGER update_profile_private_updated_at
BEFORE UPDATE ON public.profile_private
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

INSERT INTO public.profile_private (user_id, birthdate)
SELECT id, birthdate FROM public.profiles WHERE birthdate IS NOT NULL
ON CONFLICT (user_id) DO NOTHING;

CREATE OR REPLACE FUNCTION public.is_user_adult(user_uuid uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT
    CASE
      WHEN pp.birthdate IS NULL THEN false
      WHEN AGE(pp.birthdate) >= INTERVAL '18 years' THEN true
      ELSE false
    END
  FROM public.profile_private pp
  WHERE pp.user_id = user_uuid;
$function$;

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  INSERT INTO public.profiles (id, username, display_name)
  VALUES (
    NEW.id,
    NEW.raw_user_meta_data->>'username',
    NEW.raw_user_meta_data->>'display_name'
  );

  INSERT INTO public.privacy_settings (user_id)
  VALUES (NEW.id);

  INSERT INTO public.profile_private (user_id, birthdate)
  VALUES (NEW.id, NULLIF(NEW.raw_user_meta_data->>'birthdate', '')::date)
  ON CONFLICT (user_id) DO NOTHING;

  RETURN NEW;
END;
$function$;

ALTER TABLE public.profiles DROP COLUMN IF EXISTS birthdate;

CREATE POLICY "Owners and paying viewers can read paid media"
ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'paid-media'
  AND (
    (storage.foldername(name))[1] = auth.uid()::text
    OR EXISTS (
      SELECT 1
      FROM public.post_media pm
      JOIN public.post_payments pay
        ON pay.post_id = pm.post_id
       AND pay.payer_id = auth.uid()
       AND COALESCE(pay.status, 'completed') IN ('completed', 'succeeded', 'paid')
      WHERE pm.media_url = storage.objects.name
    )
  )
);

CREATE POLICY "Users can upload their own paid media"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'paid-media'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

CREATE POLICY "Users can delete their own paid media"
ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id = 'paid-media'
  AND (storage.foldername(name))[1] = auth.uid()::text
);
