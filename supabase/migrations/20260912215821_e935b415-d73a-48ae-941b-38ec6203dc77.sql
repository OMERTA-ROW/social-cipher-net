DROP POLICY IF EXISTS "Users can view active external links" ON public.external_affiliate_links;
CREATE POLICY "Owners and admins view affiliate links"
ON public.external_affiliate_links
FOR SELECT
TO authenticated
USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));

ALTER TABLE public.creator_earnings
  DROP CONSTRAINT IF EXISTS creator_earnings_earning_type_check,
  ALTER COLUMN post_id DROP NOT NULL,
  ADD COLUMN IF NOT EXISTS gross_amount numeric,
  ADD COLUMN IF NOT EXISTS platform_fee numeric,
  ADD COLUMN IF NOT EXISTS net_amount numeric,
  ADD COLUMN IF NOT EXISTS currency text NOT NULL DEFAULT 'USD';

UPDATE public.creator_earnings
SET gross_amount = COALESCE(gross_amount, amount),
    platform_fee = COALESCE(platform_fee, 0),
    net_amount = COALESCE(net_amount, amount)
WHERE gross_amount IS NULL OR platform_fee IS NULL OR net_amount IS NULL;

ALTER TABLE public.creator_earnings
  ALTER COLUMN gross_amount SET NOT NULL,
  ALTER COLUMN gross_amount SET DEFAULT 0,
  ALTER COLUMN platform_fee SET NOT NULL,
  ALTER COLUMN platform_fee SET DEFAULT 0,
  ALTER COLUMN net_amount SET NOT NULL,
  ALTER COLUMN net_amount SET DEFAULT 0;

ALTER TABLE public.platform_revenue
  ADD COLUMN IF NOT EXISTS gross_amount numeric,
  ADD COLUMN IF NOT EXISTS platform_fee numeric,
  ADD COLUMN IF NOT EXISTS net_amount numeric,
  ADD COLUMN IF NOT EXISTS external_reference text;

CREATE UNIQUE INDEX IF NOT EXISTS platform_revenue_external_reference_key
  ON public.platform_revenue (external_reference)
  WHERE external_reference IS NOT NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename = 'platform_revenue'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.platform_revenue;
  END IF;
END $$;