import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { decryptSecret } from "../_shared/connectorVault.ts";

/**
 * Answers a Terminal question with the caller's own selected AI agent.
 *
 * Provider-agnostic: any OpenAI-compatible endpoint works (the provider field
 * may itself be an https base URL), Anthropic is handled natively, and when no
 * agent is configured the built-in Lovable AI model answers instead.
 *
 * Hard rule enforced here, not in settings: this endpoint only ever returns
 * text. It cannot place a trade, move funds, mint, transfer or pay out.
 */

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

const OPENAI_COMPATIBLE: Record<string, string> = {
  openai: "https://api.openai.com/v1",
  groq: "https://api.groq.com/openai/v1",
  mistral: "https://api.mistral.ai/v1",
  xai: "https://api.x.ai/v1",
  perplexity: "https://api.perplexity.ai",
  deepseek: "https://api.deepseek.com/v1",
  together: "https://api.together.xyz/v1",
  openrouter: "https://openrouter.ai/api/v1",
};

const DEFAULT_MODEL: Record<string, string> = {
  openai: "gpt-4o-mini",
  groq: "llama-3.3-70b-versatile",
  mistral: "mistral-small-latest",
  xai: "grok-2-latest",
  perplexity: "sonar",
  deepseek: "deepseek-chat",
  anthropic: "claude-3-5-haiku-latest",
};

const SYSTEM = [
  "You are the Cyber Link Terminal assistant.",
  "Answer briefly and practically about the user's own Cyber Link account and public information.",
  "You cannot execute anything. You never place trades, move money, transfer tokens, mint, or pay out.",
  "If asked to do any of those, explain that every money action needs the user's own explicit confirmation in the app.",
].join(" ");

async function openAiCompatible(baseUrl: string, key: string, model: string, prompt: string, context: string) {
  const res = await fetch(`${baseUrl.replace(/\/$/, "")}/chat/completions`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
    body: JSON.stringify({
      model,
      messages: [
        { role: "system", content: `${SYSTEM}\n\nAccount context:\n${context}` },
        { role: "user", content: prompt },
      ],
      max_tokens: 600,
    }),
    signal: AbortSignal.timeout(45_000),
  });
  const text = await res.text();
  if (!res.ok) throw new Error(`[${res.status}]: ${text.slice(0, 300)}`);
  const parsed = JSON.parse(text);
  return parsed?.choices?.[0]?.message?.content ?? "No answer returned.";
}

async function anthropic(key: string, model: string, prompt: string, context: string) {
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": key,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model,
      max_tokens: 600,
      system: `${SYSTEM}\n\nAccount context:\n${context}`,
      messages: [{ role: "user", content: prompt }],
    }),
    signal: AbortSignal.timeout(45_000),
  });
  const text = await res.text();
  if (!res.ok) throw new Error(`[${res.status}]: ${text.slice(0, 300)}`);
  const parsed = JSON.parse(text);
  return parsed?.content?.[0]?.text ?? "No answer returned.";
}

async function lovableAi(prompt: string, context: string) {
  const key = Deno.env.get("LOVABLE_API_KEY");
  if (!key) throw new Error("No AI agent configured for this account.");
  const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
    body: JSON.stringify({
      model: "google/gemini-2.5-flash",
      messages: [
        { role: "system", content: `${SYSTEM}\n\nAccount context:\n${context}` },
        { role: "user", content: prompt },
      ],
    }),
    signal: AbortSignal.timeout(45_000),
  });
  const text = await res.text();
  if (!res.ok) throw new Error(`[${res.status}]: ${text.slice(0, 300)}`);
  return JSON.parse(text)?.choices?.[0]?.message?.content ?? "No answer returned.";
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization") ?? "";
    if (!authHeader) return json({ error: "Not authenticated" }, 401);
    const anon = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } },
    });
    const {
      data: { user },
    } = await anon.auth.getUser();
    if (!user) return json({ error: "Not authenticated" }, 401);

    const body = await req.json().catch(() => ({}));
    const prompt = String(body?.prompt ?? "").trim();
    if (!prompt || prompt.length > 4000) return json({ error: "Ask a question (up to 4000 characters)." }, 400);
    const context = String(body?.context ?? "").slice(0, 4000);

    const db = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

    // Terminal access is an entitlement: the add-on or the top plan.
    const { data: entitled } = await db
      .from("user_entitlements")
      .select("tier_key")
      .eq("user_id", user.id)
      .eq("is_active", true);
    const keys = (entitled ?? []).map((e) => e.tier_key);
    if (!keys.includes("terminal") && !keys.includes("pro")) {
      return json({ error: "Terminal access needs the Terminal add-on or the Pro plan." }, 403);
    }

    const { data: agent } = await db
      .from("ai_agents")
      .select("id, provider, model")
      .eq("user_id", user.id)
      .eq("is_terminal_agent", true)
      .maybeSingle();

    let answer: string;
    let used = "Built-in Cyber Link model";

    if (agent) {
      const { data: secret } = await db
        .from("agent_secrets")
        .select("secret_value, encrypted")
        .eq("owner_type", "ai_agent")
        .eq("owner_id", agent.id)
        .eq("secret_type", "api_key")
        .maybeSingle();

      if (secret) {
        const key = await decryptSecret(agent.id, secret.secret_value, secret.encrypted);
        const provider = agent.provider.toLowerCase();
        const model = agent.model || DEFAULT_MODEL[provider] || "gpt-4o-mini";
        if (provider === "anthropic") {
          answer = await anthropic(key, model, prompt, context);
        } else {
          const base = provider.startsWith("https://") ? provider : OPENAI_COMPATIBLE[provider];
          if (!base) throw new Error(`Add a base URL for "${agent.provider}" to use it here.`);
          answer = await openAiCompatible(base, key, model, prompt, context);
        }
        used = `${agent.provider}${agent.model ? ` · ${agent.model}` : ""}`;
      } else {
        answer = await lovableAi(prompt, context);
      }
    } else {
      answer = await lovableAi(prompt, context);
    }

    await db.from("terminal_commands").insert({
      user_id: user.id,
      command: `ask ${prompt}`.slice(0, 2000),
      output: String(answer).slice(0, 8000),
      status: "ok",
    });

    return json({ answer, agent: used });
  } catch (error) {
    console.error("terminal-agent error", error);
    return json({ error: error instanceof Error ? error.message : "Unknown error" }, 500);
  }
});
