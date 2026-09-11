CREATE TABLE public.trading_layouts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  name TEXT NOT NULL,
  grid INTEGER NOT NULL DEFAULT 4,
  panes JSONB NOT NULL DEFAULT '[]'::jsonb,
  is_default BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.trading_layouts TO authenticated;
GRANT ALL ON public.trading_layouts TO service_role;
ALTER TABLE public.trading_layouts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own layouts" ON public.trading_layouts FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE TRIGGER trg_trading_layouts_updated BEFORE UPDATE ON public.trading_layouts
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE INDEX idx_trading_layouts_user ON public.trading_layouts(user_id);

CREATE TABLE public.trading_watchlists (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  name TEXT NOT NULL,
  symbols JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.trading_watchlists TO authenticated;
GRANT ALL ON public.trading_watchlists TO service_role;
ALTER TABLE public.trading_watchlists ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own watchlists" ON public.trading_watchlists FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE TRIGGER trg_trading_watchlists_updated BEFORE UPDATE ON public.trading_watchlists
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE INDEX idx_trading_watchlists_user ON public.trading_watchlists(user_id);

CREATE TABLE public.trading_audit_log (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  action TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'trading',
  details JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.trading_audit_log TO authenticated;
GRANT ALL ON public.trading_audit_log TO service_role;
ALTER TABLE public.trading_audit_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "read own trading audit" ON public.trading_audit_log FOR SELECT TO authenticated
  USING (auth.uid() = user_id);
CREATE POLICY "append own trading audit" ON public.trading_audit_log FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);
CREATE INDEX idx_trading_audit_user_time ON public.trading_audit_log(user_id, created_at DESC);