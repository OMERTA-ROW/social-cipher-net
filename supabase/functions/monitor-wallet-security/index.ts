import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface SecurityEvent {
  user_id: string;
  event_type: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  metadata?: any;
}

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

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) throw new Error('No authorization header');

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser(token);
    
    if (userError || !user) throw new Error('Unauthorized');

    const { action, target, metadata } = await req.json();

    console.log(`🔍 Security monitoring: User ${user.id} performing ${action} on ${target}`);

    // Check if user has been flagged by pattern detection
    const { data: isSuspicious, error: checkError } = await supabaseClient
      .rpc('detect_suspicious_activity', { _user_id: user.id, _event_type: action });

    if (checkError) {
      console.error('Error checking suspicion:', checkError);
    }

    // Detect specific attack patterns
    const suspiciousPatterns = [
      'bulk_balance_check',
      'rapid_wallet_access',
      'unauthorized_crypto_scan',
      'token_enumeration',
      'balance_scraping',
      'rapid_withdrawal_attempt',
      'mining_exploit',
      'api_abuse',
      'credential_stuffing',
      'account_takeover_attempt',
      'rapid_clicking',
      'console_tampering'
    ];

    const isKnownAttackPattern = suspiciousPatterns.includes(action);
    const shouldBlock = isSuspicious || isKnownAttackPattern;

    // Always log the security event
    const severity = shouldBlock ? 'critical' : (isKnownAttackPattern ? 'high' : 'medium');
    await supabaseClient
      .from('security_audit_log')
      .insert({
        user_id: user.id,
        event_type: action,
        ip_address: req.headers.get('x-forwarded-for') || 'unknown',
        user_agent: req.headers.get('user-agent') || 'unknown',
        metadata: {
          action,
          target,
          severity,
          auto_action_pending: shouldBlock,
          additional_data: metadata
        }
      });

    if (shouldBlock) {
      console.log(`🚨 SECURITY ALERT: Malicious activity detected for user ${user.id} - ${action}`);
      
      // Update user profile to mark as compromised
      await supabaseClient
        .from('profiles')
        .update({ 
          is_private: true,
          bio: '⚠️ Account suspended due to security violation'
        })
        .eq('id', user.id);

      // Trigger account deletion process
      const { data: deleteResult, error: deleteError } = await supabaseClient.functions.invoke(
        'delete-suspicious-account',
        {
          body: { 
            user_id: user.id, 
            reason: `Malicious activity detected: ${action}`,
            action 
          }
        }
      );

      if (deleteError) {
        console.error('Error triggering account deletion:', deleteError);
      } else {
        console.log('✅ Account deletion initiated:', deleteResult);
      }

      return new Response(
        JSON.stringify({ 
          success: false,
          blocked: true,
          reason: 'Malicious activity detected. Account flagged for security review and funds confiscated to CyberLink security vault.',
          action_taken: 'account_deletion_initiated'
        }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 403
        }
      );
    }

    return new Response(
      JSON.stringify({ 
        success: true,
        secure: true,
        message: 'Activity verified'
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Security monitoring error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
    );
  }
});
