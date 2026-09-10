DROP POLICY IF EXISTS "Service can insert views" ON public.post_views;
DROP POLICY IF EXISTS "Service can insert clicks" ON public.post_clicks;
DROP POLICY IF EXISTS "Service can insert clicks" ON public.external_affiliate_clicks;
DROP POLICY IF EXISTS "Service role can insert moderation" ON public.content_moderation;
DROP POLICY IF EXISTS "Service can insert crypto transactions" ON public.crypto_transactions;
DROP POLICY IF EXISTS "Service can update crypto transactions" ON public.crypto_transactions;
DROP POLICY IF EXISTS "Service can insert earnings" ON public.creator_earnings;
DROP POLICY IF EXISTS "Service can insert platform earnings" ON public.platform_earnings;
DROP POLICY IF EXISTS "Service can insert payments" ON public.post_payments;
DROP POLICY IF EXISTS "Service can insert mining earnings" ON public.mining_earnings;
DROP POLICY IF EXISTS "Service can insert verification payments" ON public.verification_payments;
DROP POLICY IF EXISTS "Service can manage login attempts" ON public.login_attempts;
DROP POLICY IF EXISTS "Service can update mining sessions" ON public.mining_sessions;
DROP POLICY IF EXISTS "Service can insert security logs" ON public.security_audit_log;
DROP POLICY IF EXISTS "Service can manage unlocks" ON public.subscription_unlocks;
DROP POLICY IF EXISTS "Service can update pools" ON public.token_pools;
DROP POLICY IF EXISTS "Service can update participants" ON public.pool_participants;
DROP POLICY IF EXISTS "Service can update consent" ON public.pool_consent;
DROP POLICY IF EXISTS "Service can manage wallets" ON public.user_wallets;
DROP POLICY IF EXISTS "Service can insert transactions" ON public.wallet_transactions;

GRANT ALL ON public.post_views, public.post_clicks, public.external_affiliate_clicks,
  public.content_moderation, public.crypto_transactions, public.creator_earnings,
  public.platform_earnings, public.post_payments, public.mining_earnings,
  public.verification_payments, public.login_attempts, public.mining_sessions,
  public.security_audit_log, public.subscription_unlocks, public.token_pools,
  public.pool_participants, public.pool_consent, public.user_wallets,
  public.wallet_transactions TO service_role;