CREATE TABLE public.connector_oauth_attempts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  service_id text NOT NULL,
  provider text NOT NULL,
  account_key text NOT NULL DEFAULT 'default',
  account_label text,
  state_hash text NOT NULL UNIQUE,
  code_verifier text,
  redirect_uri text NOT NULL,
  expires_at timestamptz NOT NULL,
  consumed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT ALL ON public.connector_oauth_attempts TO service_role;
ALTER TABLE public.connector_oauth_attempts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Only server code manages OAuth attempts"
  ON public.connector_oauth_attempts FOR ALL TO service_role
  USING (true) WITH CHECK (true);
CREATE INDEX connector_oauth_attempts_user_created_idx
  ON public.connector_oauth_attempts (user_id, created_at DESC);

REVOKE INSERT, UPDATE, DELETE ON public.user_connections FROM authenticated;
GRANT SELECT ON public.user_connections TO authenticated;