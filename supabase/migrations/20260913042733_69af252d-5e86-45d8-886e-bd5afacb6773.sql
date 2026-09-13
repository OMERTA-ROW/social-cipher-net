-- ============================================================
-- 1. Stream moderation flags move into an admin-only table
-- ============================================================
CREATE TABLE public.live_stream_moderation (
  stream_id UUID NOT NULL REFERENCES public.live_streams(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  is_muted BOOLEAN NOT NULL DEFAULT false,
  muted_by UUID REFERENCES auth.users(id),
  muted_at TIMESTAMP WITH TIME ZONE,
  is_blocked BOOLEAN NOT NULL DEFAULT false,
  blocked_by UUID REFERENCES auth.users(id),
  blocked_at TIMESTAMP WITH TIME ZONE,
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  PRIMARY KEY (stream_id, user_id)
);

CREATE INDEX live_stream_moderation_stream_idx ON public.live_stream_moderation(stream_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.live_stream_moderation TO authenticated;
GRANT ALL ON public.live_stream_moderation TO service_role;

ALTER TABLE public.live_stream_moderation ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Stream admins manage moderation"
ON public.live_stream_moderation
FOR ALL TO authenticated
USING (public.is_stream_admin(auth.uid(), stream_id))
WITH CHECK (public.is_stream_admin(auth.uid(), stream_id));

CREATE POLICY "Members view their own moderation"
ON public.live_stream_moderation
FOR SELECT TO authenticated
USING (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION public.log_stream_moderation()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  END IF;

  IF NEW.is_muted AND NOT COALESCE(OLD.is_muted, false) THEN
    PERFORM public.log_security_event(
      auth.uid(), 'stream_participant_muted', 'medium',
      jsonb_build_object('stream_id', NEW.stream_id, 'target_user_id', NEW.user_id, 'by', NEW.muted_by));
  ELSIF NOT NEW.is_muted AND COALESCE(OLD.is_muted, false) THEN
    PERFORM public.log_security_event(
      auth.uid(), 'stream_participant_unmuted', 'low',
      jsonb_build_object('stream_id', NEW.stream_id, 'target_user_id', NEW.user_id));
  END IF;

  IF NEW.is_blocked AND NOT COALESCE(OLD.is_blocked, false) THEN
    PERFORM public.log_security_event(
      auth.uid(), 'stream_participant_blocked', 'medium',
      jsonb_build_object('stream_id', NEW.stream_id, 'target_user_id', NEW.user_id, 'by', NEW.blocked_by));
  ELSIF NOT NEW.is_blocked AND COALESCE(OLD.is_blocked, false) THEN
    PERFORM public.log_security_event(
      auth.uid(), 'stream_participant_unblocked', 'low',
      jsonb_build_object('stream_id', NEW.stream_id, 'target_user_id', NEW.user_id));
  END IF;

  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_log_stream_moderation
BEFORE INSERT OR UPDATE ON public.live_stream_moderation
FOR EACH ROW EXECUTE FUNCTION public.log_stream_moderation();

REVOKE EXECUTE ON FUNCTION public.log_stream_moderation() FROM anon, authenticated;

INSERT INTO public.live_stream_moderation
  (stream_id, user_id, is_muted, muted_by, muted_at, is_blocked, blocked_by, blocked_at)
SELECT p.stream_id, p.user_id,
       COALESCE(p.is_muted, false), p.muted_by, p.muted_at,
       COALESCE(p.is_blocked, false), p.blocked_by, p.blocked_at
FROM public.live_stream_participants p
WHERE COALESCE(p.is_muted, false) OR COALESCE(p.is_blocked, false)
ON CONFLICT (stream_id, user_id) DO NOTHING;

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
    IF COALESCE(NEW.is_admin, false) OR COALESCE(NEW.is_host, false) THEN
      PERFORM public.log_security_event(
        auth.uid(),
        'stream_privilege_self_assign_blocked',
        'high',
        jsonb_build_object(
          'operation', 'INSERT',
          'stream_id', NEW.stream_id,
          'target_user_id', NEW.user_id,
          'attempted', jsonb_build_object('is_admin', NEW.is_admin, 'is_host', NEW.is_host)
        )
      );
    END IF;

    NEW.is_admin := false;
    NEW.is_host := false;
  ELSE
    attempted := jsonb_build_object();

    IF NEW.is_admin IS DISTINCT FROM OLD.is_admin THEN
      attempted := attempted || jsonb_build_object('is_admin', NEW.is_admin);
    END IF;
    IF NEW.is_host IS DISTINCT FROM OLD.is_host THEN
      attempted := attempted || jsonb_build_object('is_host', NEW.is_host);
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
    NEW.user_id := OLD.user_id;
    NEW.stream_id := OLD.stream_id;
  END IF;

  RETURN NEW;
END;
$$;

DROP INDEX IF EXISTS public.idx_stream_participants_blocked;

ALTER TABLE public.live_stream_participants
  DROP COLUMN IF EXISTS is_muted,
  DROP COLUMN IF EXISTS is_blocked,
  DROP COLUMN IF EXISTS muted_by,
  DROP COLUMN IF EXISTS blocked_by,
  DROP COLUMN IF EXISTS muted_at,
  DROP COLUMN IF EXISTS blocked_at;

COMMENT ON COLUMN public.live_stream_moderation.is_muted IS 'Whether the member is muted in this stream (host/admin only)';
COMMENT ON COLUMN public.live_stream_moderation.is_blocked IS 'Whether the member is blocked from this stream (host/admin only)';

-- ============================================================
-- 2. Saved radio playlists become owner-only
-- ============================================================
DROP POLICY IF EXISTS "Anyone can view saved playlists" ON public.profile_radio_playlists;

-- ============================================================
-- 3. Commission rates: admin-only table, scoped one-rate lookup
-- ============================================================
DROP POLICY IF EXISTS "Fee rates are readable" ON public.platform_fee_rates;

CREATE OR REPLACE FUNCTION public.get_platform_fee(_revenue_type text)
RETURNS numeric
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  rate numeric;
BEGIN
  SELECT percent INTO rate
  FROM public.platform_fee_rates
  WHERE revenue_type = _revenue_type;

  INSERT INTO public.security_audit_log (user_id, event_type, severity, metadata)
  VALUES (auth.uid(), 'platform_fee_rate_viewed', 'low',
          jsonb_build_object('revenue_type', _revenue_type));

  RETURN COALESCE(rate, 0);
END;
$$;

REVOKE ALL ON FUNCTION public.get_platform_fee(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_platform_fee(text) TO authenticated;