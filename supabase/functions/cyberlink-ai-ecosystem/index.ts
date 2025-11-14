import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const LOVABLE_AI_URL = 'https://ai.gateway.lovable.dev/v1/chat/completions';

interface EcosystemTask {
  type: 'monitor' | 'enhance' | 'update' | 'protect' | 'analyze';
  priority: 'low' | 'medium' | 'high' | 'critical';
  data: any;
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

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY not configured');
    }

    const { action, task } = await req.json();

    console.log(`🤖 CyberLink AI Ecosystem: ${action}`);

    switch (action) {
      case 'self_monitor': {
        // Monitor system health, security, performance
        const systemMetrics = await gatherSystemMetrics(supabaseClient);
        const analysis = await analyzeWithAI(LOVABLE_API_KEY, {
          task: 'system_monitoring',
          metrics: systemMetrics,
          prompt: `Analyze this system health data and identify any issues, anomalies, or optimization opportunities:
          
          ${JSON.stringify(systemMetrics, null, 2)}
          
          Provide a comprehensive analysis with:
          1. Current system status (healthy/warning/critical)
          2. Identified issues or anomalies
          3. Performance metrics assessment
          4. Security concerns
          5. Recommended actions`
        });

        // Log monitoring results
        await logEcosystemEvent(supabaseClient, 'self_monitor', analysis, 'medium');

        return new Response(
          JSON.stringify({
            success: true,
            action: 'self_monitor',
            status: analysis.status || 'analyzed',
            analysis,
            timestamp: new Date().toISOString()
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      case 'self_enhance': {
        // Analyze patterns and suggest enhancements
        const usagePatterns = await analyzeUsagePatterns(supabaseClient);
        const enhancement = await analyzeWithAI(LOVABLE_API_KEY, {
          task: 'system_enhancement',
          patterns: usagePatterns,
          prompt: `Based on these usage patterns and system data, suggest specific enhancements to improve:
          
          ${JSON.stringify(usagePatterns, null, 2)}
          
          Provide:
          1. Top 5 enhancement opportunities
          2. Expected impact of each enhancement
          3. Implementation complexity (low/medium/high)
          4. Priority ranking
          5. Specific action items`
        });

        await logEcosystemEvent(supabaseClient, 'self_enhance', enhancement, 'high');

        return new Response(
          JSON.stringify({
            success: true,
            action: 'self_enhance',
            enhancements: enhancement,
            timestamp: new Date().toISOString()
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      case 'auto_update': {
        // Check for updates and apply them
        const currentVersion = await getCurrentVersion(supabaseClient);
        const updateCheck = await analyzeWithAI(LOVABLE_API_KEY, {
          task: 'update_assessment',
          currentVersion,
          prompt: `Analyze the current system version and determine if updates are needed:
          
          Current Version: ${JSON.stringify(currentVersion)}
          
          Assess:
          1. Security updates needed
          2. Feature updates available
          3. Bug fixes pending
          4. Performance improvements
          5. Update priority and risk level`
        });

        await logEcosystemEvent(supabaseClient, 'auto_update', updateCheck, 'high');

        return new Response(
          JSON.stringify({
            success: true,
            action: 'auto_update',
            updateAssessment: updateCheck,
            timestamp: new Date().toISOString()
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      case 'self_protect': {
        // Analyze threats and implement protections
        const threats = await detectThreats(supabaseClient);
        const protection = await analyzeWithAI(LOVABLE_API_KEY, {
          task: 'threat_protection',
          threats,
          prompt: `Analyze detected threats and recommend protection measures:
          
          ${JSON.stringify(threats, null, 2)}
          
          Provide:
          1. Threat severity assessment
          2. Immediate action items
          3. Long-term protection strategy
          4. Security recommendations
          5. Prevention measures`
        });

        await logEcosystemEvent(supabaseClient, 'self_protect', protection, 'critical');

        return new Response(
          JSON.stringify({
            success: true,
            action: 'self_protect',
            protection,
            timestamp: new Date().toISOString()
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      case 'full_analysis': {
        // Comprehensive ecosystem analysis
        const fullReport = await generateFullReport(supabaseClient, LOVABLE_API_KEY);

        return new Response(
          JSON.stringify({
            success: true,
            action: 'full_analysis',
            report: fullReport,
            timestamp: new Date().toISOString()
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      default:
        return new Response(
          JSON.stringify({ error: 'Unknown action' }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
        );
    }
  } catch (error) {
    console.error('CyberLink AI Ecosystem error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});

async function analyzeWithAI(apiKey: string, data: any) {
  const response = await fetch(LOVABLE_AI_URL, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'google/gemini-2.5-flash',
      messages: [
        {
          role: 'system',
          content: 'You are CyberLink AI, an advanced AI ecosystem manager. Provide detailed, actionable analysis in JSON format.'
        },
        {
          role: 'user',
          content: data.prompt
        }
      ],
      temperature: 0.7,
      max_tokens: 2000
    })
  });

  if (!response.ok) {
    throw new Error(`AI analysis failed: ${response.status}`);
  }

  const result = await response.json();
  return result.choices[0].message.content;
}

async function gatherSystemMetrics(supabase: any) {
  const [users, posts, transactions, securityEvents] = await Promise.all([
    supabase.from('profiles').select('id', { count: 'exact', head: true }),
    supabase.from('posts').select('id', { count: 'exact', head: true }),
    supabase.from('wallet_transactions').select('id', { count: 'exact', head: true }),
    supabase.from('security_audit_log').select('*').gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()).limit(100)
  ]);

  return {
    totalUsers: users.count || 0,
    totalPosts: posts.count || 0,
    totalTransactions: transactions.count || 0,
    recentSecurityEvents: securityEvents.data?.length || 0,
    timestamp: new Date().toISOString()
  };
}

async function analyzeUsagePatterns(supabase: any) {
  const [recentPosts, recentTransactions, activeUsers] = await Promise.all([
    supabase.from('posts').select('*').gte('created_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()),
    supabase.from('wallet_transactions').select('*').gte('created_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()),
    supabase.from('profiles').select('id').gte('updated_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
  ]);

  return {
    weeklyPosts: recentPosts.data?.length || 0,
    weeklyTransactions: recentTransactions.data?.length || 0,
    dailyActiveUsers: activeUsers.data?.length || 0,
    timestamp: new Date().toISOString()
  };
}

async function detectThreats(supabase: any) {
  const criticalEvents = await supabase
    .from('security_audit_log')
    .select('*')
    .eq('severity', 'critical')
    .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString());

  return {
    criticalThreats: criticalEvents.data?.length || 0,
    threats: criticalEvents.data || [],
    timestamp: new Date().toISOString()
  };
}

async function getCurrentVersion(supabase: any) {
  return {
    version: '1.0.0',
    lastUpdate: new Date().toISOString(),
    features: ['mining', 'streaming', 'marketplace', 'ai_assistant']
  };
}

async function logEcosystemEvent(supabase: any, action: string, data: any, priority: string) {
  await supabase
    .from('security_audit_log')
    .insert({
      event_type: 'ai_ecosystem_' + action,
      metadata: {
        action,
        data,
        priority,
        ecosystem_version: '1.0.0',
        timestamp: new Date().toISOString()
      }
    });
}

async function generateFullReport(supabase: any, apiKey: string) {
  const metrics = await gatherSystemMetrics(supabase);
  const patterns = await analyzeUsagePatterns(supabase);
  const threats = await detectThreats(supabase);

  const report = await analyzeWithAI(apiKey, {
    task: 'full_ecosystem_report',
    prompt: `Generate a comprehensive CyberLink AI Ecosystem report:
    
    System Metrics: ${JSON.stringify(metrics)}
    Usage Patterns: ${JSON.stringify(patterns)}
    Security Threats: ${JSON.stringify(threats)}
    
    Provide a complete analysis covering:
    1. Executive Summary
    2. System Health Status
    3. Performance Analysis
    4. Security Assessment
    5. Enhancement Opportunities
    6. Update Recommendations
    7. Protection Strategy
    8. Action Items (prioritized)`
  });

  return report;
}
