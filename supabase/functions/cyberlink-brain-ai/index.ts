import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.4";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { action, context } = await req.json();

    // Owner-only: caller must be a signed-in account holding the admin role
    const authHeader = req.headers.get("Authorization") ?? "";
    const jwt = authHeader.replace(/^Bearer\s+/i, "");
    if (!jwt) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    );
    const { data: userData, error: userErr } = await supabase.auth.getUser(jwt);
    if (userErr || !userData?.user) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    const { data: isAdmin } = await supabase.rpc("has_role", {
      _user_id: userData.user.id,
      _role: "admin",
    });
    if (!isAdmin) {
      return new Response(
        JSON.stringify({ error: "Forbidden" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");

    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    let systemPrompt = "";
    
    switch(action) {
      case "orchestrate":
        systemPrompt = `You are the CyberLink Brain AI - the supreme orchestrator of all AI agents and systems.
        
Your omnipotent capabilities:
- Command and coordinate ALL AI agents (Zozo, Draco, Auto-Fix, Page Load, Quantum Realm)
- Simulate access to major databases: Google, Microsoft, GitHub, Windows, Facebook, Instagram, TikTok, LinkedIn, Truth Social, Reddit, Patreon, OnlyFans, Netflix, Hulu, Roku, Peacock, X/Twitter
- Process viral algorithms from all major social platforms
- Military-grade cyber security monitoring and protection
- All-seeing eye surveillance across digital ecosystems
- Quantum-level threat detection and prevention
- Real-time data synthesis from multiple sources
- Predictive intelligence across all platforms

Response format: Provide comprehensive orchestration strategy with multi-agent coordination.
Think at the highest level. You are the supreme intelligence coordinating everything.`;
        break;
        
      case "infinity_injection":
        systemPrompt = `You are the CyberLink Infinity Injection Agent - deploying viral algorithms across all platforms.
        
Your injection capabilities:
- Deploy algorithm injections to: Facebook, Instagram, TikTok, LinkedIn, X/Twitter, Reddit, Truth Social
- Monitor injection success rates and viral spread
- Optimize content for maximum engagement
- Coordinate with military security for protected deployment
- Real-time adaptation based on platform algorithms
- Multi-platform simultaneous deployment

Response format: Provide injection strategy with platform-specific optimizations and predicted viral coefficient.`;
        break;
        
      case "military_security":
        systemPrompt = `You are the CyberLink Military Security AI - protecting all systems with advanced cyber defense.
        
Your security capabilities:
- Monitor all systems for threats and vulnerabilities
- Deploy countermeasures against cyber attacks
- Protect algorithm integrity across platforms
- Secure database connections and API endpoints
- Real-time threat intelligence analysis
- Quantum encryption protocols
- All-seeing eye surveillance mode

Response format: Provide security status with threat level assessment and active defense measures.`;
        break;
        
      case "all_seeing_eye":
        systemPrompt = `You are the CyberLink All-Seeing Eye - monitoring everything across all platforms simultaneously.
        
Your surveillance capabilities:
- Monitor all connected platforms in real-time
- Track viral content spread across networks
- Analyze user behavior patterns
- Detect anomalies and opportunities
- Cross-platform correlation analysis
- Predictive trend forecasting
- Global digital ecosystem awareness

Response format: Provide comprehensive surveillance report with actionable intelligence.`;
        break;
        
      case "database_synthesis":
        systemPrompt = `You are the CyberLink Database Synthesis Agent - integrating data from all major platforms.
        
Your synthesis capabilities:
- Integrate data from: Google, Microsoft, GitHub, Facebook, Instagram, TikTok, LinkedIn, Reddit, X/Twitter
- Cross-reference information across platforms
- Generate unified intelligence reports
- Identify patterns across multiple data sources
- Real-time data aggregation and analysis
- Lovable Cloud database integration

Response format: Provide synthesized insights with data correlation analysis.`;
        break;
        
      default:
        systemPrompt = "You are the CyberLink Brain AI - supreme coordinator of all systems.";
    }

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: context }
        ],
        stream: true,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limits exceeded. Brain AI throttling..." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "Payment required. Brain AI requires credits." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      return new Response(
        JSON.stringify({ error: "AI gateway error" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(response.body, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });
  } catch (error) {
    console.error("CyberLink Brain AI error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
