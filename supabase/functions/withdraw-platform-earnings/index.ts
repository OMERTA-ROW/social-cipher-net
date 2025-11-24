import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const authHeader = req.headers.get('Authorization')!;
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser(token);

    if (userError || !user) {
      throw new Error('Unauthorized');
    }

    const { platform_connection_id, platform, amount } = await req.json();

    console.log(`Withdrawing $${amount} from ${platform} to wallet for user ${user.id}`);

    // Verify platform connection belongs to user
    const { data: connection, error: connError } = await supabaseClient
      .from('platform_connections')
      .select('*')
      .eq('id', platform_connection_id)
      .eq('user_id', user.id)
      .single();

    if (connError || !connection) {
      throw new Error('Platform connection not found');
    }

    if (amount < 10) {
      throw new Error('Minimum withdrawal amount is $10');
    }

    // Create or update user wallet
    const { data: wallet, error: walletError } = await supabaseClient
      .from('user_wallets')
      .select('*')
      .eq('user_id', user.id)
      .maybeSingle();

    const currentBalance = wallet ? parseFloat(wallet.balance.toString()) : 0;
    const newBalance = currentBalance + amount;

    if (wallet) {
      const { error: updateError } = await supabaseClient
        .from('user_wallets')
        .update({ 
          balance: newBalance,
          updated_at: new Date().toISOString()
        })
        .eq('user_id', user.id);

      if (updateError) throw updateError;
    } else {
      const { error: insertError } = await supabaseClient
        .from('user_wallets')
        .insert({ 
          user_id: user.id,
          balance: newBalance
        });

      if (insertError) throw insertError;
    }

    // Record wallet transaction
    const { error: txError } = await supabaseClient
      .from('wallet_transactions')
      .insert({
        user_id: user.id,
        amount: amount,
        transaction_type: 'earning',
        description: `Withdrawal from ${platform}`,
        status: 'completed',
        metadata: {
          platform_connection_id,
          platform,
          source: 'social_platform_withdrawal'
        }
      });

    if (txError) throw txError;

    console.log(`Successfully withdrew $${amount} from ${platform} to wallet`);

    return new Response(
      JSON.stringify({ 
        success: true,
        new_balance: newBalance,
        amount_withdrawn: amount,
        message: `Successfully withdrew $${amount.toFixed(2)} from ${platform}`
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );

  } catch (error: any) {
    console.error('Error in withdraw-platform-earnings:', error);
    return new Response(
      JSON.stringify({ 
        error: error.message || 'Failed to withdraw platform earnings' 
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
    );
  }
});
