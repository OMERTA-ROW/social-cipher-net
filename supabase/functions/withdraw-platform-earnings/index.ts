import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const MINIMUM_WITHDRAWAL = 10;

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    status,
  });

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

    const authHeader = req.headers.get('Authorization') ?? '';
    const token = authHeader.replace('Bearer ', '').trim();
    if (!token) return json({ error: 'Unauthorized' }, 401);

    const { data: userData, error: userError } = await supabaseClient.auth.getUser(token);
    const user = userData?.user;
    if (userError || !user) return json({ error: 'Unauthorized' }, 401);

    const body = await req.json().catch(() => ({}));
    const platform_connection_id =
      typeof body.platform_connection_id === 'string' ? body.platform_connection_id.trim() : '';
    if (!platform_connection_id) return json({ error: 'Invalid platform_connection_id' }, 400);

    // Verify platform connection belongs to the caller
    const { data: connection, error: connError } = await supabaseClient
      .from('platform_connections')
      .select('id, platform, metadata')
      .eq('id', platform_connection_id)
      .eq('user_id', user.id)
      .maybeSingle();

    if (connError || !connection) return json({ error: 'Platform connection not found' }, 404);

    // --- The withdrawable amount is determined server-side, never by the client ---
    const metadata = (connection.metadata ?? {}) as Record<string, unknown>;
    const available = Number(metadata.available_earnings ?? 0);

    if (!Number.isFinite(available) || available <= 0) {
      return json({ error: 'No verified earnings are available to withdraw' }, 400);
    }
    if (available < MINIMUM_WITHDRAWAL) {
      return json({ error: `Minimum withdrawal amount is $${MINIMUM_WITHDRAWAL}` }, 400);
    }

    const amount = Math.round(available * 100) / 100;

    // Debit the verified earnings first so a retry cannot double-credit
    const { error: debitError } = await supabaseClient
      .from('platform_connections')
      .update({
        metadata: { ...metadata, available_earnings: 0, last_withdrawal_at: new Date().toISOString() },
        updated_at: new Date().toISOString(),
      })
      .eq('id', connection.id)
      .eq('user_id', user.id);

    if (debitError) throw debitError;

    const { data: wallet } = await supabaseClient
      .from('user_wallets')
      .select('balance')
      .eq('user_id', user.id)
      .maybeSingle();

    const newBalance = Number(wallet?.balance ?? 0) + amount;

    const { error: walletError } = await supabaseClient
      .from('user_wallets')
      .upsert(
        { user_id: user.id, balance: newBalance, updated_at: new Date().toISOString() },
        { onConflict: 'user_id' }
      );

    if (walletError) throw walletError;

    const { error: txError } = await supabaseClient
      .from('wallet_transactions')
      .insert({
        user_id: user.id,
        amount,
        transaction_type: 'earning',
        description: `Withdrawal from ${connection.platform}`,
        status: 'completed',
        metadata: {
          platform_connection_id: connection.id,
          platform: connection.platform,
          source: 'social_platform_withdrawal',
        },
      });

    if (txError) throw txError;

    return json({
      success: true,
      new_balance: newBalance,
      amount_withdrawn: amount,
      message: `Successfully withdrew $${amount.toFixed(2)} from ${connection.platform}`,
    });
  } catch (error) {
    console.error('Error in withdraw-platform-earnings:', error);
    return json({ error: 'Failed to withdraw platform earnings' }, 400);
  }
});
