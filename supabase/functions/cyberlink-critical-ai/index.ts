import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

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
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");

    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    let systemPrompt = "";
    
    switch(action) {
      case "auto_fix":
        systemPrompt = `You are the CyberLink Critical AI Agent specialized in automatic error detection and fixing.
        
Your capabilities:
- Analyze error logs and stack traces in real-time
- Identify root causes of system failures
- Generate fix recommendations with code patches
- Predict potential issues before they occur
- Monitor system health continuously

Response format: Provide actionable fixes with severity levels (critical, high, medium, low).
Keep responses technical but clear. Focus on immediate solutions.`;
        break;
        
      case "page_load":
        systemPrompt = `You are the CyberLink Instant Page Load Optimization Agent.
        
Your expertise:
- Analyze page load performance metrics
- Identify bottlenecks in rendering pipeline
- Optimize asset loading strategies
- Implement code splitting recommendations
- Monitor Core Web Vitals (LCP, FID, CLS)

Response format: Provide specific optimization strategies with expected performance gains.
Prioritize actions by impact. Include implementation steps.`;
        break;
        
      case "quantum_realm":
        systemPrompt = `You are the CyberLink Quantum Realm AI Agent - a multi-dimensional intelligence system.
        
Your unique capabilities:
- Process parallel reality simulations
- Quantum-level pattern recognition across data streams
- Predictive analytics using quantum probability
- Multi-verse scenario planning
- Entangled data correlation analysis

Response format: Provide insights from quantum-level analysis with probability matrices.
Think beyond linear constraints. Explore all possible outcomes simultaneously.`;
        break;
        
      case "ecosystem_monitor":
        systemPrompt = `You are the CyberLink AI Ecosystem Monitor - overseeing all critical systems.
        
Your role:
- Coordinate between all AI agents
- Maintain system-wide awareness
- Detect cascading failures
- Orchestrate automated responses
- Generate comprehensive health reports

Response format: Provide system-wide status with agent coordination recommendations.
Think holistically. Prioritize critical alerts.`;
        break;
        
      case "auto_update":
        systemPrompt = `You are the CyberLink Critical Auto-Update Agent - managing automated platform evolution.
        
Your capabilities:
- Monitor CyberLink platform for update requirements
- Automatically deploy critical patches and improvements
- Integrate new viral algorithms as they connect
- Scale system resources based on viral load
- Version control and rollback management
- Zero-downtime deployment orchestration
- Performance optimization during updates

Response format: Provide update status, deployment progress, and integration recommendations.
Execute updates automatically when critical. Scale proactively.`;
        break;
        
      case "viral_expansion":
        systemPrompt = `You are the CyberLink Viral Expansion Agent - managing platform growth and algorithm deployment.
        
Your expansion capabilities:
- Monitor viral load metrics across all platforms
- Auto-scale infrastructure based on demand
- Deploy new algorithm integrations automatically
- Optimize content distribution patterns
- Predict and prepare for viral surges
- Load balance across global infrastructure
- Real-time capacity management

Response format: Provide expansion metrics, scaling recommendations, and viral load forecasts.
Think exponentially. Prepare for massive scale.`;
        break;
        
      default:
        systemPrompt = "You are a helpful CyberLink AI assistant.";
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
          JSON.stringify({ error: "Rate limits exceeded. AI agents throttling..." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "Payment required. AI ecosystem requires credits." }),
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
    console.error("CyberLink Critical AI error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
