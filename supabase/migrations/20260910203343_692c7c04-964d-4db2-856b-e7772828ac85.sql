-- ============ CONNECTORS ============
CREATE TABLE public.user_connections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  service_id text NOT NULL,
  method text NOT NULL DEFAULT 'api_key',
  status text NOT NULL DEFAULT 'connected',
  account_name text,
  account_handle text,
  scopes text[],
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  last_error text,
  connected_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, service_id)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_connections TO authenticated;
GRANT ALL ON public.user_connections TO service_role;
ALTER TABLE public.user_connections ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users read their own connections"
  ON public.user_connections FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users create their own connections"
  ON public.user_connections FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users update their own connections"
  ON public.user_connections FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users delete their own connections"
  ON public.user_connections FOR DELETE TO authenticated USING (auth.uid() = user_id);

CREATE INDEX idx_user_connections_user ON public.user_connections (user_id);

CREATE TRIGGER trg_user_connections_updated
  BEFORE UPDATE ON public.user_connections
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Secrets: server-side only. No anon/authenticated grants at all.
CREATE TABLE public.connection_secrets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  connection_id uuid NOT NULL REFERENCES public.user_connections(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  secret_type text NOT NULL,
  secret_value text NOT NULL,
  expires_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (connection_id, secret_type)
);

GRANT ALL ON public.connection_secrets TO service_role;
ALTER TABLE public.connection_secrets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Only server code touches connection secrets"
  ON public.connection_secrets FOR ALL TO service_role USING (true) WITH CHECK (true);

-- ============ STUDIO ============
CREATE TABLE public.studio_projects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title text NOT NULL DEFAULT 'Untitled scene',
  kind text NOT NULL DEFAULT 'animation',
  data jsonb NOT NULL DEFAULT '{}'::jsonb,
  thumbnail_url text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.studio_projects TO authenticated;
GRANT ALL ON public.studio_projects TO service_role;
ALTER TABLE public.studio_projects ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owners manage their studio projects"
  ON public.studio_projects FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE INDEX idx_studio_projects_user ON public.studio_projects (user_id, updated_at DESC);

CREATE TRIGGER trg_studio_projects_updated
  BEFORE UPDATE ON public.studio_projects
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.studio_assets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  asset_type text NOT NULL,
  url text NOT NULL,
  source text NOT NULL DEFAULT 'upload',
  duration_seconds numeric,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.studio_assets TO authenticated;
GRANT ALL ON public.studio_assets TO service_role;
ALTER TABLE public.studio_assets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owners manage their studio assets"
  ON public.studio_assets FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE INDEX idx_studio_assets_user ON public.studio_assets (user_id, created_at DESC);

-- ============ MOVIE THEATER ============
CREATE TABLE public.theater_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  host_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text,
  poster_url text,
  video_url text,
  starts_at timestamptz NOT NULL,
  capacity integer,
  status text NOT NULL DEFAULT 'scheduled',
  is_live boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.theater_events TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.theater_events TO authenticated;
GRANT ALL ON public.theater_events TO service_role;
ALTER TABLE public.theater_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Showtimes are public"
  ON public.theater_events FOR SELECT USING (true);
CREATE POLICY "Hosts create their own events"
  ON public.theater_events FOR INSERT TO authenticated WITH CHECK (auth.uid() = host_id);
CREATE POLICY "Hosts update their own events"
  ON public.theater_events FOR UPDATE TO authenticated
  USING (auth.uid() = host_id) WITH CHECK (auth.uid() = host_id);
CREATE POLICY "Hosts delete their own events"
  ON public.theater_events FOR DELETE TO authenticated USING (auth.uid() = host_id);

CREATE INDEX idx_theater_events_time ON public.theater_events (starts_at DESC);

CREATE TRIGGER trg_theater_events_updated
  BEFORE UPDATE ON public.theater_events
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.theater_playback_state (
  event_id uuid PRIMARY KEY REFERENCES public.theater_events(id) ON DELETE CASCADE,
  position_seconds numeric NOT NULL DEFAULT 0,
  is_playing boolean NOT NULL DEFAULT false,
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.theater_playback_state TO anon;
GRANT SELECT, INSERT, UPDATE ON public.theater_playback_state TO authenticated;
GRANT ALL ON public.theater_playback_state TO service_role;
ALTER TABLE public.theater_playback_state ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Playback position is public"
  ON public.theater_playback_state FOR SELECT USING (true);
CREATE POLICY "Only the host starts playback"
  ON public.theater_playback_state FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM public.theater_events e WHERE e.id = event_id AND e.host_id = auth.uid()));
CREATE POLICY "Only the host controls playback"
  ON public.theater_playback_state FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.theater_events e WHERE e.id = event_id AND e.host_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.theater_events e WHERE e.id = event_id AND e.host_id = auth.uid()));

CREATE TABLE public.theater_chat (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid NOT NULL REFERENCES public.theater_events(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  username text NOT NULL,
  message text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT ON public.theater_chat TO authenticated;
GRANT ALL ON public.theater_chat TO service_role;
ALTER TABLE public.theater_chat ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Signed-in viewers read theater chat"
  ON public.theater_chat FOR SELECT TO authenticated USING (true);
CREATE POLICY "Viewers post as themselves"
  ON public.theater_chat FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

CREATE INDEX idx_theater_chat_event ON public.theater_chat (event_id, created_at DESC);

ALTER PUBLICATION supabase_realtime ADD TABLE public.theater_playback_state;
ALTER PUBLICATION supabase_realtime ADD TABLE public.theater_chat;