-- external_affiliate_clicks
DROP POLICY IF EXISTS "Anyone can view click stats" ON public.external_affiliate_clicks;
CREATE POLICY "Link owners can view click stats"
ON public.external_affiliate_clicks FOR SELECT TO authenticated
USING (EXISTS (SELECT 1 FROM public.external_affiliate_links l WHERE l.id = external_affiliate_clicks.link_id AND l.user_id = auth.uid()));
REVOKE SELECT ON public.external_affiliate_clicks FROM anon;

-- post_views / post_clicks
DROP POLICY IF EXISTS "Anyone can view post views" ON public.post_views;
CREATE POLICY "Post owners can view post views"
ON public.post_views FOR SELECT TO authenticated
USING (EXISTS (SELECT 1 FROM public.posts p WHERE p.id = post_views.post_id AND p.user_id = auth.uid()));
REVOKE SELECT ON public.post_views FROM anon;

DROP POLICY IF EXISTS "Anyone can view post clicks" ON public.post_clicks;
CREATE POLICY "Post owners can view post clicks"
ON public.post_clicks FOR SELECT TO authenticated
USING (EXISTS (SELECT 1 FROM public.posts p WHERE p.id = post_clicks.post_id AND p.user_id = auth.uid()));
REVOKE SELECT ON public.post_clicks FROM anon;

-- post_media
DROP POLICY IF EXISTS "Anyone can view post media" ON public.post_media;
CREATE POLICY "Viewable post media"
ON public.post_media FOR SELECT
USING (EXISTS (
  SELECT 1 FROM public.posts p
  WHERE p.id = post_media.post_id
    AND (
      COALESCE(p.monetization_type, 'free') = 'free'
      OR p.user_id = auth.uid()
      OR EXISTS (SELECT 1 FROM public.post_payments pp WHERE pp.post_id = p.id AND pp.payer_id = auth.uid() AND pp.status = 'completed')
    )
));

-- mentions
DROP POLICY IF EXISTS "Anyone can view mentions" ON public.mentions;
CREATE POLICY "Relevant mentions are viewable"
ON public.mentions FOR SELECT TO authenticated
USING (
  mentioned_user_id = auth.uid()
  OR mentioner_user_id = auth.uid()
  OR EXISTS (
    SELECT 1 FROM public.posts p
    WHERE p.id = mentions.post_id
      AND (COALESCE(p.monetization_type, 'free') = 'free' OR p.user_id = auth.uid())
  )
);
REVOKE SELECT ON public.mentions FROM anon;

-- followers
DROP POLICY IF EXISTS "Anyone can view followers" ON public.followers;
CREATE POLICY "Signed-in users can view non-private follows"
ON public.followers FOR SELECT TO authenticated
USING (
  follower_id = auth.uid()
  OR following_id = auth.uid()
  OR NOT EXISTS (
    SELECT 1 FROM public.profiles pr
    WHERE pr.id = followers.following_id AND pr.is_private = true
  )
);
REVOKE SELECT ON public.followers FROM anon;

-- pool_participants
DROP POLICY IF EXISTS "Anyone can view participants" ON public.pool_participants;
CREATE POLICY "Pool members can view participants"
ON public.pool_participants FOR SELECT TO authenticated
USING (
  user_id = auth.uid()
  OR EXISTS (SELECT 1 FROM public.token_pools tp WHERE tp.id = pool_participants.pool_id AND tp.creator_id = auth.uid())
  OR EXISTS (SELECT 1 FROM public.pool_participants me WHERE me.pool_id = pool_participants.pool_id AND me.user_id = auth.uid())
);
REVOKE SELECT ON public.pool_participants FROM anon;

-- stream_chat_messages
DROP POLICY IF EXISTS "Anyone can view stream chat" ON public.stream_chat_messages;
CREATE POLICY "Live or joined stream chat is viewable"
ON public.stream_chat_messages FOR SELECT
USING (
  EXISTS (SELECT 1 FROM public.live_streams s WHERE s.id = stream_chat_messages.stream_id AND s.is_live = true)
  OR EXISTS (SELECT 1 FROM public.live_streams s WHERE s.id = stream_chat_messages.stream_id AND s.user_id = auth.uid())
  OR EXISTS (SELECT 1 FROM public.live_stream_participants pt WHERE pt.stream_id = stream_chat_messages.stream_id AND pt.user_id = auth.uid())
);

-- Credential columns: never readable by client sessions
REVOKE SELECT (api_key, api_secret) ON public.trading_accounts FROM anon, authenticated;
REVOKE SELECT (api_key, api_secret) ON public.external_mining_accounts FROM anon, authenticated;
REVOKE SELECT (login_credentials) ON public.user_saved_tabs FROM anon, authenticated;
REVOKE SELECT ON public.trading_accounts FROM anon;
REVOKE SELECT ON public.external_mining_accounts FROM anon;
REVOKE SELECT ON public.user_saved_tabs FROM anon;

-- Internal SECURITY DEFINER helpers should not be callable by signed-out visitors
REVOKE EXECUTE ON FUNCTION public.calculate_mining_multiplier(numeric) FROM anon;
REVOKE EXECUTE ON FUNCTION public.detect_suspicious_activity(uuid, text, interval) FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.is_user_adult(uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.get_follower_count(uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.get_total_views(uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) FROM anon;

-- Sensitive tables should not be discoverable by signed-out visitors
REVOKE SELECT ON public.login_attempts, public.security_audit_log, public.withdrawal_requests,
  public.wallet_transactions, public.user_wallets, public.crypto_wallets, public.crypto_transactions,
  public.identity_verification, public.platform_connections, public.verification_payments,
  public.privacy_settings, public.notification_preferences, public.user_roles, public.post_payments,
  public.creator_earnings, public.mining_sessions, public.mining_earnings, public.pool_consent,
  public.pool_transactions, public.subscription_unlocks FROM anon;