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

    const { action, target } = await req.json();

    console.log(`Security monitoring: User ${user.id} performing ${action} on ${target}`);

    // Detect suspicious scanning patterns
    const suspiciousPatterns = [
      'bulk_balance_check',
      'rapid_wallet_access',
      'unauthorized_crypto_scan',
      'token_enumeration',
      'balance_scraping'
    ];

    const isSuspicious = suspiciousPatterns.includes(action);

    if (isSuspicious) {
      console.log(`🚨 SECURITY ALERT: Suspicious activity detected for user ${user.id}`);
      
      // Log security event
      await supabaseClient
        .from('security_audit_log')
        .insert({
          user_id: user.id,
          event_type: 'suspicious_wallet_scan',
          ip_address: req.headers.get('x-forwarded-for') || 'unknown',
          user_agent: req.headers.get('user-agent') || 'unknown',
          metadata: {
            action,
            target,
            severity: 'critical',
            auto_action_pending: true
          }
        });

      // Trigger account deletion process
      const { data: deleteResult, error: deleteError } = await supabaseClient.functions.invoke(
        'delete-suspicious-account',
        {
          body: { 
            user_id: user.id, 
            reason: 'Unauthorized wallet scanning detected',
            action 
          }
        }
      );

      if (deleteError) {
        console.error('Error triggering account deletion:', deleteError);
      }

      return new Response(
        JSON.stringify({ 
          success: false,
          blocked: true,
          reason: 'Suspicious activity detected. Account flagged for review.',
          action_taken: 'account_deletion_initiated'
        }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 403
        }
      );
    }

    // Log normal security check
    await supabaseClient
      .from('security_audit_log')
      .insert({
        user_id: user.id,
        event_type: 'wallet_access',
        ip_address: req.headers.get('x-forwarded-for') || 'unknown',
        user_agent: req.headers.get('user-agent') || 'unknown',
        metadata: { action, target, severity: 'low' }
      });

    return new Response(
      JSON.stringify({ 
        success: true,
        secure: true,
        message: 'Wallet access verified'
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
