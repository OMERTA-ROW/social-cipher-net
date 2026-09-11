import { useCallback, useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Bot, Loader2, Plus, RefreshCw, Terminal, Trash2 } from "lucide-react";

interface Agent {
  id: string;
  provider: string;
  label: string;
  model: string | null;
  key_hint: string | null;
  status: string;
  last_error: string | null;
  last_checked_at: string | null;
  is_terminal_agent: boolean;
  mcp_server_id: string | null;
}

const PROVIDERS = [
  { id: "openai", name: "ChatGPT / OpenAI", model: "gpt-4o-mini" },
  { id: "anthropic", name: "Claude / Anthropic", model: "claude-sonnet-4" },
  { id: "gemini", name: "Gemini / Google", model: "gemini-2.5-flash" },
  { id: "mistral", name: "Mistral", model: "mistral-large-latest" },
  { id: "groq", name: "Groq", model: "llama-3.3-70b" },
  { id: "xai", name: "Grok / xAI", model: "grok-4" },
  { id: "perplexity", name: "Perplexity", model: "sonar" },
  { id: "mcp", name: "An MCP server", model: null },
];

/** Connect outside AI assistants and choose which one backs the Terminal. */
const AiAgentsPanel = () => {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [servers, setServers] = useState<{ id: string; label: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [provider, setProvider] = useState("openai");
  const [label, setLabel] = useState("");
  const [model, setModel] = useState("");
  const [apiKey, setApiKey] = useState("");
  const [mcpServerId, setMcpServerId] = useState("");

  const load = useCallback(async () => {
    const [{ data: agentRows }, { data: serverRows }] = await Promise.all([
      supabase
        .from("ai_agents")
        .select(
          "id, provider, label, model, key_hint, status, last_error, last_checked_at, is_terminal_agent, mcp_server_id",
        )
        .order("created_at", { ascending: true }),
      supabase.from("mcp_servers").select("id, label").eq("status", "connected"),
    ]);
    setAgents((agentRows ?? []) as Agent[]);
    setServers((serverRows ?? []) as { id: string; label: string }[]);
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const call = async (payload: Record<string, unknown>) => {
    const { data, error } = await supabase.functions.invoke("agent-connectors", {
      body: payload,
    });
    if (error) throw new Error(error.message);
    if (data?.error) throw new Error(data.error);
    return data;
  };

  const addAgent = async () => {
    const preset = PROVIDERS.find((p) => p.id === provider);
    if (provider === "mcp" && !mcpServerId) {
      toast.error("Pick one of your MCP servers");
      return;
    }
    if (provider !== "mcp" && !apiKey.trim()) {
      toast.error("Paste the assistant's API key");
      return;
    }
    setBusy("add");
    try {
      const result = await call({
        action: "agent_save",
        provider,
        label: label.trim() || preset?.name,
        model: model.trim() || preset?.model || undefined,
        apiKey: provider === "mcp" ? undefined : apiKey.trim(),
        mcpServerId: provider === "mcp" ? mcpServerId : undefined,
      });
      if (result?.ok === false) toast.error(result.detail || "The key was rejected");
      else toast.success(result?.detail || "Assistant connected");
      setApiKey("");
      setLabel("");
      setModel("");
      load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not connect that assistant");
    } finally {
      setBusy(null);
    }
  };

  const test = async (id: string) => {
    setBusy(id);
    try {
      const result = await call({ action: "agent_test", agentId: id });
      if (result?.ok) toast.success(result.detail || "Working");
      else toast.error(result?.detail || "Not working");
      load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not test that assistant");
    } finally {
      setBusy(null);
    }
  };

  const makeTerminalAgent = async (id: string) => {
    setBusy(id);
    try {
      await call({ action: "agent_set_terminal", agentId: id });
      toast.success("This assistant now powers your Terminal");
      load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not set that assistant");
    } finally {
      setBusy(null);
    }
  };

  const remove = async (id: string) => {
    setBusy(id);
    try {
      await call({ action: "agent_delete", agentId: id });
      toast.success("Assistant removed");
      load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not remove that assistant");
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="space-y-6">
      <Card className="p-5 bg-card/50 backdrop-blur border-primary/20 space-y-4">
        <div className="flex items-center gap-2">
          <Bot className="w-5 h-5 text-primary" />
          <h2 className="text-lg font-semibold">Connect an AI assistant</h2>
        </div>
        <p className="text-sm text-muted-foreground">
          Bring your own assistant in with its key or through an MCP server. Keys are
          encrypted on our servers. Assistants only ever get the same limited access the
          Terminal itself has.
        </p>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <Label>Assistant</Label>
            <Select value={provider} onValueChange={setProvider}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {PROVIDERS.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label htmlFor="agent-label">Name (optional)</Label>
            <Input
              id="agent-label"
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              placeholder="My research agent"
            />
          </div>
          {provider === "mcp" ? (
            <div>
              <Label>MCP server</Label>
              <Select value={mcpServerId} onValueChange={setMcpServerId}>
                <SelectTrigger>
                  <SelectValue placeholder="Pick a server" />
                </SelectTrigger>
                <SelectContent>
                  {servers.map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          ) : (
            <div>
              <Label htmlFor="agent-key">API key</Label>
              <Input
                id="agent-key"
                type="password"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder="••••••••"
              />
            </div>
          )}
          <div>
            <Label htmlFor="agent-model">Model (optional)</Label>
            <Input
              id="agent-model"
              value={model}
              onChange={(e) => setModel(e.target.value)}
              placeholder={PROVIDERS.find((p) => p.id === provider)?.model ?? ""}
            />
          </div>
        </div>
        <Button onClick={addAgent} disabled={busy === "add"} className="gap-2">
          {busy === "add" ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Plus className="w-4 h-4" />
          )}
          Connect assistant
        </Button>
      </Card>

      {loading ? (
        <p className="text-muted-foreground flex items-center gap-2">
          <Loader2 className="w-4 h-4 animate-spin" /> Loading assistants…
        </p>
      ) : agents.length === 0 ? (
        <p className="text-sm text-muted-foreground">No assistants connected yet.</p>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {agents.map((agent) => (
            <Card key={agent.id} className="p-4 bg-card/50 backdrop-blur border-primary/20">
              <div className="flex items-center gap-2 mb-2 flex-wrap">
                <h3 className="font-semibold">{agent.label}</h3>
                <Badge
                  variant={agent.status === "connected" ? "default" : "destructive"}
                  className="text-[10px]"
                >
                  {agent.status === "connected" ? "Connected" : "Needs attention"}
                </Badge>
                {agent.is_terminal_agent && (
                  <Badge variant="outline" className="text-[10px] gap-1">
                    <Terminal className="w-3 h-3" /> Terminal agent
                  </Badge>
                )}
              </div>
              <p className="text-xs text-muted-foreground">
                {agent.model ?? "Default model"}
                {agent.key_hint ? ` · key ${agent.key_hint}` : ""}
              </p>
              {agent.last_checked_at && (
                <p className="text-xs text-muted-foreground">
                  Checked {new Date(agent.last_checked_at).toLocaleString()}
                </p>
              )}
              {agent.last_error && (
                <p className="text-xs text-destructive mt-1">{agent.last_error}</p>
              )}
              <div className="flex gap-2 mt-3">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => test(agent.id)}
                  disabled={busy === agent.id}
                  className="gap-1"
                >
                  {busy === agent.id ? (
                    <Loader2 className="w-3 h-3 animate-spin" />
                  ) : (
                    <RefreshCw className="w-3 h-3" />
                  )}
                  Test
                </Button>
                {!agent.is_terminal_agent && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => makeTerminalAgent(agent.id)}
                    disabled={busy === agent.id}
                  >
                    Use in Terminal
                  </Button>
                )}
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => remove(agent.id)}
                  aria-label={`Remove ${agent.label}`}
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default AiAgentsPanel;
