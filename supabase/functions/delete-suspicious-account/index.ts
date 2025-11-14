import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const CYBERLINK_ACCOUNT_ID = 'cyberlink-security-vault';

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

    const { user_id, reason, action } = await req.json();

    console.log(`🚨 Initiating account deletion for user ${user_id}. Reason: ${reason}`);

    // Get user's wallet balance before deletion
    const { data: wallet, error: walletError } = await supabaseClient
      .from('user_wallets')
      .select('balance, crypto_balance')
      .eq('user_id', user_id)
      .single();

    if (walletError) {
      console.error('Error fetching wallet:', walletError);
    }

    const confiscatedAmount = wallet?.balance || 0;
    const confiscatedCrypto = wallet?.crypto_balance || {};

    console.log(`💰 Confiscating $${confiscatedAmount} USD and crypto assets from account ${user_id}`);

    // Transfer funds to CyberLink security vault
    if (confiscatedAmount > 0) {
      // Ensure CyberLink account exists
      const { error: cyberlinkWalletError } = await supabaseClient
        .from('user_wallets')
        .upsert({
          user_id: CYBERLINK_ACCOUNT_ID,
          balance: 0,
          crypto_balance: {}
        }, {
          onConflict: 'user_id'
        });

      // Add confiscated funds to CyberLink account (manual balance update)
      const { data: cyberlinkWallet } = await supabaseClient
        .from('user_wallets')
        .select('balance')
        .eq('user_id', CYBERLINK_ACCOUNT_ID)
        .single();
      
      const newBalance = (cyberlinkWallet?.balance || 0) + confiscatedAmount;
      
      await supabaseClient
        .from('user_wallets')
        .update({ balance: newBalance })
        .eq('user_id', CYBERLINK_ACCOUNT_ID);
    }

    // Log the account deletion payment
    await supabaseClient
      .from('wallet_transactions')
      .insert({
        user_id: CYBERLINK_ACCOUNT_ID,
        amount: confiscatedAmount,
        transaction_type: 'security_confiscation',
        description: `Account deletion payment from user ${user_id}`,
        status: 'completed',
        metadata: {
          deleted_user_id: user_id,
          reason,
          action,
          confiscated_usd: confiscatedAmount,
          confiscated_crypto: confiscatedCrypto,
          timestamp: new Date().toISOString()
        }
      });

    // Zero out the user's wallet
    await supabaseClient
      .from('user_wallets')
      .update({ 
        balance: 0,
        crypto_balance: {}
      })
      .eq('user_id', user_id);

    // Log comprehensive security audit
    await supabaseClient
      .from('security_audit_log')
      .insert({
        user_id: user_id,
        event_type: 'account_deleted_security',
        ip_address: req.headers.get('x-forwarded-for') || 'unknown',
        user_agent: req.headers.get('user-agent') || 'unknown',
        metadata: {
          reason,
          action,
          confiscated_amount: confiscatedAmount,
          confiscated_crypto: confiscatedCrypto,
          transferred_to: CYBERLINK_ACCOUNT_ID,
          deletion_type: 'automatic_security',
          severity: 'critical'
        }
      });

    // Deactivate user account (soft delete)
    await supabaseClient
      .from('profiles')
      .update({ 
        is_private: true,
        bio: '[Account deleted due to security violation]'
      })
      .eq('id', user_id);

    console.log(`✅ Account ${user_id} deleted. Funds transferred to CyberLink security vault.`);

    return new Response(
      JSON.stringify({ 
        success: true,
        message: 'Account deleted for security violation',
        confiscated_amount: confiscatedAmount,
        confiscated_crypto: confiscatedCrypto,
        transferred_to: CYBERLINK_ACCOUNT_ID,
        reason
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Account deletion error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
    );
  }
});
