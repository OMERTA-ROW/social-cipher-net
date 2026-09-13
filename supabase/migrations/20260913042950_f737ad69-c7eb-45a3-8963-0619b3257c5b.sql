-- =====================================================================
-- Security hardening: shrink the callable/queryable surface the scan flagged
-- =====================================================================
-- Nothing here changes table data. All changes are privilege/extension
-- level, and every one of them has been checked against what the app
-- actually calls (src/** and supabase/functions/**).

-- (1) The GraphQL API is unused: every data access in this project goes
--     through the REST Data API (supabase-js). pg_graphql publishes a
--     queryable schema for every table the caller's role can read, which is
--     what the 83 anon / 117 authenticated "object visible in GraphQL
--     schema" findings were. Dropping it removes that introspection surface
--     outright instead of asking for 200 contradictory grant changes.
DROP EXTENSION IF EXISTS pg_graphql;

-- (2) Superseded duplicate. get_platform_fee(text) is the audited,
--     authenticated-only replacement; platform_fee_percent(text) had no
--     callers anywhere in src/ or supabase/functions/.
DROP FUNCTION IF EXISTS public.platform_fee_percent(text);

-- (3) Trigger-only helpers. These are fired by the database itself; a
--     trigger does not need the invoking role to hold EXECUTE (already
--     proven in this project by guard_owner_column, log_security_event,
--     sync_post_like_count and enforce_participant_privileges, all of which
--     are service-role only and still fire correctly).
REVOKE EXECUTE ON FUNCTION
  public.bump_dm_thread(),
  public.credit_wallet_from_earning(),
  public.handle_new_user(),
  public.sanitize_stream_chat(),
  public.set_snipe_expiry(),
  public.update_mining_session_timestamp(),
  public.update_updated_at_column(),
  public.sync_post_repost_count()
FROM PUBLIC, anon, authenticated;

-- (4) Helpers with no caller in the browser or in any edge function that
--     runs with a user token. has_entitlement / is_user_adult / is_blocked
--     appear in no policy expression (verified against pg_policy), and
--     get_follower_count / get_total_views are called only by
--     check-qualifications, which authenticates with the service key.
REVOKE EXECUTE ON FUNCTION
  public.has_entitlement(uuid, text),
  public.is_user_adult(uuid),
  public.is_blocked(uuid, uuid),
  public.get_follower_count(uuid),
  public.get_total_views(uuid)
FROM PUBLIC, anon, authenticated;

-- (5) Private per-user lookups: signed-in only.
--     * profile_connections exposes which services a person has connected.
--       ConnectedPlatforms.tsx already degrades to "no icons" on error, so a
--       signed-out visitor simply sees an empty row.
--     * is_dm_member / is_stream_admin / is_theater_member / has_role appear
--       in policies evaluated by authenticated roles only (no anon policy
--       references them - verified against pg_policy).
--     * clear_login_attempts is called after signInWithPassword resolves,
--       when a session already exists; leaving it open to anon allowed
--       anyone to reset another account's lockout counter.
--     * get_ranked_feed powers the home feed, which redirects signed-out
--       visitors to /auth before it renders.
REVOKE EXECUTE ON FUNCTION
  public.profile_connections(uuid),
  public.is_dm_member(uuid, uuid),
  public.is_stream_admin(uuid, uuid),
  public.is_theater_member(uuid, uuid),
  public.has_role(uuid, public.app_role),
  public.clear_login_attempts(text),
  public.get_ranked_feed(integer, integer)
FROM anon;
