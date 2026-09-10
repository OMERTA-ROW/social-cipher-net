import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const CYBERLINK_ACCOUNT_ID = 'cyberlink-security-vault';

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    status,
  });

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      { auth: { persistSession: false } }
    );

    // --- Authentication & authorization: admins only ---
    const authHeader = req.headers.get('Authorization') ?? '';
    const jwt = authHeader.replace('Bearer ', '').trim();
    if (!jwt) return json({ error: 'Unauthorized' }, 401);

    const { data: userData, error: userError } = await supabaseClient.auth.getUser(jwt);
    const caller = userData?.user;
    if (userError || !caller) return json({ error: 'Unauthorized' }, 401);

    const { data: isAdmin, error: roleError } = await supabaseClient.rpc('has_role', {
      _user_id: caller.id,
      _role: 'admin',
    });
    if (roleError || isAdmin !== true) {
      console.warn(`Blocked non-admin account deletion attempt by ${caller.id}`);
      return json({ error: 'Forbidden' }, 403);
    }

    const body = await req.json().catch(() => ({}));
    const user_id = typeof body.user_id === 'string' ? body.user_id.trim() : '';
    const reason = typeof body.reason === 'string' ? body.reason.slice(0, 500) : 'unspecified';
    const action = typeof body.action === 'string' ? body.action.slice(0, 100) : 'soft_delete';

    if (!UUID_RE.test(user_id)) return json({ error: 'Invalid user_id' }, 400);
    if (user_id === caller.id) return json({ error: 'Cannot delete your own account here' }, 400);

    console.log(`🚨 Admin ${caller.id} initiating account deletion for ${user_id}. Reason: ${reason}`);

    // Get user's wallet balance before deletion
    const { data: wallet, error: walletError } = await supabaseClient
      .from('user_wallets')
      .select('balance, crypto_balance')
      .eq('user_id', user_id)
      .maybeSingle();

    if (walletError) {
      console.error('Error fetching wallet:', walletError);
    }

    const confiscatedAmount = wallet?.balance || 0;
    const confiscatedCrypto = wallet?.crypto_balance || {};

    // Transfer funds to CyberLink security vault
    if (confiscatedAmount > 0) {
      await supabaseClient
        .from('user_wallets')
        .upsert({ user_id: CYBERLINK_ACCOUNT_ID, balance: 0, crypto_balance: {} }, { onConflict: 'user_id' });

      const { data: cyberlinkWallet } = await supabaseClient
        .from('user_wallets')
        .select('balance')
        .eq('user_id', CYBERLINK_ACCOUNT_ID)
        .maybeSingle();

      const newBalance = (cyberlinkWallet?.balance || 0) + confiscatedAmount;

      await supabaseClient
        .from('user_wallets')
        .update({ balance: newBalance })
        .eq('user_id', CYBERLINK_ACCOUNT_ID);
    }

    await supabaseClient.from('wallet_transactions').insert({
      user_id: CYBERLINK_ACCOUNT_ID,
      amount: confiscatedAmount,
      transaction_type: 'security_confiscation',
      description: `Account deletion payment from user ${user_id}`,
      status: 'completed',
      metadata: {
        deleted_user_id: user_id,
        performed_by: caller.id,
        reason,
        action,
        confiscated_usd: confiscatedAmount,
        confiscated_crypto: confiscatedCrypto,
        timestamp: new Date().toISOString(),
      },
    });

    await supabaseClient
      .from('user_wallets')
      .update({ balance: 0, crypto_balance: {} })
      .eq('user_id', user_id);

    await supabaseClient.from('security_audit_log').insert({
      user_id: user_id,
      event_type: 'account_deleted_security',
      ip_address: req.headers.get('x-forwarded-for') || 'unknown',
      user_agent: req.headers.get('user-agent') || 'unknown',
      severity: 'critical',
      metadata: {
        reason,
        action,
        performed_by: caller.id,
        confiscated_amount: confiscatedAmount,
        confiscated_crypto: confiscatedCrypto,
        transferred_to: CYBERLINK_ACCOUNT_ID,
        deletion_type: 'admin_security',
      },
    });

    await supabaseClient
      .from('profiles')
      .update({ is_private: true, bio: '[Account deleted due to security violation]' })
      .eq('id', user_id);

    return json({
      success: true,
      message: 'Account deleted for security violation',
      confiscated_amount: confiscatedAmount,
      transferred_to: CYBERLINK_ACCOUNT_ID,
      reason,
    });
  } catch (error) {
    console.error('Account deletion error:', error);
    return json({ error: 'Request failed' }, 400);
  }
});
