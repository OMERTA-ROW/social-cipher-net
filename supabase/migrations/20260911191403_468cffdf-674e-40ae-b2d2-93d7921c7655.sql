
-- Central helper for writing audit entries from triggers
CREATE OR REPLACE FUNCTION public.log_security_event(
  _user_id uuid,
  _event_type text,
  _severity text,
  _metadata jsonb
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.security_audit_log (user_id, event_type, severity, metadata)
  VALUES (_user_id, _event_type, _severity, _metadata);
END;
$$;

-- Participant privilege trigger now audits blocked escalation attempts
CREATE OR REPLACE FUNCTION public.enforce_participant_privileges()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  privileged boolean;
  attempted jsonb;
BEGIN
  privileged := public.is_stream_owner(auth.uid(), NEW.stream_id)
             OR public.is_stream_admin(auth.uid(), NEW.stream_id);

  IF privileged THEN
    RETURN NEW;
  END IF;

  IF TG_OP = 'INSERT' THEN
    IF COALESCE(NEW.is_admin, false) OR COALESCE(NEW.is_host, false)
       OR COALESCE(NEW.is_muted, false) OR COALESCE(NEW.is_blocked, false) THEN
      PERFORM public.log_security_event(
        auth.uid(),
        'stream_privilege_self_assign_blocked',
        'high',
        jsonb_build_object(
          'operation', 'INSERT',
          'stream_id', NEW.stream_id,
          'target_user_id', NEW.user_id,
          'attempted', jsonb_build_object(
            'is_admin', NEW.is_admin, 'is_host', NEW.is_host,
            'is_muted', NEW.is_muted, 'is_blocked', NEW.is_blocked)
        )
      );
    END IF;

    NEW.is_admin := false;
    NEW.is_host := false;
    NEW.is_muted := false;
    NEW.is_blocked := false;
  ELSE
    attempted := jsonb_build_object();

    IF NEW.is_admin IS DISTINCT FROM OLD.is_admin THEN
      attempted := attempted || jsonb_build_object('is_admin', NEW.is_admin);
    END IF;
    IF NEW.is_host IS DISTINCT FROM OLD.is_host THEN
      attempted := attempted || jsonb_build_object('is_host', NEW.is_host);
    END IF;
    IF NEW.is_muted IS DISTINCT FROM OLD.is_muted THEN
      attempted := attempted || jsonb_build_object('is_muted', NEW.is_muted);
    END IF;
    IF NEW.is_blocked IS DISTINCT FROM OLD.is_blocked THEN
      attempted := attempted || jsonb_build_object('is_blocked', NEW.is_blocked);
    END IF;
    IF NEW.user_id IS DISTINCT FROM OLD.user_id THEN
      attempted := attempted || jsonb_build_object('user_id', NEW.user_id);
    END IF;
    IF NEW.stream_id IS DISTINCT FROM OLD.stream_id THEN
      attempted := attempted || jsonb_build_object('stream_id', NEW.stream_id);
    END IF;

    IF attempted <> jsonb_build_object() THEN
      PERFORM public.log_security_event(
        auth.uid(),
        'stream_privilege_self_assign_blocked',
        'high',
        jsonb_build_object(
          'operation', 'UPDATE',
          'stream_id', OLD.stream_id,
          'participant_id', OLD.id,
          'attempted', attempted
        )
      );
    END IF;

    NEW.is_admin := OLD.is_admin;
    NEW.is_host := OLD.is_host;
    NEW.is_muted := OLD.is_muted;
    NEW.is_blocked := OLD.is_blocked;
    NEW.user_id := OLD.user_id;
    NEW.stream_id := OLD.stream_id;
  END IF;

  RETURN NEW;
END;
$$;

-- Generic guard: block + audit ownership reassignment on user-owned tables
CREATE OR REPLACE FUNCTION public.guard_owner_column()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  owner_col text := TG_ARGV[0];
  old_owner text;
  new_owner text;
BEGIN
  EXECUTE format('SELECT ($1).%I::text, ($2).%I::text', owner_col, owner_col)
    INTO old_owner, new_owner
    USING OLD, NEW;

  IF new_owner IS DISTINCT FROM old_owner THEN
    PERFORM public.log_security_event(
      auth.uid(),
      'protected_record_owner_change_blocked',
      'high',
      jsonb_build_object(
        'table', TG_TABLE_NAME,
        'owner_column', owner_col,
        'from', old_owner,
        'to', new_owner
      )
    );
    RAISE EXCEPTION 'Changing % on % is not allowed', owner_col, TG_TABLE_NAME;
  END IF;

  RETURN NEW;
END;
$$;

DO $$
DECLARE
  t record;
BEGIN
  FOR t IN
    SELECT * FROM (VALUES
      ('live_streams', 'user_id'),
      ('seller_profiles', 'user_id'),
      ('products', 'seller_id'),
      ('platform_connections', 'user_id'),
      ('privacy_settings', 'user_id'),
      ('crypto_wallets', 'user_id'),
      ('external_affiliate_links', 'user_id'),
      ('trading_accounts', 'user_id'),
      ('external_mining_accounts', 'user_id'),
      ('user_saved_tabs', 'user_id')
    ) AS v(tbl, col)
  LOOP
    EXECUTE format('DROP TRIGGER IF EXISTS trg_guard_owner_%I ON public.%I', t.tbl, t.tbl);
    EXECUTE format(
      'CREATE TRIGGER trg_guard_owner_%I BEFORE UPDATE ON public.%I
       FOR EACH ROW EXECUTE FUNCTION public.guard_owner_column(%L)',
      t.tbl, t.tbl, t.col
    );
  END LOOP;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.log_security_event(uuid, text, text, jsonb) FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.guard_owner_column() FROM anon, authenticated;
