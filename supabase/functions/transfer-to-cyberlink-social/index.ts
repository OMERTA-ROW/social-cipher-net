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

    const { amount } = await req.json();

    if (!amount || amount <= 0) {
      throw new Error('Invalid transfer amount');
    }

    console.log(`Transferring $${amount} to Cyberlink Social for user ${user.id}`);

    // Get user wallet
    const { data: wallet, error: walletError } = await supabaseClient
      .from('user_wallets')
      .select('balance')
      .eq('user_id', user.id)
      .single();

    if (walletError || !wallet) {
      throw new Error('Wallet not found');
    }

    const currentBalance = parseFloat(wallet.balance.toString());

    if (amount > currentBalance) {
      throw new Error('Insufficient wallet balance');
    }

    // Deduct from wallet
    const newBalance = currentBalance - amount;
    const { error: updateError } = await supabaseClient
      .from('user_wallets')
      .update({ 
        balance: newBalance,
        updated_at: new Date().toISOString()
      })
      .eq('user_id', user.id);

    if (updateError) throw updateError;

    // Record transaction
    const { error: txError } = await supabaseClient
      .from('wallet_transactions')
      .insert({
        user_id: user.id,
        amount: -amount,
        transaction_type: 'transfer',
        description: 'Transfer to Cyberlink Social Master Account',
        status: 'completed',
        metadata: {
          destination: 'cyberlink_social',
          master_account: true
        }
      });

    if (txError) throw txError;

    console.log(`Successfully transferred $${amount} to Cyberlink Social`);

    return new Response(
      JSON.stringify({ 
        success: true,
        new_balance: newBalance,
        transferred_amount: amount,
        message: `Successfully transferred $${amount.toFixed(2)} to Cyberlink Social`
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );

  } catch (error: any) {
    console.error('Error in transfer-to-cyberlink-social:', error);
    return new Response(
      JSON.stringify({ 
        error: error.message || 'Failed to transfer funds' 
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
    );
  }
});
