-- =====================================================================
-- Round 2 of the hardening pass: close the PUBLIC pseudo-role.
-- =====================================================================
-- A function created without an explicit grant list carries the implicit
-- "EXECUTE TO PUBLIC" entry, and every role - anon included - is a member of
-- PUBLIC. Revoking from named roles alone therefore left these reachable.
-- Each function is revoked from PUBLIC and handed back to exactly the roles
-- that call it. Verified callers: src/** and supabase/functions/**.

-- (1) Fired by the database itself; never called by the browser or an edge
--     function. calculate_mining_multiplier has no caller anywhere.
REVOKE EXECUTE ON FUNCTION
  public.log_stream_moderation(),
  public.sync_post_like_count(),
  public.sync_post_reply_count(),
  public.calculate_mining_multiplier(numeric)
FROM PUBLIC;

GRANT EXECUTE ON FUNCTION
  public.log_stream_moderation(),
  public.sync_post_like_count(),
  public.sync_post_reply_count(),
  public.calculate_mining_multiplier(numeric)
TO service_role;

-- (2) Fraud-pattern lookup: monitor-wallet-security runs it with the service
--     key, so no browser role needs it.
REVOKE EXECUTE ON FUNCTION
  public.detect_suspicious_activity(uuid, text, interval)
FROM PUBLIC;

GRANT EXECUTE ON FUNCTION
  public.detect_suspicious_activity(uuid, text, interval)
TO service_role;

-- (3) Helpers the row-level-security policies evaluate as the signed-in user,
--     plus the post-login reset in Auth.tsx. Signed-in only.
REVOKE EXECUTE ON FUNCTION
  public.has_role(uuid, public.app_role),
  public.is_dm_member(uuid, uuid),
  public.is_stream_admin(uuid, uuid),
  public.is_theater_member(uuid, uuid),
  public.clear_login_attempts(text)
FROM PUBLIC;

GRANT EXECUTE ON FUNCTION
  public.has_role(uuid, public.app_role),
  public.is_dm_member(uuid, uuid),
  public.is_stream_admin(uuid, uuid),
  public.is_theater_member(uuid, uuid),
  public.clear_login_attempts(text)
TO authenticated, service_role;

-- (4) Sign-in helpers: genuinely needed before a session exists, but stated
--     explicitly so the surface is intentional and reviewable.
REVOKE EXECUTE ON FUNCTION
  public.check_account_locked(text),
  public.record_failed_login(text)
FROM PUBLIC;

GRANT EXECUTE ON FUNCTION
  public.check_account_locked(text),
  public.record_failed_login(text)
TO anon, authenticated, service_role;

-- (5) Stop the pattern re-opening: functions added to this schema by the
--     migration role no longer inherit "EXECUTE TO PUBLIC".
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public
  REVOKE EXECUTE ON FUNCTIONS FROM PUBLIC;

ALTER DEFAULT PRIVILEGES IN SCHEMA public
  REVOKE EXECUTE ON FUNCTIONS FROM PUBLIC;
