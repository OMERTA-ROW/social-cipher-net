-- 1. Stop storing visitor IPs on affiliate clicks
ALTER TABLE public.external_affiliate_clicks DROP COLUMN IF EXISTS ip_address;

-- 2. Hide plaintext API secrets from the Data API (service role only)
REVOKE SELECT ON public.trading_accounts FROM authenticated, anon;
GRANT SELECT (id, user_id, platform_name, platform_type, account_username, is_active, metadata, created_at, updated_at)
  ON public.trading_accounts TO authenticated;
REVOKE SELECT ON public.external_mining_accounts FROM authenticated, anon;
GRANT SELECT (id, user_id, account_name, account_type, platform, wallet_address, mining_type, is_active, optimization_level, metadata, created_at, updated_at)
  ON public.external_mining_accounts TO authenticated;
GRANT ALL ON public.trading_accounts TO service_role;
GRANT ALL ON public.external_mining_accounts TO service_role;

-- 3. Pool transactions: server-side writes only
DROP POLICY IF EXISTS "Service can insert pool transactions" ON public.pool_transactions;
REVOKE INSERT, UPDATE, DELETE ON public.pool_transactions FROM authenticated, anon;
GRANT ALL ON public.pool_transactions TO service_role;

-- 4. post_media insert scoped to authenticated owners
DROP POLICY IF EXISTS "Users can add media to own posts" ON public.post_media;
CREATE POLICY "Users can add media to own posts"
  ON public.post_media FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM public.posts p WHERE p.id = post_media.post_id AND p.user_id = auth.uid()));

-- 5. Reviews readable by signed-in users only
DROP POLICY IF EXISTS "Anyone can view reviews" ON public.product_reviews;
CREATE POLICY "Signed-in users can view reviews"
  ON public.product_reviews FOR SELECT TO authenticated USING (true);
REVOKE SELECT ON public.product_reviews FROM anon;

-- 6. Stream chat visible to signed-in users only
DROP POLICY IF EXISTS "Live or joined stream chat is viewable" ON public.stream_chat_messages;
CREATE POLICY "Live or joined stream chat is viewable"
  ON public.stream_chat_messages FOR SELECT TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.live_streams s WHERE s.id = stream_chat_messages.stream_id AND s.is_live = true)
    OR EXISTS (SELECT 1 FROM public.live_streams s WHERE s.id = stream_chat_messages.stream_id AND s.user_id = auth.uid())
    OR EXISTS (SELECT 1 FROM public.live_stream_participants pt WHERE pt.stream_id = stream_chat_messages.stream_id AND pt.user_id = auth.uid())
  );
REVOKE SELECT ON public.stream_chat_messages FROM anon;

-- 7. Remove plaintext saved login credentials
ALTER TABLE public.user_saved_tabs DROP COLUMN IF EXISTS login_credentials;