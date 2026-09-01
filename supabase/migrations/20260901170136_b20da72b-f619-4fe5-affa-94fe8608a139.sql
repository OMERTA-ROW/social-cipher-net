CREATE OR REPLACE FUNCTION public.enforce_post_rate_limit()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  per_minute integer;
  per_hour integer;
  author_is_demo boolean;
BEGIN
  SELECT p.is_demo INTO author_is_demo FROM public.profiles p WHERE p.id = NEW.user_id;
  IF COALESCE(author_is_demo, false) THEN
    RETURN NEW;
  END IF;

  SELECT count(*) INTO per_minute
  FROM public.posts
  WHERE user_id = NEW.user_id AND created_at > now() - interval '1 minute';

  IF per_minute >= 10 THEN
    RAISE EXCEPTION 'Rate limit: you can post at most 10 times per minute';
  END IF;

  SELECT count(*) INTO per_hour
  FROM public.posts
  WHERE user_id = NEW.user_id AND created_at > now() - interval '1 hour';

  IF per_hour >= 100 THEN
    RAISE EXCEPTION 'Rate limit: you can post at most 100 times per hour';
  END IF;

  RETURN NEW;
END;
$$;