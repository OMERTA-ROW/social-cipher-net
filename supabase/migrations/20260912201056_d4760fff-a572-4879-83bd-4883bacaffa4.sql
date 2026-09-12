
-- ========== Affiliate links ==========
ALTER TABLE public.external_affiliate_links
  ADD COLUMN IF NOT EXISTS short_code text UNIQUE,
  ADD COLUMN IF NOT EXISTS conversion_count integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS earnings numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS post_id uuid REFERENCES public.posts(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS product_id uuid REFERENCES public.products(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS network text;

UPDATE public.external_affiliate_links
SET short_code = encode(gen_random_bytes(5), 'hex')
WHERE short_code IS NULL;

CREATE TABLE IF NOT EXISTS public.affiliate_conversions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  link_id uuid NOT NULL REFERENCES public.external_affiliate_links(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  gross_amount numeric NOT NULL DEFAULT 0,
  commission_amount numeric NOT NULL DEFAULT 0,
  platform_fee numeric NOT NULL DEFAULT 0,
  net_amount numeric NOT NULL DEFAULT 0,
  currency text NOT NULL DEFAULT 'USD',
  source text NOT NULL DEFAULT 'onplatform',
  status text NOT NULL DEFAULT 'pending',
  external_id text,
  occurred_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.affiliate_conversions TO authenticated;
GRANT ALL ON public.affiliate_conversions TO service_role;
ALTER TABLE public.affiliate_conversions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Owners read their conversions" ON public.affiliate_conversions
  FOR SELECT TO authenticated USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));

CREATE TABLE IF NOT EXISTS public.affiliate_networks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  network text NOT NULL,
  account_label text,
  status text NOT NULL DEFAULT 'connected',
  last_synced_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, network)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.affiliate_networks TO authenticated;
GRANT ALL ON public.affiliate_networks TO service_role;
ALTER TABLE public.affiliate_networks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Owners manage their networks" ON public.affiliate_networks
  FOR ALL TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

CREATE TABLE IF NOT EXISTS public.affiliate_network_secrets (
  network_id uuid PRIMARY KEY REFERENCES public.affiliate_networks(id) ON DELETE CASCADE,
  api_key_encrypted text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT ALL ON public.affiliate_network_secrets TO service_role;
ALTER TABLE public.affiliate_network_secrets ENABLE ROW LEVEL SECURITY;

-- ========== Brand deals ==========
CREATE TABLE IF NOT EXISTS public.creator_media_kits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  slug text NOT NULL UNIQUE,
  headline text,
  bio text,
  niche text,
  contact_email text,
  rate_card jsonb NOT NULL DEFAULT '[]'::jsonb,
  is_public boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.creator_media_kits TO authenticated;
GRANT SELECT ON public.creator_media_kits TO anon;
GRANT ALL ON public.creator_media_kits TO service_role;
ALTER TABLE public.creator_media_kits ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public kits are viewable" ON public.creator_media_kits
  FOR SELECT USING (is_public OR user_id = auth.uid());
CREATE POLICY "Owners manage their kit" ON public.creator_media_kits
  FOR ALL TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

CREATE TABLE IF NOT EXISTS public.brand_campaigns (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  brand_user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  brand_name text NOT NULL,
  title text NOT NULL,
  description text,
  niche text,
  budget numeric,
  currency text NOT NULL DEFAULT 'USD',
  min_followers integer NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'open',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.brand_campaigns TO authenticated;
GRANT ALL ON public.brand_campaigns TO service_role;
ALTER TABLE public.brand_campaigns ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Open campaigns are viewable" ON public.brand_campaigns
  FOR SELECT TO authenticated USING (status = 'open' OR brand_user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Brands manage their campaigns" ON public.brand_campaigns
  FOR ALL TO authenticated USING (brand_user_id = auth.uid()) WITH CHECK (brand_user_id = auth.uid());

CREATE TABLE IF NOT EXISTS public.campaign_applications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id uuid NOT NULL REFERENCES public.brand_campaigns(id) ON DELETE CASCADE,
  creator_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  message text,
  proposed_rate numeric,
  status text NOT NULL DEFAULT 'submitted',
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (campaign_id, creator_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.campaign_applications TO authenticated;
GRANT ALL ON public.campaign_applications TO service_role;
ALTER TABLE public.campaign_applications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Creators and brands read applications" ON public.campaign_applications
  FOR SELECT TO authenticated USING (
    creator_id = auth.uid()
    OR EXISTS (SELECT 1 FROM public.brand_campaigns c WHERE c.id = campaign_id AND c.brand_user_id = auth.uid())
  );
CREATE POLICY "Creators apply" ON public.campaign_applications
  FOR INSERT TO authenticated WITH CHECK (creator_id = auth.uid());
CREATE POLICY "Creators withdraw" ON public.campaign_applications
  FOR DELETE TO authenticated USING (creator_id = auth.uid());
CREATE POLICY "Brands update applications" ON public.campaign_applications
  FOR UPDATE TO authenticated USING (
    EXISTS (SELECT 1 FROM public.brand_campaigns c WHERE c.id = campaign_id AND c.brand_user_id = auth.uid())
  );

CREATE TABLE IF NOT EXISTS public.brand_deals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  creator_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  brand_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  campaign_id uuid REFERENCES public.brand_campaigns(id) ON DELETE SET NULL,
  brand_name text NOT NULL,
  title text NOT NULL,
  amount numeric NOT NULL DEFAULT 0,
  currency text NOT NULL DEFAULT 'USD',
  platform_fee numeric NOT NULL DEFAULT 0,
  net_amount numeric NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'offer_received',
  notes text,
  paid_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.brand_deals TO authenticated;
GRANT ALL ON public.brand_deals TO service_role;
ALTER TABLE public.brand_deals ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Deal parties read" ON public.brand_deals
  FOR SELECT TO authenticated USING (creator_id = auth.uid() OR brand_user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Creators manage their deals" ON public.brand_deals
  FOR ALL TO authenticated USING (creator_id = auth.uid()) WITH CHECK (creator_id = auth.uid());

ALTER TABLE public.posts
  ADD COLUMN IF NOT EXISTS is_sponsored boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS sponsor_name text,
  ADD COLUMN IF NOT EXISTS affiliate_link_id uuid REFERENCES public.external_affiliate_links(id) ON DELETE SET NULL;

-- ========== Advertising ==========
CREATE TABLE IF NOT EXISTS public.ad_advertisers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  company_name text NOT NULL,
  contact_email text,
  website text,
  status text NOT NULL DEFAULT 'active',
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.ad_advertisers TO authenticated;
GRANT ALL ON public.ad_advertisers TO service_role;
ALTER TABLE public.ad_advertisers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Advertisers manage own record" ON public.ad_advertisers
  FOR ALL TO authenticated USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin')) WITH CHECK (user_id = auth.uid());

CREATE TABLE IF NOT EXISTS public.ad_campaigns (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  advertiser_id uuid NOT NULL REFERENCES public.ad_advertisers(id) ON DELETE CASCADE,
  name text NOT NULL,
  placements text[] NOT NULL DEFAULT ARRAY['feed']::text[],
  interests text[] NOT NULL DEFAULT ARRAY[]::text[],
  min_audience integer NOT NULL DEFAULT 0,
  budget_cents integer NOT NULL DEFAULT 0,
  spent_cents integer NOT NULL DEFAULT 0,
  cpc_cents integer NOT NULL DEFAULT 0,
  cpm_cents integer NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'draft',
  starts_at timestamptz,
  ends_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.ad_campaigns TO authenticated;
GRANT ALL ON public.ad_campaigns TO service_role;
ALTER TABLE public.ad_campaigns ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Advertisers manage their campaigns" ON public.ad_campaigns
  FOR ALL TO authenticated USING (
    EXISTS (SELECT 1 FROM public.ad_advertisers a WHERE a.id = advertiser_id AND a.user_id = auth.uid())
    OR public.has_role(auth.uid(), 'admin')
  ) WITH CHECK (
    EXISTS (SELECT 1 FROM public.ad_advertisers a WHERE a.id = advertiser_id AND a.user_id = auth.uid())
  );
CREATE POLICY "Running campaigns are readable" ON public.ad_campaigns
  FOR SELECT TO authenticated USING (status = 'running');

CREATE TABLE IF NOT EXISTS public.ad_creatives (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id uuid NOT NULL REFERENCES public.ad_campaigns(id) ON DELETE CASCADE,
  headline text NOT NULL,
  body text,
  image_url text,
  cta_label text NOT NULL DEFAULT 'Learn more',
  cta_url text NOT NULL,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.ad_creatives TO authenticated;
GRANT ALL ON public.ad_creatives TO service_role;
ALTER TABLE public.ad_creatives ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Creatives of running campaigns are readable" ON public.ad_creatives
  FOR SELECT TO authenticated USING (
    is_active AND EXISTS (SELECT 1 FROM public.ad_campaigns c WHERE c.id = campaign_id AND c.status = 'running')
  );
CREATE POLICY "Advertisers manage their creatives" ON public.ad_creatives
  FOR ALL TO authenticated USING (
    EXISTS (
      SELECT 1 FROM public.ad_campaigns c JOIN public.ad_advertisers a ON a.id = c.advertiser_id
      WHERE c.id = campaign_id AND a.user_id = auth.uid()
    ) OR public.has_role(auth.uid(), 'admin')
  ) WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.ad_campaigns c JOIN public.ad_advertisers a ON a.id = c.advertiser_id
      WHERE c.id = campaign_id AND a.user_id = auth.uid()
    )
  );

CREATE TABLE IF NOT EXISTS public.ad_impressions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  creative_id uuid NOT NULL REFERENCES public.ad_creatives(id) ON DELETE CASCADE,
  campaign_id uuid NOT NULL REFERENCES public.ad_campaigns(id) ON DELETE CASCADE,
  viewer_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  placement text NOT NULL DEFAULT 'feed',
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT INSERT ON public.ad_impressions TO authenticated;
GRANT SELECT ON public.ad_impressions TO authenticated;
GRANT ALL ON public.ad_impressions TO service_role;
ALTER TABLE public.ad_impressions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Viewers log impressions" ON public.ad_impressions
  FOR INSERT TO authenticated WITH CHECK (viewer_id = auth.uid());
CREATE POLICY "Owners read impressions" ON public.ad_impressions
  FOR SELECT TO authenticated USING (
    public.has_role(auth.uid(), 'admin')
    OR EXISTS (
      SELECT 1 FROM public.ad_campaigns c JOIN public.ad_advertisers a ON a.id = c.advertiser_id
      WHERE c.id = campaign_id AND a.user_id = auth.uid()
    )
  );

CREATE TABLE IF NOT EXISTS public.ad_clicks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  creative_id uuid NOT NULL REFERENCES public.ad_creatives(id) ON DELETE CASCADE,
  campaign_id uuid NOT NULL REFERENCES public.ad_campaigns(id) ON DELETE CASCADE,
  viewer_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  placement text NOT NULL DEFAULT 'feed',
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT INSERT, SELECT ON public.ad_clicks TO authenticated;
GRANT ALL ON public.ad_clicks TO service_role;
ALTER TABLE public.ad_clicks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Viewers log clicks" ON public.ad_clicks
  FOR INSERT TO authenticated WITH CHECK (viewer_id = auth.uid());
CREATE POLICY "Owners read clicks" ON public.ad_clicks
  FOR SELECT TO authenticated USING (
    public.has_role(auth.uid(), 'admin')
    OR EXISTS (
      SELECT 1 FROM public.ad_campaigns c JOIN public.ad_advertisers a ON a.id = c.advertiser_id
      WHERE c.id = campaign_id AND a.user_id = auth.uid()
    )
  );

-- ========== Platform fees & revenue ==========
CREATE TABLE IF NOT EXISTS public.platform_fee_rates (
  revenue_type text PRIMARY KEY,
  percent numeric NOT NULL DEFAULT 0,
  updated_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.platform_fee_rates TO authenticated;
GRANT ALL ON public.platform_fee_rates TO service_role;
ALTER TABLE public.platform_fee_rates ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Fee rates are readable" ON public.platform_fee_rates
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins set fee rates" ON public.platform_fee_rates
  FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

INSERT INTO public.platform_fee_rates (revenue_type, percent) VALUES
  ('gifts', 20), ('tips', 10), ('creator_subscriptions', 15),
  ('shop_sales', 8), ('affiliate_conversions', 10)
ON CONFLICT (revenue_type) DO NOTHING;

CREATE TABLE IF NOT EXISTS public.platform_revenue (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source text NOT NULL,
  amount numeric NOT NULL DEFAULT 0,
  currency text NOT NULL DEFAULT 'USD',
  reference_type text,
  reference_id uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.platform_revenue TO authenticated;
GRANT ALL ON public.platform_revenue TO service_role;
ALTER TABLE public.platform_revenue ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins read platform revenue" ON public.platform_revenue
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));

CREATE OR REPLACE FUNCTION public.platform_fee_percent(_revenue_type text)
RETURNS numeric LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT COALESCE((SELECT percent FROM public.platform_fee_rates WHERE revenue_type = _revenue_type), 0);
$$;

CREATE TRIGGER set_media_kit_updated_at BEFORE UPDATE ON public.creator_media_kits
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER set_brand_campaign_updated_at BEFORE UPDATE ON public.brand_campaigns
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER set_brand_deal_updated_at BEFORE UPDATE ON public.brand_deals
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER set_ad_campaign_updated_at BEFORE UPDATE ON public.ad_campaigns
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
