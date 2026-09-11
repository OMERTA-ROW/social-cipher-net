
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
    -- Revert the ownership column; the rest of the update still applies so the
    -- audit entry survives (an exception here would roll it back).
    EXECUTE format('SELECT ($1 #= hstore(%L, $2))', owner_col) INTO NEW USING NEW, old_owner;
  END IF;

  RETURN NEW;
END;
$$;
