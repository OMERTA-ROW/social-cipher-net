-- RLS regression suite for stream participants and self-service update policies.
-- Run with the SQL runner (service role). Every check raises an exception on failure,
-- and the whole script rolls back so no test data is left behind.
--
--   BEGIN; \i supabase/tests/rls_regression.sql ROLLBACK;

DO $$
DECLARE
  owner_id uuid;
  attacker_id uuid;
  stream_id uuid;
  participant_id uuid;
  flag boolean;
  audit_count integer;
BEGIN
  -- Use two existing accounts (profiles/streams are foreign-keyed to auth users).
  SELECT id INTO owner_id FROM auth.users ORDER BY created_at LIMIT 1;
  SELECT id INTO attacker_id FROM auth.users WHERE id <> owner_id ORDER BY created_at LIMIT 1;
  IF owner_id IS NULL OR attacker_id IS NULL THEN
    RAISE EXCEPTION 'SKIP: this suite needs at least two accounts';
  END IF;

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
  SET is_admin = true, is_host = true
  WHERE id = participant_id;

  SELECT is_admin INTO flag FROM public.live_stream_participants WHERE id = participant_id;
  IF flag THEN
    RAISE EXCEPTION 'FAIL: viewer escalated to admin via UPDATE';
  END IF;

  -- 4. is_stream_admin() must not report the attacker as an admin.
  IF public.is_stream_admin(attacker_id, stream_id) THEN
    RAISE EXCEPTION 'FAIL: is_stream_admin() returned true for a normal viewer';
  END IF;

  -- 4b. Moderation state is its own table now. A normal viewer may not write
  --     it for anybody, not even for the stream owner.
  flag := false;
  BEGIN
    INSERT INTO public.live_stream_moderation (stream_id, user_id, is_muted, muted_by)
    VALUES (stream_id, owner_id, true, attacker_id);
    flag := true;
  EXCEPTION
    WHEN insufficient_privilege THEN flag := false;
  END;
  IF flag THEN
    RAISE EXCEPTION 'FAIL: a normal viewer was able to record moderation state';
  END IF;

  -- 5. The stream owner CAN grant admin.
  PERFORM set_config('request.jwt.claims', json_build_object('sub', owner_id, 'role', 'authenticated')::text, true);
  UPDATE public.live_stream_participants SET is_admin = true WHERE id = participant_id;
  SELECT is_admin INTO flag FROM public.live_stream_participants WHERE id = participant_id;
  IF NOT flag THEN
    RAISE EXCEPTION 'FAIL: stream owner could not grant admin';
  END IF;

  -- 5b. The promoted admin CAN record a mute, the row lands against the right
  --     person, and the decision is audited.
  PERFORM set_config('request.jwt.claims', json_build_object('sub', attacker_id, 'role', 'authenticated')::text, true);
  INSERT INTO public.live_stream_moderation (stream_id, user_id, is_muted, muted_by)
  VALUES (stream_id, owner_id, true, attacker_id);

  IF NOT (SELECT is_muted FROM public.live_stream_moderation
          WHERE live_stream_moderation.stream_id = stream_id
            AND live_stream_moderation.user_id = owner_id) THEN
    RAISE EXCEPTION 'FAIL: stream admin could not record a mute';
  END IF;

  SELECT count(*) INTO audit_count
  FROM public.security_audit_log
  WHERE event_type = 'stream_participant_muted'
    AND metadata->>'stream_id' = stream_id::text;
  IF audit_count < 1 THEN
    RAISE EXCEPTION 'FAIL: mute was not written to the audit log';
  END IF;

  -- 6. Ownership of a self-service record cannot be reassigned.
  UPDATE public.live_streams SET user_id = attacker_id WHERE id = stream_id;
  IF (SELECT user_id FROM public.live_streams WHERE id = stream_id) <> owner_id THEN
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
