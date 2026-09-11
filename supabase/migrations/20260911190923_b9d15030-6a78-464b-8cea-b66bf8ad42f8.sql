
-- Helper: is the user the owner (broadcaster) of the stream?
CREATE OR REPLACE FUNCTION public.is_stream_owner(_user_id uuid, _stream_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.live_streams s
    WHERE s.id = _stream_id AND s.user_id = _user_id
  )
$$;

-- Trigger: prevent privilege self-assignment on live_stream_participants
CREATE OR REPLACE FUNCTION public.enforce_participant_privileges()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  privileged boolean;
BEGIN
  privileged := public.is_stream_owner(auth.uid(), NEW.stream_id)
             OR public.is_stream_admin(auth.uid(), NEW.stream_id);

  IF privileged THEN
    RETURN NEW;
  END IF;

  IF TG_OP = 'INSERT' THEN
    NEW.is_admin := false;
    NEW.is_host := false;
    NEW.is_muted := false;
    NEW.is_blocked := false;
  ELSE
    NEW.is_admin := OLD.is_admin;
    NEW.is_host := OLD.is_host;
    NEW.is_muted := OLD.is_muted;
    NEW.is_blocked := OLD.is_blocked;
    NEW.user_id := OLD.user_id;
    NEW.stream_id := OLD.stream_id;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_enforce_participant_privileges ON public.live_stream_participants;
CREATE TRIGGER trg_enforce_participant_privileges
BEFORE INSERT OR UPDATE ON public.live_stream_participants
FOR EACH ROW EXECUTE FUNCTION public.enforce_participant_privileges();

-- Explicit WITH CHECK on participant policies
DROP POLICY IF EXISTS "Users can insert themselves as participants" ON public.live_stream_participants;
CREATE POLICY "Users can insert themselves as participants"
ON public.live_stream_participants FOR INSERT TO authenticated
WITH CHECK (
  auth.uid() = user_id
  OR public.is_stream_owner(auth.uid(), stream_id)
  OR public.is_stream_admin(auth.uid(), stream_id)
);

DROP POLICY IF EXISTS "Users and admins can update participation" ON public.live_stream_participants;
CREATE POLICY "Users and admins can update participation"
ON public.live_stream_participants FOR UPDATE TO authenticated
USING (
  auth.uid() = user_id
  OR public.is_stream_owner(auth.uid(), stream_id)
  OR public.is_stream_admin(auth.uid(), stream_id)
)
WITH CHECK (
  auth.uid() = user_id
  OR public.is_stream_owner(auth.uid(), stream_id)
  OR public.is_stream_admin(auth.uid(), stream_id)
);

-- Explicit WITH CHECK on self-service update/all policies
DROP POLICY IF EXISTS "Users can manage own streams" ON public.live_streams;
CREATE POLICY "Users can manage own streams" ON public.live_streams
FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Sellers can update their own profile" ON public.seller_profiles;
CREATE POLICY "Sellers can update their own profile" ON public.seller_profiles
FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Sellers can manage their products" ON public.products;
CREATE POLICY "Sellers can manage their products" ON public.products
FOR ALL TO authenticated
USING (seller_id IN (SELECT sp.id FROM public.seller_profiles sp WHERE sp.user_id = auth.uid()))
WITH CHECK (seller_id IN (SELECT sp.id FROM public.seller_profiles sp WHERE sp.user_id = auth.uid()));

DROP POLICY IF EXISTS "Users can manage own platform connections" ON public.platform_connections;
CREATE POLICY "Users can manage own platform connections" ON public.platform_connections
FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can manage own privacy settings" ON public.privacy_settings;
CREATE POLICY "Users can manage own privacy settings" ON public.privacy_settings
FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own crypto wallets" ON public.crypto_wallets;
CREATE POLICY "Users can update own crypto wallets" ON public.crypto_wallets
FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own external links" ON public.external_affiliate_links;
CREATE POLICY "Users can update own external links" ON public.external_affiliate_links
FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can manage own trading accounts" ON public.trading_accounts;
CREATE POLICY "Users can manage own trading accounts" ON public.trading_accounts
FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can manage own external mining accounts" ON public.external_mining_accounts;
CREATE POLICY "Users can manage own external mining accounts" ON public.external_mining_accounts
FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own saved tabs" ON public.user_saved_tabs;
CREATE POLICY "Users can update own saved tabs" ON public.user_saved_tabs
FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
