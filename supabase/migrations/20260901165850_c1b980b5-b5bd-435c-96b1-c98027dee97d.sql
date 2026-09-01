-- 1. Demo markers
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS is_demo boolean NOT NULL DEFAULT false;
ALTER TABLE public.posts ADD COLUMN IF NOT EXISTS is_demo boolean NOT NULL DEFAULT false;

-- 2. Scaling indexes
CREATE INDEX IF NOT EXISTS idx_posts_root_created_at
  ON public.posts (created_at DESC) WHERE parent_post_id IS NULL;
CREATE INDEX IF NOT EXISTS idx_posts_user_created_at
  ON public.posts (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_posts_parent_created_at
  ON public.posts (parent_post_id, created_at ASC);
CREATE INDEX IF NOT EXISTS idx_followers_follower ON public.followers (follower_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_followers_following ON public.followers (following_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_post_likes_user ON public.post_likes (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_post_likes_post ON public.post_likes (post_id);
CREATE INDEX IF NOT EXISTS idx_post_media_post ON public.post_media (post_id, display_order);
CREATE INDEX IF NOT EXISTS idx_profiles_created_at ON public.profiles (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_profiles_is_demo ON public.profiles (is_demo) WHERE is_demo;

-- 3. Posting rate limit
CREATE OR REPLACE FUNCTION public.enforce_post_rate_limit()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  per_minute integer;
  per_hour integer;
BEGIN
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

REVOKE ALL ON FUNCTION public.enforce_post_rate_limit() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS trg_posts_rate_limit ON public.posts;
CREATE TRIGGER trg_posts_rate_limit
  BEFORE INSERT ON public.posts
  FOR EACH ROW EXECUTE FUNCTION public.enforce_post_rate_limit();

-- 4. Efficient follow counts
CREATE OR REPLACE FUNCTION public.get_follow_counts(target_user uuid)
RETURNS TABLE(followers_count integer, following_count integer)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    (SELECT count(*)::int FROM public.followers WHERE following_id = target_user),
    (SELECT count(*)::int FROM public.followers WHERE follower_id = target_user);
$$;

REVOKE ALL ON FUNCTION public.get_follow_counts(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_follow_counts(uuid) TO authenticated, service_role;