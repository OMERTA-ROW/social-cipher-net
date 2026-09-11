-- RLS regression suite for stream participants and self-service update policies.
-- Run with the SQL runner (service role). Every check raises an exception on failure,
-- and the whole script rolls back so no test data is left behind.
--
--   BEGIN; \i supabase/tests/rls_regression.sql ROLLBACK;

DO $$
DECLARE
  owner_id uuid := gen_random_uuid();
  attacker_id uuid := gen_random_uuid();
  stream_id uuid;
  participant_id uuid;
  flag boolean;
  audit_count integer;
  failed boolean;
BEGIN
  -- Seed: two profiles and a live stream owned by owner_id.
  INSERT INTO public.profiles (id, username, display_name)
  VALUES (owner_id, 'rls_owner_' || left(owner_id::text, 8), 'RLS Owner'),
         (attacker_id, 'rls_attacker_' || left(attacker_id::text, 8), 'RLS Attacker');

  INSERT INTO public.live_streams (user_id, title, is_live)
  VALUES (owner_id, 'RLS regression stream', true)
  RETURNING id INTO stream_id;

  -- 1. A normal viewer cannot join as admin/host.
  PERFORM set_config('request.jwt.claims', json_build_object('sub', attacker_id, 'role', 'authenticated')::text, true);

  INSERT INTO public.live_stream_participants (stream_id, user_id, is_admin, is_host, is_active)
  VALUES (stream_id, attacker_id, true, true, true)
  RETURNING id, is_admin INTO participant_id, flag;

  IF flag THEN
    RAISE EXCEPTION 'FAIL: viewer was able to insert themselves as stream admin';
  END IF;

  -- 2. The blocked attempt is audited.
  SELECT count(*) INTO audit_count
  FROM public.security_audit_log
  WHERE user_id = attacker_id AND event_type = 'stream_privilege_self_assign_blocked';
  IF audit_count < 1 THEN
    RAISE EXCEPTION 'FAIL: escalation attempt was not written to the audit log';
  END IF;

  -- 3. A viewer cannot promote themselves afterwards either.
  UPDATE public.live_stream_participants
  SET is_admin = true, is_host = true, is_muted = false
  WHERE id = participant_id;

  SELECT is_admin INTO flag FROM public.live_stream_participants WHERE id = participant_id;
  IF flag THEN
    RAISE EXCEPTION 'FAIL: viewer escalated to admin via UPDATE';
  END IF;

  -- 4. is_stream_admin() must not report the attacker as an admin.
  IF public.is_stream_admin(attacker_id, stream_id) THEN
    RAISE EXCEPTION 'FAIL: is_stream_admin() returned true for a normal viewer';
  END IF;

  -- 5. The stream owner CAN grant admin.
  PERFORM set_config('request.jwt.claims', json_build_object('sub', owner_id, 'role', 'authenticated')::text, true);
  UPDATE public.live_stream_participants SET is_admin = true WHERE id = participant_id;
  SELECT is_admin INTO flag FROM public.live_stream_participants WHERE id = participant_id;
  IF NOT flag THEN
    RAISE EXCEPTION 'FAIL: stream owner could not grant admin';
  END IF;

  -- 6. Ownership of a self-service record cannot be reassigned.
  failed := false;
  BEGIN
    UPDATE public.live_streams SET user_id = attacker_id WHERE id = stream_id;
  EXCEPTION WHEN others THEN
    failed := true;
  END;
  IF NOT failed THEN
    RAISE EXCEPTION 'FAIL: live_streams ownership could be reassigned';
  END IF;

  SELECT count(*) INTO audit_count
  FROM public.security_audit_log
  WHERE event_type = 'protected_record_owner_change_blocked';
  IF audit_count < 1 THEN
    RAISE EXCEPTION 'FAIL: ownership-change attempt was not audited';
  END IF;

  -- 7. Every self-service UPDATE/ALL policy has an explicit WITH CHECK.
  IF EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND cmd IN ('UPDATE', 'ALL')
      AND with_check IS NULL
      AND tablename IN (
        'seller_profiles','products','live_streams','platform_connections','privacy_settings',
        'crypto_wallets','external_affiliate_links','trading_accounts','external_mining_accounts',
        'user_saved_tabs','live_stream_participants')
  ) THEN
    RAISE EXCEPTION 'FAIL: a self-service UPDATE/ALL policy is missing WITH CHECK';
  END IF;

  RAISE NOTICE 'ALL RLS REGRESSION CHECKS PASSED';
END;
$$;
