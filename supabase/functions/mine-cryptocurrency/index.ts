import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Mining rates per day (base amount before multiplier)
const MINING_RATES: Record<string, number> = {
  'BTC': 0.00001,     // Bitcoin
  'ETH': 0.0001,      // Ethereum
  'USDC': 0.1,        // USD Coin
  'USDT': 0.1,        // Tether
  'MATIC': 1,         // Polygon
  'BNB': 0.001,       // Binance Coin
  'DOGE': 10,         // Dogecoin
  'SHIB': 1000,       // Shiba Inu
  'PEPE': 10000,      // Pepe
  'AVAX': 0.01,       // Avalanche
  'SOL': 0.001,       // Solana
  'ADA': 1,           // Cardano
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    );

    const { data: { user } } = await supabaseClient.auth.getUser();
    if (!user) {
      throw new Error('Unauthorized');
    }

    const { sessionId, cryptoCurrency } = await req.json();

    console.log(`Processing crypto mining for user ${user.id}, session ${sessionId}, currency ${cryptoCurrency}`);

    // Get the active mining session
    const { data: session, error: sessionError } = await supabaseClient
      .from('mining_sessions')
      .select('*')
      .eq('id', sessionId)
      .eq('user_id', user.id)
      .eq('status', 'active')
      .single();

    if (sessionError || !session) {
      throw new Error('Mining session not found or not active');
    }

    // Check if session has ended
    const now = new Date();
    const endDate = new Date(session.end_date);
    if (now > endDate) {
      // Update session status
      await supabaseClient
        .from('mining_sessions')
        .update({ status: 'completed' })
        .eq('id', sessionId);
      
      throw new Error('Mining session has ended');
    }

    // Calculate mining reward
    const baseRate = MINING_RATES[cryptoCurrency] || MINING_RATES['BTC'];
    const minedAmount = baseRate * session.performance_multiplier;

    console.log(`Mining ${minedAmount} ${cryptoCurrency} (base: ${baseRate}, multiplier: ${session.performance_multiplier})`);

    // Get or create user wallet
    const { data: wallet, error: walletError } = await supabaseClient
      .from('user_wallets')
      .select('*')
      .eq('user_id', user.id)
      .single();

    if (walletError && walletError.code !== 'PGRST116') {
      throw walletError;
    }

    // Update crypto balance
    const currentCryptoBalance = wallet?.crypto_balance || {};
    const currentAmount = parseFloat(currentCryptoBalance[cryptoCurrency] || '0');
    const newAmount = currentAmount + minedAmount;

    const updatedCryptoBalance = {
      ...currentCryptoBalance,
      [cryptoCurrency]: newAmount.toString(),
    };

    if (wallet) {
      await supabaseClient
        .from('user_wallets')
        .update({
          crypto_balance: updatedCryptoBalance,
          updated_at: new Date().toISOString(),
        })
        .eq('user_id', user.id);
    } else {
      await supabaseClient
        .from('user_wallets')
        .insert({
          user_id: user.id,
          balance: 0,
          crypto_balance: updatedCryptoBalance,
        });
    }

    // Record mining earning
    await supabaseClient
      .from('mining_earnings')
      .insert({
        user_id: user.id,
        session_id: sessionId,
        mining_type: session.mining_type,
        amount_mined: minedAmount,
        mining_date: new Date().toISOString().split('T')[0],
      });

    // Update session total mined
    await supabaseClient
      .from('mining_sessions')
      .update({
        total_mined: session.total_mined + minedAmount,
      })
      .eq('id', sessionId);

    // Record crypto transaction
    await supabaseClient
      .from('crypto_transactions')
      .insert({
        user_id: user.id,
        transaction_type: 'mining_reward',
        crypto_currency: cryptoCurrency,
        crypto_amount: minedAmount,
        usd_value: 0, // Will be calculated when converted
        chain: 'mining',
        wallet_address: 'mining_pool',
        transaction_hash: `mining_${sessionId}_${Date.now()}`,
        status: 'completed',
        confirmations: 1,
        metadata: {
          session_id: sessionId,
          mining_type: session.mining_type,
          performance_multiplier: session.performance_multiplier,
        },
      });

    return new Response(
      JSON.stringify({
        success: true,
        minedAmount,
        cryptoCurrency,
        totalMined: session.total_mined + minedAmount,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error('ERROR:', errorMessage);
    return new Response(
      JSON.stringify({ error: errorMessage }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
    );
  }
});
