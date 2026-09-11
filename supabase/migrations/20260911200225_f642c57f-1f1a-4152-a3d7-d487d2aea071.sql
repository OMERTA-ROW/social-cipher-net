-- ============ LINK PREVIEWS ============
CREATE TABLE public.link_previews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  url text NOT NULL UNIQUE,
  title text,
  description text,
  image_url text,
  site_name text,
  media_kind text NOT NULL DEFAULT 'link',
  embed_url text,
  fetched_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.link_previews TO anon, authenticated;
GRANT ALL ON public.link_previews TO service_role;
ALTER TABLE public.link_previews ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Link previews are readable by everyone"
  ON public.link_previews FOR SELECT USING (true);
CREATE TRIGGER trg_link_previews_updated BEFORE UPDATE ON public.link_previews
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============ REPOSTS ============
CREATE TABLE public.post_reposts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id uuid NOT NULL REFERENCES public.posts(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  comment text,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (post_id, user_id)
);
GRANT SELECT, INSERT, DELETE ON public.post_reposts TO authenticated;
GRANT SELECT ON public.post_reposts TO anon;
GRANT ALL ON public.post_reposts TO service_role;
ALTER TABLE public.post_reposts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Reposts are viewable by everyone"
  ON public.post_reposts FOR SELECT USING (true);
CREATE POLICY "Users can repost"
  ON public.post_reposts FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can remove their reposts"
  ON public.post_reposts FOR DELETE TO authenticated USING (auth.uid() = user_id);
CREATE INDEX idx_post_reposts_post ON public.post_reposts(post_id);
CREATE INDEX idx_post_reposts_user ON public.post_reposts(user_id, created_at DESC);

ALTER TABLE public.posts ADD COLUMN IF NOT EXISTS repost_count integer NOT NULL DEFAULT 0;

CREATE OR REPLACE FUNCTION public.sync_post_repost_count()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.posts SET repost_count = COALESCE(repost_count,0) + 1 WHERE id = NEW.post_id;
    RETURN NEW;
  ELSE
    UPDATE public.posts SET repost_count = GREATEST(COALESCE(repost_count,0) - 1, 0) WHERE id = OLD.post_id;
    RETURN OLD;
  END IF;
END;
$$;
CREATE TRIGGER trg_post_reposts_count
AFTER INSERT OR DELETE ON public.post_reposts
FOR EACH ROW EXECUTE FUNCTION public.sync_post_repost_count();

-- ============ BLOCKS ============
CREATE TABLE public.user_blocks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  blocker_id uuid NOT NULL,
  blocked_id uuid NOT NULL,
  reason text,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (blocker_id, blocked_id)
);
GRANT SELECT, INSERT, DELETE ON public.user_blocks TO authenticated;
GRANT ALL ON public.user_blocks TO service_role;
ALTER TABLE public.user_blocks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users see their own blocks"
  ON public.user_blocks FOR SELECT TO authenticated USING (auth.uid() = blocker_id);
CREATE POLICY "Users create their own blocks"
  ON public.user_blocks FOR INSERT TO authenticated WITH CHECK (auth.uid() = blocker_id);
CREATE POLICY "Users remove their own blocks"
  ON public.user_blocks FOR DELETE TO authenticated USING (auth.uid() = blocker_id);

CREATE OR REPLACE FUNCTION public.is_blocked(_a uuid, _b uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_blocks
    WHERE (blocker_id = _a AND blocked_id = _b) OR (blocker_id = _b AND blocked_id = _a)
  );
$$;

-- ============ DIRECT MESSAGES ============
CREATE TABLE public.dm_threads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_by uuid NOT NULL,
  title text,
  source_platform text NOT NULL DEFAULT 'cyberlink',
  external_thread_id text,
  last_message_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.dm_participants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  thread_id uuid NOT NULL REFERENCES public.dm_threads(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  last_read_at timestamptz NOT NULL DEFAULT 'epoch',
  is_private boolean NOT NULL DEFAULT false,
  is_archived boolean NOT NULL DEFAULT false,
  tags text[] NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (thread_id, user_id)
);

CREATE TABLE public.dm_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  thread_id uuid NOT NULL REFERENCES public.dm_threads(id) ON DELETE CASCADE,
  sender_id uuid,
  sender_label text,
  body text NOT NULL,
  source_platform text NOT NULL DEFAULT 'cyberlink',
  external_message_id text,
  attachments jsonb NOT NULL DEFAULT '[]'::jsonb,
  is_filtered boolean NOT NULL DEFAULT false,
  filter_reason text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE OR REPLACE FUNCTION public.is_dm_member(_thread_id uuid, _user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.dm_participants p
    WHERE p.thread_id = _thread_id AND p.user_id = _user_id
  );
$$;

GRANT SELECT, INSERT, UPDATE ON public.dm_threads TO authenticated;
GRANT ALL ON public.dm_threads TO service_role;
ALTER TABLE public.dm_threads ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Members read their threads"
  ON public.dm_threads FOR SELECT TO authenticated
  USING (public.is_dm_member(id, auth.uid()));
CREATE POLICY "Users create threads"
  ON public.dm_threads FOR INSERT TO authenticated WITH CHECK (auth.uid() = created_by);
CREATE POLICY "Members update their threads"
  ON public.dm_threads FOR UPDATE TO authenticated
  USING (public.is_dm_member(id, auth.uid()))
  WITH CHECK (public.is_dm_member(id, auth.uid()));
CREATE TRIGGER trg_dm_threads_updated BEFORE UPDATE ON public.dm_threads
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

GRANT SELECT, INSERT, UPDATE, DELETE ON public.dm_participants TO authenticated;
GRANT ALL ON public.dm_participants TO service_role;
ALTER TABLE public.dm_participants ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Members read participants of their threads"
  ON public.dm_participants FOR SELECT TO authenticated
  USING (public.is_dm_member(thread_id, auth.uid()));
CREATE POLICY "Thread creators and self can add participants"
  ON public.dm_participants FOR INSERT TO authenticated
  WITH CHECK (
    auth.uid() = user_id
    OR EXISTS (SELECT 1 FROM public.dm_threads t WHERE t.id = thread_id AND t.created_by = auth.uid())
  );
CREATE POLICY "Users update their own participant row"
  ON public.dm_participants FOR UPDATE TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users leave their own threads"
  ON public.dm_participants FOR DELETE TO authenticated USING (auth.uid() = user_id);
CREATE TRIGGER trg_dm_participants_updated BEFORE UPDATE ON public.dm_participants
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE INDEX idx_dm_participants_user ON public.dm_participants(user_id);

GRANT SELECT, INSERT ON public.dm_messages TO authenticated;
GRANT ALL ON public.dm_messages TO service_role;
ALTER TABLE public.dm_messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Members read unfiltered messages"
  ON public.dm_messages FOR SELECT TO authenticated
  USING (public.is_dm_member(thread_id, auth.uid()) AND is_filtered = false);
CREATE POLICY "Members send messages as themselves"
  ON public.dm_messages FOR INSERT TO authenticated
  WITH CHECK (
    auth.uid() = sender_id
    AND public.is_dm_member(thread_id, auth.uid())
    AND source_platform = 'cyberlink'
    AND is_filtered = false
  );
CREATE INDEX idx_dm_messages_thread ON public.dm_messages(thread_id, created_at DESC);

CREATE OR REPLACE FUNCTION public.bump_dm_thread()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  UPDATE public.dm_threads SET last_message_at = NEW.created_at WHERE id = NEW.thread_id;
  RETURN NEW;
END;
$$;
CREATE TRIGGER trg_dm_messages_bump AFTER INSERT ON public.dm_messages
  FOR EACH ROW EXECUTE FUNCTION public.bump_dm_thread();

ALTER TABLE public.dm_messages REPLICA IDENTITY FULL;

-- ============ REPORTS + REVIEW QUEUE ============
CREATE TABLE public.moderation_reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  subject_type text NOT NULL,
  subject_id text,
  reported_by uuid,
  subject_user_id uuid,
  reason text NOT NULL,
  details jsonb NOT NULL DEFAULT '{}'::jsonb,
  severity text NOT NULL DEFAULT 'low',
  status text NOT NULL DEFAULT 'pending',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.moderation_reviews TO authenticated;
GRANT ALL ON public.moderation_reviews TO service_role;
ALTER TABLE public.moderation_reviews ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Reporters see their own reports"
  ON public.moderation_reviews FOR SELECT TO authenticated
  USING (auth.uid() = reported_by OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Users file reports"
  ON public.moderation_reviews FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = reported_by);
CREATE POLICY "Admins resolve reports"
  ON public.moderation_reviews FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE TRIGGER trg_moderation_reviews_updated BEFORE UPDATE ON public.moderation_reviews
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE INDEX idx_moderation_reviews_status ON public.moderation_reviews(status, created_at DESC);

-- ============ SUBSCRIPTION TIERS ============
CREATE TABLE public.subscription_tiers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key text NOT NULL UNIQUE,
  name text NOT NULL,
  description text,
  price_cents integer NOT NULL DEFAULT 0,
  interval text NOT NULL DEFAULT 'month',
  rank integer NOT NULL DEFAULT 0,
  features jsonb NOT NULL DEFAULT '[]'::jsonb,
  is_addon boolean NOT NULL DEFAULT false,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.subscription_tiers TO anon, authenticated;
GRANT ALL ON public.subscription_tiers TO service_role;
ALTER TABLE public.subscription_tiers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Active tiers are public"
  ON public.subscription_tiers FOR SELECT USING (is_active = true);
CREATE TRIGGER trg_subscription_tiers_updated BEFORE UPDATE ON public.subscription_tiers
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.user_entitlements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  tier_key text NOT NULL,
  status text NOT NULL DEFAULT 'active',
  source text NOT NULL DEFAULT 'stripe',
  current_period_end timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, tier_key)
);
GRANT SELECT ON public.user_entitlements TO authenticated;
GRANT ALL ON public.user_entitlements TO service_role;
ALTER TABLE public.user_entitlements ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users read their entitlements"
  ON public.user_entitlements FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE TRIGGER trg_user_entitlements_updated BEFORE UPDATE ON public.user_entitlements
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE OR REPLACE FUNCTION public.has_entitlement(_user_id uuid, _tier_key text)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_entitlements e
    WHERE e.user_id = _user_id AND e.tier_key = _tier_key AND e.status = 'active'
      AND (e.current_period_end IS NULL OR e.current_period_end > now())
  );
$$;

INSERT INTO public.subscription_tiers (key, name, description, price_cents, interval, rank, features, is_addon)
VALUES
  ('free', 'Free', 'Core social features', 0, 'month', 0,
   '["Posting","Feed","Messaging","Profile media"]'::jsonb, false),
  ('plus', 'Plus', 'More reach and creator tools', 900, 'month', 1,
   '["Everything in Free","Scheduled publishing","Extended analytics","Priority feed placement"]'::jsonb, false),
  ('pro', 'Pro', 'Full platform access', 2900, 'month', 2,
   '["Everything in Plus","Multicast streaming","Unified inbox automations","Advanced terminal commands"]'::jsonb, false),
  ('terminal', 'Terminal add-on', 'Sandboxed terminal with an AI agent', 800, 'year', 0,
   '["Terminal access","Built-in AI agent","Tier-based command allowlist"]'::jsonb, true);

-- ============ TERMINAL ============
CREATE TABLE public.terminal_commands (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  command text NOT NULL,
  args jsonb NOT NULL DEFAULT '{}'::jsonb,
  status text NOT NULL DEFAULT 'ok',
  output text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.terminal_commands TO authenticated;
GRANT ALL ON public.terminal_commands TO service_role;
ALTER TABLE public.terminal_commands ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users read their terminal history"
  ON public.terminal_commands FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE INDEX idx_terminal_commands_user ON public.terminal_commands(user_id, created_at DESC);

-- ============ PROFILE RADIO ============
CREATE TABLE public.profile_radio (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE,
  provider text NOT NULL DEFAULT 'link',
  playlist_url text,
  embed_url text,
  title text,
  is_enabled boolean NOT NULL DEFAULT true,
  route_to_stream boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.profile_radio TO authenticated;
GRANT SELECT ON public.profile_radio TO anon;
GRANT ALL ON public.profile_radio TO service_role;
ALTER TABLE public.profile_radio ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Enabled radios are viewable"
  ON public.profile_radio FOR SELECT USING (is_enabled = true OR auth.uid() = user_id);
CREATE POLICY "Users create their radio"
  ON public.profile_radio FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users update their radio"
  ON public.profile_radio FOR UPDATE TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users delete their radio"
  ON public.profile_radio FOR DELETE TO authenticated USING (auth.uid() = user_id);
CREATE TRIGGER trg_profile_radio_updated BEFORE UPDATE ON public.profile_radio
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============ FEED RANKING ============
CREATE OR REPLACE FUNCTION public.get_ranked_feed(p_limit integer DEFAULT 20, p_offset integer DEFAULT 0)
RETURNS TABLE(post_id uuid, score numeric)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT p.id,
    (
      (COALESCE(p.like_count,0) * 1.0
       + COALESCE(p.reply_count,0) * 2.0
       + COALESCE(p.repost_count,0) * 3.0
       + COALESCE(p.view_count,0) * 0.05
       + 1.0)
      / POWER(GREATEST(EXTRACT(EPOCH FROM (now() - p.created_at)) / 3600.0, 0.5) + 2.0, 1.5)
    )::numeric AS score
  FROM public.posts p
  WHERE p.parent_post_id IS NULL
    AND p.created_at > now() - interval '30 days'
  ORDER BY score DESC, p.created_at DESC
  LIMIT GREATEST(p_limit, 1) OFFSET GREATEST(p_offset, 0);
$$;
REVOKE EXECUTE ON FUNCTION public.get_ranked_feed(integer, integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_ranked_feed(integer, integer) TO anon, authenticated, service_role;