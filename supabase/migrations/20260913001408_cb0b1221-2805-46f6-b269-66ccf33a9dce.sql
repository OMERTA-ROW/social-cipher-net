-- 1. Canonical paid-plan check
CREATE OR REPLACE FUNCTION public.has_paid_plan(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_entitlements
    WHERE user_id = _user_id
      AND tier_key IN ('plus','pro')
      AND status = 'active'
      AND (current_period_end IS NULL OR current_period_end > now())
  )
$$;

REVOKE ALL ON FUNCTION public.has_paid_plan(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.has_paid_plan(uuid) TO authenticated, service_role;

-- 2. Normalise legacy "basis" entitlements onto "plus"
UPDATE public.user_entitlements e
SET tier_key = 'plus'
WHERE tier_key = 'basis'
  AND NOT EXISTS (
    SELECT 1 FROM public.user_entitlements p
    WHERE p.user_id = e.user_id AND p.tier_key = 'plus'
  );
DELETE FROM public.user_entitlements WHERE tier_key = 'basis';

-- 3. Plan catalogue: monthly + discounted yearly in one place
ALTER TABLE public.subscription_tiers
  ADD COLUMN IF NOT EXISTS price_cents_year integer,
  ADD COLUMN IF NOT EXISTS stripe_price_id_month text,
  ADD COLUMN IF NOT EXISTS stripe_price_id_year text,
  ADD COLUMN IF NOT EXISTS stripe_product_id text;

UPDATE public.subscription_tiers SET price_cents = 0, price_cents_year = 0 WHERE key = 'free';
UPDATE public.subscription_tiers
SET price_cents = 500, price_cents_year = 5000,
    stripe_price_id_month = 'price_1UF12zHTVeX8KHmEtfEZPJwH',
    stripe_price_id_year = 'price_1SS5WmHTVeX8KHmEy9i3Aokb',
    stripe_product_id = 'prod_TOtJnFseC54ChY'
WHERE key = 'plus';
UPDATE public.subscription_tiers
SET price_cents = 1000, price_cents_year = 10000,
    stripe_price_id_month = 'price_1UF133HTVeX8KHmEGT7pfoyJ',
    stripe_price_id_year = 'price_1SS5eQHTVeX8KHmExN8saFdg',
    stripe_product_id = 'prod_TOtRdMUKNeKkFc'
WHERE key = 'pro';
UPDATE public.subscription_tiers
SET price_cents_year = 800,
    stripe_price_id_year = 'price_1UEghyHTVeX8KHmENq6kMXeG',
    stripe_product_id = 'prod_VFB4e6LecHM4mM'
WHERE key = 'terminal';

-- 4. Paid-only monetization tables
DROP POLICY IF EXISTS "Affiliates can create links" ON public.affiliate_links;
DROP POLICY IF EXISTS "Affiliates can view their links" ON public.affiliate_links;
CREATE POLICY "Paid affiliates create links" ON public.affiliate_links
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = affiliate_user_id AND public.has_paid_plan(auth.uid()));
CREATE POLICY "Paid affiliates view links" ON public.affiliate_links
  FOR SELECT TO authenticated
  USING (auth.uid() = affiliate_user_id AND (public.has_paid_plan(auth.uid()) OR has_role(auth.uid(),'admin')));

DROP POLICY IF EXISTS "CyberPro users can create external links" ON public.external_affiliate_links;
DROP POLICY IF EXISTS "Owners and admins view affiliate links" ON public.external_affiliate_links;
DROP POLICY IF EXISTS "Users can update own external links" ON public.external_affiliate_links;
CREATE POLICY "Paid members create external links" ON public.external_affiliate_links
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id AND public.has_paid_plan(auth.uid()));
CREATE POLICY "Paid owners and admins view external links" ON public.external_affiliate_links
  FOR SELECT TO authenticated
  USING ((auth.uid() = user_id AND public.has_paid_plan(auth.uid())) OR has_role(auth.uid(),'admin'));
CREATE POLICY "Paid owners update external links" ON public.external_affiliate_links
  FOR UPDATE TO authenticated
  USING (auth.uid() = user_id AND public.has_paid_plan(auth.uid()))
  WITH CHECK (auth.uid() = user_id AND public.has_paid_plan(auth.uid()));

DROP POLICY IF EXISTS "Owners manage their networks" ON public.affiliate_networks;
CREATE POLICY "Paid owners manage their networks" ON public.affiliate_networks
  FOR ALL TO authenticated
  USING (user_id = auth.uid() AND public.has_paid_plan(auth.uid()))
  WITH CHECK (user_id = auth.uid() AND public.has_paid_plan(auth.uid()));

DROP POLICY IF EXISTS "Owners manage their kit" ON public.creator_media_kits;
CREATE POLICY "Paid owners manage their kit" ON public.creator_media_kits
  FOR ALL TO authenticated
  USING (user_id = auth.uid() AND public.has_paid_plan(auth.uid()))
  WITH CHECK (user_id = auth.uid() AND public.has_paid_plan(auth.uid()));

DROP POLICY IF EXISTS "Creators manage their deals" ON public.brand_deals;
CREATE POLICY "Paid creators manage their deals" ON public.brand_deals
  FOR ALL TO authenticated
  USING (creator_id = auth.uid() AND public.has_paid_plan(auth.uid()))
  WITH CHECK (creator_id = auth.uid() AND public.has_paid_plan(auth.uid()));

DROP POLICY IF EXISTS "Creators apply" ON public.campaign_applications;
CREATE POLICY "Paid creators apply" ON public.campaign_applications
  FOR INSERT TO authenticated
  WITH CHECK (creator_id = auth.uid() AND public.has_paid_plan(auth.uid()));

-- 5. Paid posts (pay-per-view / pay-per-click) require a paid plan
DROP POLICY IF EXISTS "Users can create own posts" ON public.posts;
DROP POLICY IF EXISTS "Users can update own posts" ON public.posts;
CREATE POLICY "Users can create own posts" ON public.posts
  FOR INSERT TO authenticated
  WITH CHECK (
    auth.uid() = user_id
    AND (COALESCE(monetization_type,'free') = 'free' OR public.has_paid_plan(auth.uid()))
  );
CREATE POLICY "Users can update own posts" ON public.posts
  FOR UPDATE TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (
    auth.uid() = user_id
    AND (COALESCE(monetization_type,'free') = 'free' OR public.has_paid_plan(auth.uid()))
  );