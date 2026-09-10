-- Affiliate clicks: store a salted hash of the visitor IP, never the raw IP, and keep it server-side only
ALTER TABLE public.external_affiliate_clicks ADD COLUMN IF NOT EXISTS ip_hash text;
REVOKE SELECT ON public.external_affiliate_clicks FROM authenticated, anon;
GRANT SELECT (id, link_id, clicker_id, created_at) ON public.external_affiliate_clicks TO authenticated;
GRANT ALL ON public.external_affiliate_clicks TO service_role;

-- Stream chat: sanitize usernames and messages on write
CREATE OR REPLACE FUNCTION public.sanitize_stream_chat()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  NEW.username := left(btrim(regexp_replace(coalesce(NEW.username, 'Guest'), '[^A-Za-z0-9 _.\-]', '', 'g')), 32);
  IF NEW.username = '' THEN
    NEW.username := 'Guest';
  END IF;
  NEW.message := left(btrim(regexp_replace(coalesce(NEW.message, ''), '[\u0000-\u001F<>]', '', 'g')), 500);
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sanitize_stream_chat ON public.stream_chat_messages;
CREATE TRIGGER trg_sanitize_stream_chat
  BEFORE INSERT OR UPDATE ON public.stream_chat_messages
  FOR EACH ROW EXECUTE FUNCTION public.sanitize_stream_chat();