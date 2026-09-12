-- Idempotency ledger for Stripe webhooks
CREATE TABLE public.stripe_webhook_events (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  event_id text NOT NULL UNIQUE,
  event_type text NOT NULL,
  processed_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT ALL ON public.stripe_webhook_events TO service_role;
ALTER TABLE public.stripe_webhook_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins can read webhook events"
  ON public.stripe_webhook_events FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- Reviewer attribution on the moderation queue
ALTER TABLE public.moderation_reviews
  ADD COLUMN IF NOT EXISTS reviewed_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS reviewed_at timestamptz,
  ADD COLUMN IF NOT EXISTS reviewer_note text;

-- Look up an account by email for server-side (service role) use only.
CREATE OR REPLACE FUNCTION public.user_id_for_email(_email text)
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT id FROM auth.users WHERE lower(email) = lower(_email) LIMIT 1;
$$;

REVOKE ALL ON FUNCTION public.user_id_for_email(text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.user_id_for_email(text) TO service_role;

-- Live updates for entitlement changes
ALTER TABLE public.user_entitlements REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.user_entitlements;