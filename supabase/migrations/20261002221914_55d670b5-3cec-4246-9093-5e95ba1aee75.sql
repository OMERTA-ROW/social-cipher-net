CREATE OR REPLACE FUNCTION public.activate_verified_oauth_connection(
  _connection_id uuid, _user_id uuid, _service_id text, _provider_account_id text,
  _account_name text, _account_handle text, _expires_at timestamptz
)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  activated integer;
  was_active boolean := false;
  other_active boolean := false;
BEGIN
  IF _provider_account_id IS NULL OR btrim(_provider_account_id) = '' THEN
    RAISE EXCEPTION 'Provider identity is required';
  END IF;

  -- lock this user's rows for the service (no aggregate with FOR UPDATE)
  PERFORM 1 FROM public.user_connections
  WHERE user_id = _user_id AND service_id = _service_id
  FOR UPDATE;

  SELECT EXISTS (
    SELECT 1 FROM public.user_connections
    WHERE user_id = _user_id AND service_id = _service_id
      AND provider_account_id = _provider_account_id
      AND status = 'connected' AND is_active_account
  ) INTO was_active;

  SELECT EXISTS (
    SELECT 1 FROM public.user_connections
    WHERE user_id = _user_id AND service_id = _service_id
      AND provider_account_id IS DISTINCT FROM _provider_account_id
      AND status = 'connected' AND is_active_account
  ) INTO other_active;

  UPDATE public.user_connections
  SET status = 'disconnected', is_active_account = false, health = 'replaced', updated_at = now()
  WHERE user_id = _user_id AND service_id = _service_id
    AND provider_account_id = _provider_account_id
    AND status = 'connected' AND id <> _connection_id;

  UPDATE public.user_connections
  SET status = 'connected',
      provider_account_id = _provider_account_id,
      account_name = NULLIF(left(_account_name, 255), ''),
      account_handle = NULLIF(left(_account_handle, 255), ''),
      is_active_account = (was_active OR NOT other_active),
      expires_at = _expires_at,
      connected_at = now(),
      health = 'healthy', failure_count = 0, last_error = NULL, updated_at = now()
  WHERE id = _connection_id AND user_id = _user_id
    AND service_id = _service_id AND status = 'pending';

  GET DIAGNOSTICS activated = ROW_COUNT;
  IF activated <> 1 THEN
    RAISE EXCEPTION 'Pending OAuth connection could not be activated';
  END IF;
  RETURN true;
END;
$$;

REVOKE ALL ON FUNCTION public.activate_verified_oauth_connection(uuid, uuid, text, text, text, text, timestamptz) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.activate_verified_oauth_connection(uuid, uuid, text, text, text, text, timestamptz) TO service_role;