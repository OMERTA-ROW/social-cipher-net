import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { messages, action } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");

    if (!LOVABLE_API_KEY) {
      return new Response(JSON.stringify({ error: "AI is not configured." }), {
        status: 503,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const authHeader = req.headers.get("Authorization");
    const backendUrl = Deno.env.get("SUPABASE_URL");
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
    if (!authHeader || !backendUrl || !anonKey) {
      return new Response(JSON.stringify({ error: "Sign in to use AI." }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const authClient = createClient(backendUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
      auth: { persistSession: false },
    });
    const { data: { user }, error: authError } = await authClient.auth.getUser();
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Sign in to use AI." }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Different system prompts based on action
    let systemPrompt = "";
    switch (action) {
      case "notification":
        systemPrompt = "You are a notification assistant. Generate brief, clear notifications for the user. Keep responses under 50 words.";
        break;
      case "message":
        systemPrompt = "You are a messaging assistant for CyberLink. Help users craft messages, respond to inquiries, and manage conversations professionally.";
        break;
      case "chat":
        systemPrompt = "You are the CyberLink AI assistant. You help users with platform features, answer questions, and provide helpful guidance.";
        break;
      default:
        systemPrompt = "You are a helpful AI assistant for CyberLink.";
    }

    const safeMessages = Array.isArray(messages)
      ? messages.slice(-20).filter((message) =>
          message && ["user", "assistant"].includes(message.role) && typeof message.content === "string"
        )
      : [];
    if (safeMessages.length === 0) {
      return new Response(JSON.stringify({ error: "Enter a message first." }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const response = await fetch("https://ai.gateway.lovable.dev/v1/responses", {
      method: "POST",
      headers: {
        "Lovable-API-Key": LOVABLE_API_KEY,
        "X-Lovable-AIG-SDK": "fetch",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "openai/gpt-6-astra",
        instructions: systemPrompt,
        input: safeMessages.map((message) => ({
          role: message.role,
          content: [{
            type: message.role === "assistant" ? "output_text" : "input_text",
            text: message.content.slice(0, 12000),
          }],
        })),
        stream: true,
        store: false,
        reasoning: { effort: "medium", summary: "auto" },
        include: ["reasoning.encrypted_content"],
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      let message = errorText;
      try {
        const parsed = JSON.parse(errorText);
        message = parsed?.error?.message || parsed?.message || errorText;
      } catch {
        // Keep the provider's plain-text error.
      }
      return new Response(
        JSON.stringify({ error: message || "AI request failed." }),
        {
          status: response.status,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    return new Response(response.body, {
      headers: {
        ...corsHeaders,
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        ...(response.headers.get("X-Lovable-AIG-Run-ID")
          ? { "X-Lovable-AIG-Run-ID": response.headers.get("X-Lovable-AIG-Run-ID") as string }
          : {}),
      },
    });
  } catch (error) {
    console.error("AI bot error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
