ALTER TABLE public.user_connections
  ADD COLUMN IF NOT EXISTS show_on_profile boolean NOT NULL DEFAULT true;

CREATE OR REPLACE FUNCTION public.profile_connections(_user uuid)
RETURNS TABLE(service_id text, account_handle text, account_name text, health text)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT c.service_id, c.account_handle, c.account_name, c.health
  FROM public.user_connections c
  WHERE c.user_id = _user
    AND c.status = 'connected'
    AND c.show_on_profile = true
  ORDER BY c.service_id
$$;

REVOKE ALL ON FUNCTION public.profile_connections(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.profile_connections(uuid) TO anon, authenticated;