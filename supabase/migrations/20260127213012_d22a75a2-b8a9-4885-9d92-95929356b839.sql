-- Create table to track failed login attempts
CREATE TABLE public.login_attempts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  email TEXT NOT NULL,
  attempt_count INTEGER NOT NULL DEFAULT 1,
  last_attempt_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  locked_until TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create unique index on email for upsert operations
CREATE UNIQUE INDEX idx_login_attempts_email ON public.login_attempts(email);

-- Create index for cleanup queries
CREATE INDEX idx_login_attempts_locked_until ON public.login_attempts(locked_until);

-- Enable RLS
ALTER TABLE public.login_attempts ENABLE ROW LEVEL SECURITY;

-- Policy for service role to manage login attempts (edge functions)
CREATE POLICY "Service can manage login attempts"
ON public.login_attempts
FOR ALL
USING (true)
WITH CHECK (true);

-- Function to record failed login attempt
CREATE OR REPLACE FUNCTION public.record_failed_login(p_email TEXT)
RETURNS TABLE(is_locked BOOLEAN, attempts INTEGER, unlock_time TIMESTAMP WITH TIME ZONE)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_attempt_count INTEGER;
  v_locked_until TIMESTAMP WITH TIME ZONE;
  v_max_attempts INTEGER := 6;
  v_lockout_duration INTERVAL := '30 minutes';
BEGIN
  -- Insert or update login attempt record
  INSERT INTO login_attempts (email, attempt_count, last_attempt_at, updated_at)
  VALUES (p_email, 1, now(), now())
  ON CONFLICT (email)
  DO UPDATE SET 
    attempt_count = CASE 
      -- Reset count if lockout has expired
      WHEN login_attempts.locked_until IS NOT NULL AND login_attempts.locked_until < now() THEN 1
      -- Reset count if last attempt was more than 30 minutes ago
      WHEN login_attempts.last_attempt_at < now() - v_lockout_duration THEN 1
      ELSE login_attempts.attempt_count + 1
    END,
    last_attempt_at = now(),
    locked_until = CASE 
      -- Clear lockout if it has expired
      WHEN login_attempts.locked_until IS NOT NULL AND login_attempts.locked_until < now() THEN NULL
      -- Set lockout if reaching max attempts
      WHEN login_attempts.attempt_count + 1 >= v_max_attempts THEN now() + v_lockout_duration
      ELSE login_attempts.locked_until
    END,
    updated_at = now()
  RETURNING login_attempts.attempt_count, login_attempts.locked_until 
  INTO v_attempt_count, v_locked_until;

  RETURN QUERY SELECT 
    (v_locked_until IS NOT NULL AND v_locked_until > now()) AS is_locked,
    v_attempt_count AS attempts,
    v_locked_until AS unlock_time;
END;
$$;

-- Function to check if account is locked
CREATE OR REPLACE FUNCTION public.check_account_locked(p_email TEXT)
RETURNS TABLE(is_locked BOOLEAN, attempts INTEGER, unlock_time TIMESTAMP WITH TIME ZONE)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    (la.locked_until IS NOT NULL AND la.locked_until > now()) AS is_locked,
    la.attempt_count AS attempts,
    la.locked_until AS unlock_time
  FROM login_attempts la
  WHERE la.email = p_email;
  
  -- If no record exists, return unlocked status
  IF NOT FOUND THEN
    RETURN QUERY SELECT false AS is_locked, 0 AS attempts, NULL::TIMESTAMP WITH TIME ZONE AS unlock_time;
  END IF;
END;
$$;

-- Function to clear login attempts on successful login
CREATE OR REPLACE FUNCTION public.clear_login_attempts(p_email TEXT)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  DELETE FROM login_attempts WHERE email = p_email;
END;
$$;