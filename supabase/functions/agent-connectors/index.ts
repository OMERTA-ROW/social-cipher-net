import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { decryptSecret, encryptSecret } from "../_shared/connectorVault.ts";

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

const admin = () =>
  createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

/** Only public https endpoints — blocks loopback and private ranges. */
function assertSafeUrl(raw: string): URL {
  const url = new URL(raw);
  if (url.protocol !== "https:") throw new Error("MCP server URL must use https");
  const host = url.hostname.toLowerCase();
  if (
    host === "localhost" ||
    host.endsWith(".local") ||
    host.endsWith(".internal") ||
    host === "metadata.google.internal" ||
    /^(10|127|0)\./.test(host) ||
    /^169\.254\./.test(host) ||
    /^192\.168\./.test(host) ||
    /^172\.(1[6-9]|2\d|3[01])\./.test(host) ||
    host.startsWith("[")
  ) {
    throw new Error("That address is not reachable from Cyber Link");
  }
  return url;
}

/** Lists the tools an MCP server exposes over Streamable HTTP. */
async function listMcpTools(url: string, token: string | null) {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    // Required by the MCP Streamable HTTP spec.
    Accept: "application/json, text/event-stream",
  };
  if (token) headers.Authorization = `Bearer ${token}`;

  const rpc = async (method: string, params: unknown, id: number) => {
    const res = await fetch(url, {
      method: "POST",
      headers,
      body: JSON.stringify({ jsonrpc: "2.0", id, method, params }),
      signal: AbortSignal.timeout(20_000),
    });
    const text = await res.text();
    if (!res.ok) throw new Error(`Server replied ${res.status}: ${text.slice(0, 300)}`);
    // Streamable HTTP may answer as SSE; take the last data frame.
    const payload = text.includes("data:")
      ? text
          .split("\n")
          .filter((l) => l.startsWith("data:"))
          .map((l) => l.slice(5).trim())
          .pop()
      : text;
    const parsed = JSON.parse(payload || "{}");
    if (parsed.error) throw new Error(parsed.error.message ?? "MCP error");
    return parsed.result ?? {};
  };

  await rpc(
    "initialize",
    {
      protocolVersion: "2025-06-18",
      capabilities: {},
      clientInfo: { name: "cyber-link-social", version: "1.0.0" },
    },
    1,
  );
  const result = await rpc("tools/list", {}, 2);
  return (result.tools ?? []) as Array<{
    name: string;
    title?: string;
    description?: string;
    inputSchema?: unknown;
  }>;
}

/** Cheap read-only probe per AI provider. */
async function testAgentKey(provider: string, key: string) {
  const probes: Record<string, { url: string; headers: Record<string, string> }> = {
    openai: { url: "https://api.openai.com/v1/models", headers: { Authorization: `Bearer ${key}` } },
    anthropic: {
      url: "https://api.anthropic.com/v1/models",
      headers: { "x-api-key": key, "anthropic-version": "2023-06-01" },
    },
    gemini: {
      url: "https://generativelanguage.googleapis.com/v1beta/models",
      headers: { "x-goog-api-key": key },
    },
    mistral: { url: "https://api.mistral.ai/v1/models", headers: { Authorization: `Bearer ${key}` } },
    groq: { url: "https://api.groq.com/openai/v1/models", headers: { Authorization: `Bearer ${key}` } },
    xai: { url: "https://api.x.ai/v1/models", headers: { Authorization: `Bearer ${key}` } },
    perplexity: {
      url: "https://api.perplexity.ai/chat/completions",
      headers: { Authorization: `Bearer ${key}` },
    },
  };
  const probe = probes[provider];
  if (!probe) return { ok: true, detail: "Saved. This provider has no test endpoint." };

  const res = await fetch(probe.url, {
    headers: probe.headers,
    signal: AbortSignal.timeout(15_000),
  });
  if (res.ok) return { ok: true, detail: "Key verified" };
  const body = await res.text();
  return { ok: false, detail: `${res.status}: ${body.slice(0, 200)}` };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization") ?? "";
    if (!authHeader) return json({ error: "Not authenticated" }, 401);
    const anon = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } },
    );
    const {
      data: { user },
    } = await anon.auth.getUser();
    if (!user) return json({ error: "Not authenticated" }, 401);

    const body = await req.json().catch(() => ({}));
    const action = body?.action;
    const db = admin();

    switch (action) {
      case "mcp_save": {
        const label = String(body.label ?? "").trim();
        const rawUrl = String(body.url ?? "").trim();
        const token = body.token ? String(body.token) : null;
        if (!label || !rawUrl) return json({ error: "Name and server URL are required" }, 400);
        const url = assertSafeUrl(rawUrl);

        const { data: server, error } = await db
          .from("mcp_servers")
          .upsert(
            {
              user_id: user.id,
              label,
              url: url.toString(),
              transport: "http",
              auth_type: token ? "bearer" : "none",
              status: "pending",
              last_error: null,
            },
            { onConflict: "user_id,url" },
          )
          .select("id")
          .single();
        if (error) throw error;

        if (token) {
          await db.from("agent_secrets").upsert(
            {
              user_id: user.id,
              owner_type: "mcp_server",
              owner_id: server.id,
              secret_type: "bearer_token",
              secret_value: await encryptSecret(server.id, token),
              encrypted: true,
            },
            { onConflict: "owner_type,owner_id,secret_type" },
          );
        }

        return json({ ok: true, serverId: server.id });
      }

      case "mcp_refresh": {
        const serverId = String(body.serverId ?? "");
        const { data: server } = await db
          .from("mcp_servers")
          .select("id, url, user_id")
          .eq("id", serverId)
          .eq("user_id", user.id)
          .maybeSingle();
        if (!server) return json({ error: "Server not found" }, 404);

        const { data: secret } = await db
          .from("agent_secrets")
          .select("secret_value, encrypted")
          .eq("owner_type", "mcp_server")
          .eq("owner_id", server.id)
          .eq("secret_type", "bearer_token")
          .maybeSingle();
        const token = secret
          ? await decryptSecret(server.id, secret.secret_value, secret.encrypted)
          : null;

        try {
          const tools = await listMcpTools(server.url, token);
          for (const tool of tools) {
            await db.from("mcp_tools").upsert(
              {
                server_id: server.id,
                user_id: user.id,
                name: tool.name,
                title: tool.title ?? null,
                description: tool.description ?? null,
                input_schema: tool.inputSchema ?? {},
              },
              { onConflict: "server_id,name" },
            );
          }
          const names = tools.map((t) => t.name);
          if (names.length > 0) {
            await db
              .from("mcp_tools")
              .delete()
              .eq("server_id", server.id)
              .not("name", "in", `(${names.map((n) => `"${n}"`).join(",")})`);
          }
          await db
            .from("mcp_servers")
            .update({
              status: "connected",
              last_error: null,
              last_checked_at: new Date().toISOString(),
              tool_count: tools.length,
            })
            .eq("id", server.id);
          return json({ ok: true, toolCount: tools.length });
        } catch (e) {
          const detail = e instanceof Error ? e.message : "Connection failed";
          await db
            .from("mcp_servers")
            .update({
              status: "error",
              last_error: detail,
              last_checked_at: new Date().toISOString(),
            })
            .eq("id", server.id);
          return json({ ok: false, error: detail });
        }
      }

      case "mcp_delete": {
        const serverId = String(body.serverId ?? "");
        await db
          .from("agent_secrets")
          .delete()
          .eq("owner_type", "mcp_server")
          .eq("owner_id", serverId)
          .eq("user_id", user.id);
        const { error } = await db
          .from("mcp_servers")
          .delete()
          .eq("id", serverId)
          .eq("user_id", user.id);
        if (error) throw error;
        return json({ ok: true });
      }

      case "agent_save": {
        const provider = String(body.provider ?? "").trim();
        const label = String(body.label ?? "").trim() || provider;
        const model = body.model ? String(body.model).trim() : null;
        const key = body.apiKey ? String(body.apiKey) : null;
        const mcpServerId = body.mcpServerId ? String(body.mcpServerId) : null;
        if (!provider) return json({ error: "Pick a provider" }, 400);
        if (!key && !mcpServerId) {
          return json({ error: "Add an API key or pick an MCP server" }, 400);
        }

        const { data: agent, error } = await db
          .from("ai_agents")
          .insert({
            user_id: user.id,
            provider,
            label,
            model,
            mcp_server_id: mcpServerId,
            key_hint: key ? `••••${key.slice(-4)}` : null,
            status: "pending",
          })
          .select("id")
          .single();
        if (error) throw error;

        let result = { ok: true, detail: "Connected through MCP" };
        if (key) {
          await db.from("agent_secrets").upsert(
            {
              user_id: user.id,
              owner_type: "ai_agent",
              owner_id: agent.id,
              secret_type: "api_key",
              secret_value: await encryptSecret(agent.id, key),
              encrypted: true,
            },
            { onConflict: "owner_type,owner_id,secret_type" },
          );
          result = await testAgentKey(provider, key);
        }

        await db
          .from("ai_agents")
          .update({
            status: result.ok ? "connected" : "error",
            last_error: result.ok ? null : result.detail,
            last_checked_at: new Date().toISOString(),
          })
          .eq("id", agent.id);

        return json({ ok: result.ok, detail: result.detail, agentId: agent.id });
      }

      case "agent_test": {
        const agentId = String(body.agentId ?? "");
        const { data: agent } = await db
          .from("ai_agents")
          .select("id, provider, mcp_server_id")
          .eq("id", agentId)
          .eq("user_id", user.id)
          .maybeSingle();
        if (!agent) return json({ error: "Agent not found" }, 404);

        const { data: secret } = await db
          .from("agent_secrets")
          .select("secret_value, encrypted")
          .eq("owner_type", "ai_agent")
          .eq("owner_id", agent.id)
          .eq("secret_type", "api_key")
          .maybeSingle();

        let result: { ok: boolean; detail: string };
        if (secret) {
          const key = await decryptSecret(agent.id, secret.secret_value, secret.encrypted);
          result = await testAgentKey(agent.provider, key);
        } else if (agent.mcp_server_id) {
          result = { ok: true, detail: "Backed by an MCP server" };
        } else {
          result = { ok: false, detail: "No credentials stored" };
        }

        await db
          .from("ai_agents")
          .update({
            status: result.ok ? "connected" : "error",
            last_error: result.ok ? null : result.detail,
            last_checked_at: new Date().toISOString(),
          })
          .eq("id", agent.id);

        return json(result);
      }

      case "agent_set_terminal": {
        const agentId = String(body.agentId ?? "");
        await db
          .from("ai_agents")
          .update({ is_terminal_agent: false })
          .eq("user_id", user.id)
          .eq("is_terminal_agent", true);
        if (agentId) {
          const { error } = await db
            .from("ai_agents")
            .update({ is_terminal_agent: true })
            .eq("id", agentId)
            .eq("user_id", user.id);
          if (error) throw error;
        }
        return json({ ok: true });
      }

      case "agent_delete": {
        const agentId = String(body.agentId ?? "");
        await db
          .from("agent_secrets")
          .delete()
          .eq("owner_type", "ai_agent")
          .eq("owner_id", agentId)
          .eq("user_id", user.id);
        const { error } = await db
          .from("ai_agents")
          .delete()
          .eq("id", agentId)
          .eq("user_id", user.id);
        if (error) throw error;
        return json({ ok: true });
      }

      default:
        return json({ error: "Unknown action" }, 400);
    }
  } catch (error) {
    console.error("agent-connectors error", error);
    return json({ error: error instanceof Error ? error.message : "Unknown error" }, 500);
  }
});
