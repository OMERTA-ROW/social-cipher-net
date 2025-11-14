import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
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
    const { data: { user } } = await supabaseClient.auth.getUser(token);

    if (!user) throw new Error('Unauthorized');

    const { pool_name, entry_fee, game_type, max_participants } = await req.json();

    // Verify user has sufficient tokens
    const { data: wallet } = await supabaseClient
      .from('user_wallets')
      .select('balance')
      .eq('user_id', user.id)
      .single();

    if (!wallet || wallet.balance < entry_fee) {
      throw new Error('Insufficient tokens');
    }

    // Deduct entry fee
    await supabaseClient
      .from('user_wallets')
      .update({ balance: wallet.balance - entry_fee })
      .eq('user_id', user.id);

    // Create pool
    const { data: pool, error: poolError } = await supabaseClient
      .from('token_pools')
      .insert({
        creator_id: user.id,
        pool_name,
        entry_fee,
        total_pool: entry_fee,
        game_type,
        max_participants,
        current_participants: 1
      })
      .select()
      .single();

    if (poolError) throw poolError;

    // Add creator as first participant
    await supabaseClient
      .from('pool_participants')
      .insert({
        pool_id: pool.id,
        user_id: user.id,
        entry_paid: entry_fee
      });

    // Log transaction
    await supabaseClient
      .from('wallet_transactions')
      .insert({
        user_id: user.id,
        amount: -entry_fee,
        transaction_type: 'pool_entry',
        description: `Entered token pool: ${pool_name}`
      });

    return new Response(
      JSON.stringify({ success: true, pool }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error creating pool:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
    );
  }
});