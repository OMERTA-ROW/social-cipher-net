import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
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

    const { cryptoCurrency, amount } = await req.json();

    if (!cryptoCurrency || !amount || amount <= 0) {
      throw new Error('Invalid parameters');
    }

    console.log(`Converting ${amount} ${cryptoCurrency} to USD for user ${user.id}`);

    // Get user's wallet and crypto balance
    const { data: wallet, error: walletError } = await supabaseClient
      .from('user_wallets')
      .select('*')
      .eq('user_id', user.id)
      .single();

    if (walletError || !wallet) {
      throw new Error('Wallet not found');
    }

    const cryptoBalance = wallet.crypto_balance || {};
    const currentBalance = parseFloat(cryptoBalance[cryptoCurrency] || '0');

    if (currentBalance < amount) {
      throw new Error(`Insufficient ${cryptoCurrency} balance`);
    }

    // Fetch current crypto price
    const priceResponse = await fetch(
      `https://api.coingecko.com/api/v3/simple/price?ids=${getCoinGeckoId(cryptoCurrency)}&vs_currencies=usd`
    );
    const priceData = await priceResponse.json();
    const coinId = getCoinGeckoId(cryptoCurrency);
    const currentPrice = priceData[coinId]?.usd;

    if (!currentPrice) {
      throw new Error('Failed to fetch crypto price');
    }

    // Calculate USD value with 2% surcharge
    const baseUsdValue = amount * currentPrice;
    const surcharge = baseUsdValue * 0.02;
    const finalUsdValue = baseUsdValue - surcharge;

    console.log(`Base USD value: $${baseUsdValue.toFixed(2)}, Surcharge (2%): $${surcharge.toFixed(2)}, Final value: $${finalUsdValue.toFixed(2)}`);

    // Update crypto balance
    const updatedCryptoBalance = {
      ...cryptoBalance,
      [cryptoCurrency]: (currentBalance - amount).toString(),
    };

    // Update user wallet
    const { error: updateError } = await supabaseClient
      .from('user_wallets')
      .update({
        crypto_balance: updatedCryptoBalance,
        balance: parseFloat(wallet.balance) + finalUsdValue,
        updated_at: new Date().toISOString(),
      })
      .eq('user_id', user.id);

    if (updateError) {
      console.error('Error updating wallet:', updateError);
      throw new Error('Failed to update wallet');
    }

    // Record crypto transaction (withdrawal)
    const { error: cryptoTxError } = await supabaseClient
      .from('crypto_transactions')
      .insert({
        user_id: user.id,
        transaction_type: 'conversion_to_usd',
        crypto_currency: cryptoCurrency,
        crypto_amount: amount,
        usd_value: finalUsdValue,
        chain: 'conversion',
        wallet_address: 'internal_conversion',
        transaction_hash: `conversion_${Date.now()}`,
        status: 'completed',
        confirmations: 1,
        metadata: {
          base_usd_value: baseUsdValue,
          surcharge: surcharge,
          surcharge_rate: 0.02,
          price_at_conversion: currentPrice,
        },
      });

    if (cryptoTxError) {
      console.error('Error recording crypto transaction:', cryptoTxError);
    }

    // Record wallet transaction (USD credit)
    const { error: walletTxError } = await supabaseClient
      .from('wallet_transactions')
      .insert({
        user_id: user.id,
        transaction_type: 'crypto_conversion',
        amount: finalUsdValue,
        status: 'completed',
        description: `Converted ${amount} ${cryptoCurrency} to USD (2% fee applied)`,
        metadata: {
          crypto_currency: cryptoCurrency,
          crypto_amount: amount,
          surcharge: surcharge,
          base_value: baseUsdValue,
        },
      });

    if (walletTxError) {
      console.error('Error recording wallet transaction:', walletTxError);
    }

    return new Response(
      JSON.stringify({
        success: true,
        conversion: {
          crypto_currency: cryptoCurrency,
          crypto_amount: amount,
          base_usd_value: baseUsdValue,
          surcharge: surcharge,
          final_usd_value: finalUsdValue,
          price: currentPrice,
        },
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error) {
    console.error('Error in convert-crypto-to-usd:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'An error occurred' }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
    );
  }
});

function getCoinGeckoId(symbol: string): string {
  const mapping: { [key: string]: string } = {
    'BTC': 'bitcoin',
    'ETH': 'ethereum',
    'USDC': 'usd-coin',
    'USDT': 'tether',
    'BNB': 'binancecoin',
    'MATIC': 'matic-network',
    'AVAX': 'avalanche-2',
    'SOL': 'solana',
    'ARB': 'arbitrum',
    'OP': 'optimism',
  };
  return mapping[symbol.toUpperCase()] || symbol.toLowerCase();
}
