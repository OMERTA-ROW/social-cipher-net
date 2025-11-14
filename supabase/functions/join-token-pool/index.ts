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

    const { pool_id } = await req.json();

    // Get pool details
    const { data: pool, error: poolError } = await supabaseClient
      .from('token_pools')
      .select('*')
      .eq('id', pool_id)
      .single();

    if (poolError || !pool) throw new Error('Pool not found');

    if (pool.status !== 'active') throw new Error('Pool is not active');
    if (pool.current_participants >= pool.max_participants) throw new Error('Pool is full');

    // Check if user already joined
    const { data: existing } = await supabaseClient
      .from('pool_participants')
      .select('id')
      .eq('pool_id', pool_id)
      .eq('user_id', user.id)
      .single();

    if (existing) throw new Error('Already joined this pool');

    // Verify user has sufficient tokens
    const { data: wallet } = await supabaseClient
      .from('user_wallets')
      .select('balance')
      .eq('user_id', user.id)
      .single();

    if (!wallet || wallet.balance < pool.entry_fee) {
      throw new Error('Insufficient tokens');
    }

    // Deduct entry fee
    await supabaseClient
      .from('user_wallets')
      .update({ balance: wallet.balance - pool.entry_fee })
      .eq('user_id', user.id);

    // Add participant
    await supabaseClient
      .from('pool_participants')
      .insert({
        pool_id: pool.id,
        user_id: user.id,
        entry_paid: pool.entry_fee
      });

    // Update pool
    const newParticipantCount = pool.current_participants + 1;
    const newTotalPool = pool.total_pool + pool.entry_fee;

    await supabaseClient
      .from('token_pools')
      .update({
        current_participants: newParticipantCount,
        total_pool: newTotalPool,
        status: newParticipantCount >= pool.max_participants ? 'ready' : 'active'
      })
      .eq('id', pool_id);

    // Log transaction
    await supabaseClient
      .from('wallet_transactions')
      .insert({
        user_id: user.id,
        amount: -pool.entry_fee,
        transaction_type: 'pool_entry',
        description: `Joined token pool: ${pool.pool_name}`
      });

    return new Response(
      JSON.stringify({ success: true }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error joining pool:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
    );
  }
});