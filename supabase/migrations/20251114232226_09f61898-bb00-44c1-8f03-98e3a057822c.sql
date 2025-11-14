-- Enhance security_audit_log table for severity tracking
ALTER TABLE public.security_audit_log 
ADD COLUMN IF NOT EXISTS severity TEXT DEFAULT 'low' CHECK (severity IN ('low', 'medium', 'high', 'critical'));

-- Create function to detect suspicious patterns
CREATE OR REPLACE FUNCTION public.detect_suspicious_activity(
  _user_id UUID,
  _event_type TEXT,
  _time_window INTERVAL DEFAULT '5 minutes'
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  event_count INTEGER;
  high_severity_count INTEGER;
BEGIN
  -- Count recent events from this user
  SELECT COUNT(*) INTO event_count
  FROM security_audit_log
  WHERE user_id = _user_id
    AND created_at > (NOW() - _time_window);
  
  -- Count high severity events
  SELECT COUNT(*) INTO high_severity_count
  FROM security_audit_log
  WHERE user_id = _user_id
    AND severity IN ('high', 'critical')
    AND created_at > (NOW() - '1 hour'::INTERVAL);
  
  -- Flag as suspicious if:
  -- 1. More than 50 events in 5 minutes (spam/abuse)
  -- 2. More than 5 high severity events in an hour
  RETURN (event_count > 50 OR high_severity_count > 5);
END;
$$;

-- Add indexes for better performance on security queries
CREATE INDEX IF NOT EXISTS idx_security_audit_user_created 
ON public.security_audit_log(user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_security_audit_severity 
ON public.security_audit_log(severity, created_at DESC);

-- Update RLS policies for security_audit_log
DROP POLICY IF EXISTS "Admins can view all audit logs" ON public.security_audit_log;
DROP POLICY IF EXISTS "Users can view own audit logs" ON public.security_audit_log;

CREATE POLICY "Admins can view all security logs"
ON public.security_audit_log
FOR SELECT
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Users can view own security logs"
ON public.security_audit_log
FOR SELECT
USING (auth.uid() = user_id);

-- Allow service role to insert security logs
CREATE POLICY "Service can insert security logs"
ON public.security_audit_log
FOR INSERT
WITH CHECK (true);