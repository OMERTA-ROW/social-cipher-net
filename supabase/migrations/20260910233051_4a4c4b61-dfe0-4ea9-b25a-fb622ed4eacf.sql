-- ============ Connector foundation (Phase 1) ============

ALTER TABLE public.user_connections
  ADD COLUMN IF NOT EXISTS health text NOT NULL DEFAULT 'healthy',
  ADD COLUMN IF NOT EXISTS expires_at timestamptz,
  ADD COLUMN IF NOT EXISTS last_synced_at timestamptz,
  ADD COLUMN IF NOT EXISTS failure_count integer NOT NULL DEFAULT 0;

ALTER TABLE public.connection_secrets
  ADD COLUMN IF NOT EXISTS encrypted boolean NOT NULL DEFAULT false;

-- ---- Connector catalogue -------------------------------------------------
CREATE TABLE IF NOT EXISTS public.connector_definitions (
  id text PRIMARY KEY,
  name text NOT NULL,
  category text NOT NULL,
  glyph text NOT NULL DEFAULT '🔌',
  blurb text NOT NULL DEFAULT '',
  methods text[] NOT NULL DEFAULT '{}',
  capabilities text[] NOT NULL DEFAULT '{}',
  oauth_provider text,
  fields jsonb NOT NULL DEFAULT '[]'::jsonb,
  constraints jsonb NOT NULL DEFAULT '{}'::jsonb,
  rate_policy jsonb NOT NULL DEFAULT '{}'::jsonb,
  availability text NOT NULL DEFAULT 'available',
  docs_url text,
  enabled boolean NOT NULL DEFAULT true,
  sort_order integer NOT NULL DEFAULT 100,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.connector_definitions TO authenticated;
GRANT ALL ON public.connector_definitions TO service_role;
ALTER TABLE public.connector_definitions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Signed in users read the connector catalogue"
  ON public.connector_definitions FOR SELECT TO authenticated USING (true);
CREATE POLICY "Server code manages the connector catalogue"
  ON public.connector_definitions FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE TRIGGER trg_connector_definitions_updated
  BEFORE UPDATE ON public.connector_definitions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ---- Audit log -----------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.connector_audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  connection_id uuid REFERENCES public.user_connections(id) ON DELETE SET NULL,
  service_id text NOT NULL,
  action text NOT NULL,
  status text NOT NULL,
  http_status integer,
  detail text,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.connector_audit_log TO authenticated;
GRANT ALL ON public.connector_audit_log TO service_role;
ALTER TABLE public.connector_audit_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users read their own connector activity"
  ON public.connector_audit_log FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Server code writes connector activity"
  ON public.connector_audit_log FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE INDEX IF NOT EXISTS idx_connector_audit_user_time
  ON public.connector_audit_log (user_id, created_at DESC);

-- ---- Rate limit state (server only) -------------------------------------
CREATE TABLE IF NOT EXISTS public.connector_rate_state (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  connection_id uuid NOT NULL REFERENCES public.user_connections(id) ON DELETE CASCADE,
  bucket text NOT NULL DEFAULT 'default',
  tokens numeric NOT NULL DEFAULT 0,
  refilled_at timestamptz NOT NULL DEFAULT now(),
  blocked_until timestamptz,
  UNIQUE (connection_id, bucket)
);

GRANT ALL ON public.connector_rate_state TO service_role;
ALTER TABLE public.connector_rate_state ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Only server code touches rate state"
  ON public.connector_rate_state FOR ALL TO service_role USING (true) WITH CHECK (true);

-- ---- Sync job queue ------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.sync_jobs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  connection_id uuid REFERENCES public.user_connections(id) ON DELETE CASCADE,
  service_id text NOT NULL,
  job_type text NOT NULL,
  status text NOT NULL DEFAULT 'queued',
  priority integer NOT NULL DEFAULT 100,
  run_after timestamptz NOT NULL DEFAULT now(),
  attempts integer NOT NULL DEFAULT 0,
  last_error text,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  result jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.sync_jobs TO authenticated;
GRANT ALL ON public.sync_jobs TO service_role;
ALTER TABLE public.sync_jobs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users read their own sync jobs"
  ON public.sync_jobs FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Server code manages sync jobs"
  ON public.sync_jobs FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE INDEX IF NOT EXISTS idx_sync_jobs_pending
  ON public.sync_jobs (status, run_after, priority);

CREATE TRIGGER trg_sync_jobs_updated
  BEFORE UPDATE ON public.sync_jobs
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ---- Publish pipeline ----------------------------------------------------
CREATE TABLE IF NOT EXISTS public.publish_batches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title text,
  body text NOT NULL DEFAULT '',
  media jsonb NOT NULL DEFAULT '[]'::jsonb,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  status text NOT NULL DEFAULT 'draft',
  scheduled_for timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.publish_batches TO authenticated;
GRANT ALL ON public.publish_batches TO service_role;
ALTER TABLE public.publish_batches ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage their own publish batches"
  ON public.publish_batches FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Server code manages publish batches"
  ON public.publish_batches FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE TRIGGER trg_publish_batches_updated
  BEFORE UPDATE ON public.publish_batches
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE IF NOT EXISTS public.publish_targets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  batch_id uuid NOT NULL REFERENCES public.publish_batches(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  service_id text NOT NULL,
  connection_id uuid REFERENCES public.user_connections(id) ON DELETE SET NULL,
  status text NOT NULL DEFAULT 'queued',
  overrides jsonb NOT NULL DEFAULT '{}'::jsonb,
  permalink text,
  provider_item_id text,
  error text,
  attempts integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (batch_id, service_id)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.publish_targets TO authenticated;
GRANT ALL ON public.publish_targets TO service_role;
ALTER TABLE public.publish_targets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage their own publish targets"
  ON public.publish_targets FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Server code manages publish targets"
  ON public.publish_targets FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE INDEX IF NOT EXISTS idx_publish_targets_batch
  ON public.publish_targets (batch_id);

CREATE TRIGGER trg_publish_targets_updated
  BEFORE UPDATE ON public.publish_targets
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();