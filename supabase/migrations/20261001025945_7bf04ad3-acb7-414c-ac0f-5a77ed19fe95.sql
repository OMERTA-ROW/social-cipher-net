ALTER TABLE public.user_connections
  ADD COLUMN IF NOT EXISTS provider_account_id text;

CREATE UNIQUE INDEX IF NOT EXISTS user_connections_verified_provider_account
  ON public.user_connections (user_id, service_id, provider_account_id)
  WHERE provider_account_id IS NOT NULL AND status = 'connected';

CREATE OR REPLACE FUNCTION public.activate_verified_oauth_connection(
  _connection_id uuid,
  _user_id uuid,
  _service_id text,
  _provider_account_id text,
  _account_name text,
  _account_handle text,
  _expires_at timestamptz
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  activated integer;
BEGIN
  IF _provider_account_id IS NULL OR btrim(_provider_account_id) = '' THEN
    RETURN false;
  END IF;

  UPDATE public.user_connections
  SET status = 'disconnected',
      is_active_account = false,
      health = 'replaced',
      updated_at = now()
  WHERE user_id = _user_id
    AND service_id = _service_id
    AND provider_account_id = _provider_account_id
    AND status = 'connected'
    AND id <> _connection_id;

  UPDATE public.user_connections
  SET status = 'connected',
      provider_account_id = _provider_account_id,
      account_name = NULLIF(left(_account_name, 255), ''),
      account_handle = NULLIF(left(_account_handle, 255), ''),
      expires_at = _expires_at,
      connected_at = now(),
      health = 'healthy',
      failure_count = 0,
      last_error = NULL,
      updated_at = now()
  WHERE id = _connection_id
    AND user_id = _user_id
    AND service_id = _service_id
    AND status = 'pending';

  GET DIAGNOSTICS activated = ROW_COUNT;
  RETURN activated = 1;
END;
$$;

REVOKE ALL ON FUNCTION public.activate_verified_oauth_connection(uuid, uuid, text, text, text, text, timestamptz) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.activate_verified_oauth_connection(uuid, uuid, text, text, text, text, timestamptz) TO service_role;