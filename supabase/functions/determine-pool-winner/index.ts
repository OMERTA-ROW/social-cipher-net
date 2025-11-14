import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const CYBERLINK_ACCOUNT_ID = '00000000-0000-0000-0000-000000000000';

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { pool_id, participants_scores } = await req.json();

    // Get pool details
    const { data: pool } = await supabaseClient
      .from('token_pools')
      .select('*')
      .eq('id', pool_id)
      .single();

    if (!pool) throw new Error('Pool not found');

    // Verify all participants have given consent
    const { data: participants } = await supabaseClient
      .from('pool_participants')
      .select('user_id')
      .eq('pool_id', pool_id);

    if (participants) {
      for (const participant of participants) {
        const { data: consent } = await supabaseClient
          .from('pool_consent')
          .select('*')
          .eq('user_id', participant.user_id)
          .eq('pool_id', pool_id)
          .eq('consent_given', true)
          .maybeSingle();

        if (!consent) {
          throw new Error(`Participant ${participant.user_id} has not given biometric consent. Cannot disperse tokens.`);
        }
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
    const aiVerdict = aiData.choices[0].message.content;

    console.log('AI Security Verdict:', aiVerdict);

    if (aiVerdict.includes('SUSPICIOUS')) {
      // Log security event
      await supabaseClient
        .from('security_audit_log')
        .insert({
          event_type: 'pool_fraud_detected',
          metadata: {
            pool_id,
            ai_verdict: aiVerdict,
            scores: participants_scores
          }
        });

      throw new Error('Suspicious activity detected. Pool cancelled.');
    }

    // Determine winner (highest score)
    let winnerId: string | null = null;
    let highestScore = -1;

    for (const [userId, score] of Object.entries(participants_scores)) {
      const numScore = typeof score === 'number' ? score : parseFloat(String(score));
      if (numScore > highestScore) {
        highestScore = numScore;
        winnerId = userId;
      }

      // Update participant score
      await supabaseClient
        .from('pool_participants')
        .update({ score: numScore })
        .eq('pool_id', pool_id)
        .eq('user_id', userId);
    }

    if (!winnerId) throw new Error('No winner determined');

    // Calculate payouts
    const totalPool = pool.total_pool;
    const commission = totalPool * pool.commission_rate;
    const winnerPayout = totalPool - commission;

    // Transfer winnings to winner
    const { data: winnerWallet } = await supabaseClient
      .from('user_wallets')
      .select('balance')
      .eq('user_id', winnerId)
      .single();

    if (winnerWallet) {
      await supabaseClient
        .from('user_wallets')
        .update({ balance: winnerWallet.balance + winnerPayout })
        .eq('user_id', winnerId);

      // Log winner transaction
      await supabaseClient
        .from('wallet_transactions')
        .insert({
          user_id: winnerId,
          amount: winnerPayout,
          transaction_type: 'pool_winnings',
          description: `Won token pool: ${pool.pool_name}`
        });

      await supabaseClient
        .from('pool_transactions')
        .insert({
          pool_id,
          user_id: winnerId,
          transaction_type: 'winnings',
          amount: winnerPayout,
          description: 'Pool prize winnings'
        });
    }

    // Transfer commission to CyberLink
    const { data: cyberlinkWallet } = await supabaseClient
      .from('user_wallets')
      .select('balance')
      .eq('user_id', CYBERLINK_ACCOUNT_ID)
      .single();

    if (cyberlinkWallet) {
      await supabaseClient
        .from('user_wallets')
        .update({ balance: cyberlinkWallet.balance + commission })
        .eq('user_id', CYBERLINK_ACCOUNT_ID);
    } else {
      await supabaseClient
        .from('user_wallets')
        .insert({
          user_id: CYBERLINK_ACCOUNT_ID,
          balance: commission
        });
    }

    // Log commission transaction
    await supabaseClient
      .from('wallet_transactions')
      .insert({
        user_id: CYBERLINK_ACCOUNT_ID,
        amount: commission,
        transaction_type: 'pool_commission',
        description: `Pool commission from ${pool.pool_name}`
      });

    await supabaseClient
      .from('pool_transactions')
      .insert({
        pool_id,
        user_id: CYBERLINK_ACCOUNT_ID,
        transaction_type: 'commission',
        amount: commission,
        description: 'Pool commission (15%)'
      });

    // Update pool status
    await supabaseClient
      .from('token_pools')
      .update({
        winner_id: winnerId,
        status: 'completed',
        completed_at: new Date().toISOString()
      })
      .eq('id', pool_id);

    // Log security event
    await supabaseClient
      .from('security_audit_log')
      .insert({
        event_type: 'pool_completed',
        metadata: {
          pool_id,
          winner_id: winnerId,
          total_pool: totalPool,
          commission,
          winnings: winnerPayout,
          ai_verified: true
        }
      });

    return new Response(
      JSON.stringify({
        success: true,
        winner_id: winnerId,
        winnings: winnerPayout,
        commission
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error determining winner:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
    );
  }
});