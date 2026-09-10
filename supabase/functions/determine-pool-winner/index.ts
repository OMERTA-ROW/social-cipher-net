import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const CYBERLINK_ACCOUNT_ID = '00000000-0000-0000-0000-000000000000';

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

    // --- Authenticate the caller ---
    const authHeader = req.headers.get('Authorization') ?? '';
    const jwt = authHeader.replace('Bearer ', '').trim();
    if (!jwt) return json({ error: 'Unauthorized' }, 401);

    const { data: userData, error: userError } = await supabaseClient.auth.getUser(jwt);
    const caller = userData?.user;
    if (userError || !caller) return json({ error: 'Unauthorized' }, 401);

    const body = await req.json().catch(() => ({}));
    const pool_id = typeof body.pool_id === 'string' ? body.pool_id.trim() : '';
    const participants_scores = body.participants_scores;

    if (!UUID_RE.test(pool_id)) return json({ error: 'Invalid pool_id' }, 400);
    if (!participants_scores || typeof participants_scores !== 'object' || Array.isArray(participants_scores)) {
      return json({ error: 'Invalid participants_scores' }, 400);
    }

    const { data: pool } = await supabaseClient
      .from('token_pools')
      .select('*')
      .eq('id', pool_id)
      .maybeSingle();

    if (!pool) return json({ error: 'Pool not found' }, 404);

    // --- Authorization: only the pool creator or an admin may settle a pool ---
    const { data: isAdmin } = await supabaseClient.rpc('has_role', {
      _user_id: caller.id,
      _role: 'admin',
    });

    if (pool.creator_id !== caller.id && isAdmin !== true) {
      console.warn(`Blocked pool settlement attempt on ${pool_id} by ${caller.id}`);
      return json({ error: 'Forbidden' }, 403);
    }

    // Prevent double payouts on an already-settled pool
    if (pool.status === 'completed' || pool.winner_id) {
      return json({ error: 'Pool has already been settled' }, 409);
    }

    // Scores may only refer to real participants of this pool
    const { data: participants } = await supabaseClient
      .from('pool_participants')
      .select('user_id')
      .eq('pool_id', pool_id);

    const participantIds = new Set((participants ?? []).map((p) => p.user_id));
    if (participantIds.size === 0) return json({ error: 'Pool has no participants' }, 400);

    const scoreEntries = Object.entries(participants_scores as Record<string, unknown>);
    for (const [userId] of scoreEntries) {
      if (!participantIds.has(userId)) {
        return json({ error: 'Scores contain a user who is not in this pool' }, 400);
      }
    }

    // Verify all participants have given consent
    for (const participant of participants ?? []) {
      const { data: consent } = await supabaseClient
        .from('pool_consent')
        .select('id')
        .eq('user_id', participant.user_id)
        .eq('pool_id', pool_id)
        .eq('consent_given', true)
        .maybeSingle();

      if (!consent) {
        return json({ error: 'All participants must give consent before tokens are dispersed' }, 400);
      }
    }

    // Use AI to verify winner legitimacy
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');

    const aiResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [{
          role: 'system',
          content: 'You are a security AI that detects cheating and fraud in gaming competitions. Analyze the scores and determine if they are legitimate. Respond with ONLY "LEGITIMATE" or "SUSPICIOUS" followed by a brief reason.'
        }, {
          role: 'user',
          content: `Analyze these competition scores for legitimacy: ${JSON.stringify(participants_scores)}`
        }],
      }),
    });

    const aiData = await aiResponse.json();
    const aiVerdict = aiData?.choices?.[0]?.message?.content ?? 'LEGITIMATE';

    if (String(aiVerdict).includes('SUSPICIOUS')) {
      await supabaseClient.from('security_audit_log').insert({
        user_id: caller.id,
        event_type: 'pool_fraud_detected',
        severity: 'high',
        metadata: { pool_id, ai_verdict: aiVerdict, scores: participants_scores },
      });

      return json({ error: 'Suspicious activity detected. Pool cancelled.' }, 400);
    }

    // Determine winner (highest score)
    let winnerId: string | null = null;
    let highestScore = -Infinity;

    for (const [userId, score] of scoreEntries) {
      const numScore = typeof score === 'number' ? score : parseFloat(String(score));
      if (!Number.isFinite(numScore)) return json({ error: 'Invalid score value' }, 400);

      if (numScore > highestScore) {
        highestScore = numScore;
        winnerId = userId;
      }

      await supabaseClient
        .from('pool_participants')
        .update({ score: numScore })
        .eq('pool_id', pool_id)
        .eq('user_id', userId);
    }

    if (!winnerId) return json({ error: 'No winner determined' }, 400);

    const totalPool = Number(pool.total_pool);
    const commission = totalPool * Number(pool.commission_rate);
    const winnerPayout = totalPool - commission;

    const { data: winnerWallet } = await supabaseClient
      .from('user_wallets')
      .select('balance')
      .eq('user_id', winnerId)
      .maybeSingle();

    if (winnerWallet) {
      await supabaseClient
        .from('user_wallets')
        .update({ balance: Number(winnerWallet.balance) + winnerPayout })
        .eq('user_id', winnerId);
    } else {
      await supabaseClient
        .from('user_wallets')
        .insert({ user_id: winnerId, balance: winnerPayout });
    }

    await supabaseClient.from('wallet_transactions').insert({
      user_id: winnerId,
      amount: winnerPayout,
      transaction_type: 'pool_winnings',
      description: `Won token pool: ${pool.pool_name}`,
    });

    await supabaseClient.from('pool_transactions').insert({
      pool_id,
      user_id: winnerId,
      transaction_type: 'winnings',
      amount: winnerPayout,
      description: 'Pool prize winnings',
    });

    const { data: cyberlinkWallet } = await supabaseClient
      .from('user_wallets')
      .select('balance')
      .eq('user_id', CYBERLINK_ACCOUNT_ID)
      .maybeSingle();

    if (cyberlinkWallet) {
      await supabaseClient
        .from('user_wallets')
        .update({ balance: Number(cyberlinkWallet.balance) + commission })
        .eq('user_id', CYBERLINK_ACCOUNT_ID);
    } else {
      await supabaseClient
        .from('user_wallets')
        .insert({ user_id: CYBERLINK_ACCOUNT_ID, balance: commission });
    }

    await supabaseClient.from('wallet_transactions').insert({
      user_id: CYBERLINK_ACCOUNT_ID,
      amount: commission,
      transaction_type: 'pool_commission',
      description: `Pool commission from ${pool.pool_name}`,
    });

    await supabaseClient.from('pool_transactions').insert({
      pool_id,
      user_id: CYBERLINK_ACCOUNT_ID,
      transaction_type: 'commission',
      amount: commission,
      description: 'Pool commission',
    });

    await supabaseClient
      .from('token_pools')
      .update({ winner_id: winnerId, status: 'completed', completed_at: new Date().toISOString() })
      .eq('id', pool_id)
      .is('winner_id', null);

    await supabaseClient.from('security_audit_log').insert({
      user_id: caller.id,
      event_type: 'pool_completed',
      metadata: {
        pool_id,
        winner_id: winnerId,
        total_pool: totalPool,
        commission,
        winnings: winnerPayout,
        settled_by: caller.id,
      },
    });

    return json({ success: true, winner_id: winnerId, winnings: winnerPayout, commission });
  } catch (error) {
    console.error('Error determining winner:', error);
    return json({ error: 'Failed to settle pool' }, 400);
  }
});
