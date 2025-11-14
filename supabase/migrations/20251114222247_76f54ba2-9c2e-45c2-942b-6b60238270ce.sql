-- Fix function search paths with CASCADE
DROP TRIGGER IF EXISTS update_mining_sessions_timestamp ON public.mining_sessions;
DROP FUNCTION IF EXISTS update_mining_session_timestamp() CASCADE;
DROP FUNCTION IF EXISTS calculate_mining_multiplier(NUMERIC);

CREATE OR REPLACE FUNCTION calculate_mining_multiplier(tokens_paid NUMERIC)
RETURNS NUMERIC
LANGUAGE plpgsql
IMMUTABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Linear scaling: 1x at 1 token, 100x at 100,000 tokens
  RETURN 1.0 + ((tokens_paid - 1) / 99999.0) * 99.0;
END;
$$;

CREATE OR REPLACE FUNCTION update_mining_session_timestamp()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER update_mining_sessions_timestamp
  BEFORE UPDATE ON public.mining_sessions
  FOR EACH ROW
  EXECUTE FUNCTION update_mining_session_timestamp();