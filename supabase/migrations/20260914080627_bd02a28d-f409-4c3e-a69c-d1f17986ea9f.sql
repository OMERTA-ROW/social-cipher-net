
ALTER TABLE public.user_connections
  ADD COLUMN IF NOT EXISTS account_key text NOT NULL DEFAULT 'default',
  ADD COLUMN IF NOT EXISTS account_label text,
  ADD COLUMN IF NOT EXISTS is_active_account boolean NOT NULL DEFAULT true;

ALTER TABLE public.user_connections
  DROP CONSTRAINT IF EXISTS user_connections_user_id_service_id_key;

CREATE UNIQUE INDEX IF NOT EXISTS user_connections_account_key
  ON public.user_connections (user_id, service_id, account_key);

CREATE UNIQUE INDEX IF NOT EXISTS user_connections_one_active_account
  ON public.user_connections (user_id, service_id)
  WHERE is_active_account;

ALTER TABLE public.trading_accounts
  ADD COLUMN IF NOT EXISTS account_label text,
  ADD COLUMN IF NOT EXISTS is_active_account boolean NOT NULL DEFAULT false;

CREATE UNIQUE INDEX IF NOT EXISTS trading_accounts_one_active_account
  ON public.trading_accounts (user_id, platform_name)
  WHERE is_active_account;

CREATE TABLE IF NOT EXISTS public.fee_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  category text NOT NULL CHECK (category IN ('exchange','wallet','bank')),
  operation text NOT NULL,
  rail text,
  asset text,
  currency text NOT NULL DEFAULT 'USD',
  percent_bps integer CHECK (percent_bps IS NULL OR (percent_bps >= 0 AND percent_bps <= 10000)),
  fixed_minor bigint CHECK (fixed_minor IS NULL OR fixed_minor >= 0),
  min_fee_minor bigint CHECK (min_fee_minor IS NULL OR min_fee_minor >= 0),
  max_fee_minor bigint CHECK (max_fee_minor IS NULL OR max_fee_minor >= 0),
  payer text NOT NULL DEFAULT 'sender' CHECK (payer IN ('sender','receiver','platform')),
  minor_unit_scale integer NOT NULL DEFAULT 2 CHECK (minor_unit_scale BETWEEN 0 AND 18),
  quote_ttl_seconds integer NOT NULL DEFAULT 60 CHECK (quote_ttl_seconds BETWEEN 5 AND 3600),
  is_configured boolean NOT NULL DEFAULT false,
  is_active boolean NOT NULL DEFAULT false,
  effective_from timestamptz,
  provider_id text,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT fee_settings_configured_requires_values CHECK (
    NOT is_configured
    OR (percent_bps IS NOT NULL AND fixed_minor IS NOT NULL AND effective_from IS NOT NULL)
  ),
  CONSTRAINT fee_settings_active_requires_configured CHECK (NOT is_active OR is_configured),
  CONSTRAINT fee_settings_max_above_min CHECK (
    max_fee_minor IS NULL OR min_fee_minor IS NULL OR max_fee_minor >= min_fee_minor
  )
);

CREATE UNIQUE INDEX IF NOT EXISTS fee_settings_rule_key
  ON public.fee_settings (category, operation, COALESCE(rail,''), COALESCE(asset,''), currency);

GRANT SELECT ON public.fee_settings TO authenticated;
GRANT ALL ON public.fee_settings TO service_role;
ALTER TABLE public.fee_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Signed-in members read fee rules"
  ON public.fee_settings FOR SELECT TO authenticated USING (true);

CREATE POLICY "Admins manage fee rules"
  ON public.fee_settings FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER fee_settings_set_updated_at
  BEFORE UPDATE ON public.fee_settings
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE IF NOT EXISTS public.exchange_quotes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  category text NOT NULL CHECK (category IN ('exchange','wallet','bank')),
  operation text NOT NULL,
  rail text,
  asset text,
  currency text NOT NULL,
  minor_unit_scale integer NOT NULL DEFAULT 2,
  amount_minor bigint NOT NULL CHECK (amount_minor > 0),
  platform_fee_minor bigint NOT NULL DEFAULT 0,
  provider_fee_minor bigint NOT NULL DEFAULT 0,
  network_fee_minor bigint NOT NULL DEFAULT 0,
  total_minor bigint NOT NULL,
  net_received_minor bigint NOT NULL,
  payer text NOT NULL,
  breakdown jsonb NOT NULL DEFAULT '{}'::jsonb,
  status text NOT NULL DEFAULT 'quoted' CHECK (status IN ('quoted','expired','cancelled')),
  expires_at timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.exchange_quotes TO authenticated;
GRANT ALL ON public.exchange_quotes TO service_role;
ALTER TABLE public.exchange_quotes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members read their own quotes"
  ON public.exchange_quotes FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS exchange_quotes_user_created
  ON public.exchange_quotes (user_id, created_at DESC);
