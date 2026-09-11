import { useCallback, useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Loader2, Plus, RefreshCw, Server, Trash2 } from "lucide-react";

interface McpServer {
  id: string;
  label: string;
  url: string;
  status: string;
  last_error: string | null;
  last_checked_at: string | null;
  tool_count: number;
}

interface McpTool {
  id: string;
  server_id: string;
  name: string;
  title: string | null;
  description: string | null;
  is_enabled: boolean;
}

const statusBadge = (status: string) =>
  ({
    connected: { label: "Connected", variant: "default" as const },
    pending: { label: "Not checked", variant: "outline" as const },
    error: { label: "Error", variant: "destructive" as const },
  })[status] ?? { label: status, variant: "outline" as const };

/** MCP servers: add an endpoint, list its tools, switch tools on and off. */
const McpPanel = () => {
  const [servers, setServers] = useState<McpServer[]>([]);
  const [tools, setTools] = useState<McpTool[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [label, setLabel] = useState("");
  const [url, setUrl] = useState("");
  const [token, setToken] = useState("");

  const load = useCallback(async () => {
    const [{ data: serverRows }, { data: toolRows }] = await Promise.all([
      supabase
        .from("mcp_servers")
        .select("id, label, url, status, last_error, last_checked_at, tool_count")
        .order("created_at", { ascending: true }),
      supabase
        .from("mcp_tools")
        .select("id, server_id, name, title, description, is_enabled")
        .order("name", { ascending: true }),
    ]);
    setServers((serverRows ?? []) as McpServer[]);
    setTools((toolRows ?? []) as McpTool[]);
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

  const addServer = async () => {
    if (!label.trim() || !url.trim()) {
      toast.error("Give the server a name and its address");
      return;
    }
    setBusy("add");
    try {
      const saved = await call({
        action: "mcp_save",
        label: label.trim(),
        url: url.trim(),
        token: token.trim() || undefined,
      });
      const refreshed = await call({ action: "mcp_refresh", serverId: saved.serverId });
      if (refreshed?.ok === false) {
        toast.error(refreshed.error || "Could not reach that server");
      } else {
        toast.success(`Connected — ${refreshed.toolCount} tools available`);
      }
      setLabel("");
      setUrl("");
      setToken("");
      load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not add that server");
    } finally {
      setBusy(null);
    }
  };

  const refreshServer = async (id: string) => {
    setBusy(id);
    try {
      const result = await call({ action: "mcp_refresh", serverId: id });
      if (result?.ok === false) toast.error(result.error || "Connection failed");
      else toast.success(`${result.toolCount} tools available`);
      load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not reach that server");
    } finally {
      setBusy(null);
    }
  };

  const removeServer = async (id: string) => {
    setBusy(id);
    try {
      await call({ action: "mcp_delete", serverId: id });
      toast.success("Server removed");
      load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not remove that server");
    } finally {
      setBusy(null);
    }
  };

  const toggleTool = async (tool: McpTool) => {
    setTools((prev) =>
      prev.map((t) => (t.id === tool.id ? { ...t, is_enabled: !t.is_enabled } : t)),
    );
    const { error } = await supabase
      .from("mcp_tools")
      .update({ is_enabled: !tool.is_enabled })
      .eq("id", tool.id);
    if (error) {
      toast.error("Could not change that tool");
      load();
    }
  };

  return (
    <div className="space-y-6">
      <Card className="p-5 bg-card/50 backdrop-blur border-primary/20 space-y-4">
        <div className="flex items-center gap-2">
          <Server className="w-5 h-5 text-primary" />
          <h2 className="text-lg font-semibold">Add an MCP server</h2>
        </div>
        <p className="text-sm text-muted-foreground">
          Point Cyber Link at any Model Context Protocol endpoint. Credentials are
          encrypted on our servers and never sent back to your browser.
        </p>
        <div className="grid gap-3 sm:grid-cols-3">
          <div>
            <Label htmlFor="mcp-label">Name</Label>
            <Input
              id="mcp-label"
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              placeholder="My research tools"
            />
          </div>
          <div>
            <Label htmlFor="mcp-url">Server address</Label>
            <Input
              id="mcp-url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://example.com/mcp"
            />
          </div>
          <div>
            <Label htmlFor="mcp-token">Access token (optional)</Label>
            <Input
              id="mcp-token"
              type="password"
              value={token}
              onChange={(e) => setToken(e.target.value)}
              placeholder="••••••••"
            />
          </div>
        </div>
        <Button onClick={addServer} disabled={busy === "add"} className="gap-2">
          {busy === "add" ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Plus className="w-4 h-4" />
          )}
          Connect server
        </Button>
      </Card>

      {loading ? (
        <p className="text-muted-foreground flex items-center gap-2">
          <Loader2 className="w-4 h-4 animate-spin" /> Loading servers…
        </p>
      ) : servers.length === 0 ? (
        <p className="text-sm text-muted-foreground">No MCP servers yet.</p>
      ) : (
        servers.map((server) => {
          const badge = statusBadge(server.status);
          const serverTools = tools.filter((t) => t.server_id === server.id);
          return (
            <Card key={server.id} className="p-5 bg-card/50 backdrop-blur border-primary/20">
              <div className="flex flex-wrap items-center gap-3 mb-3">
                <h3 className="font-semibold">{server.label}</h3>
                <Badge variant={badge.variant} className="text-[10px]">
                  {badge.label}
                </Badge>
                <span className="text-xs text-muted-foreground truncate">{server.url}</span>
                <div className="ml-auto flex gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => refreshServer(server.id)}
                    disabled={busy === server.id}
                    className="gap-1"
                  >
                    {busy === server.id ? (
                      <Loader2 className="w-3 h-3 animate-spin" />
                    ) : (
                      <RefreshCw className="w-3 h-3" />
                    )}
                    Test
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => removeServer(server.id)}
                    aria-label={`Remove ${server.label}`}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>

              {server.last_error && (
                <p className="text-xs text-destructive mb-3">{server.last_error}</p>
              )}
              {server.last_checked_at && (
                <p className="text-xs text-muted-foreground mb-3">
                  Last checked {new Date(server.last_checked_at).toLocaleString()}
                </p>
              )}

              {serverTools.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  No tools listed yet — press Test to load them.
                </p>
              ) : (
                <ul className="space-y-2">
                  {serverTools.map((tool) => (
                    <li
                      key={tool.id}
                      className="flex items-start justify-between gap-3 rounded-lg border border-border/40 p-3"
                    >
                      <div className="min-w-0">
                        <p className="text-sm font-medium">{tool.title || tool.name}</p>
                        {tool.description && (
                          <p className="text-xs text-muted-foreground line-clamp-2">
                            {tool.description}
                          </p>
                        )}
                      </div>
                      <Switch
                        checked={tool.is_enabled}
                        onCheckedChange={() => toggleTool(tool)}
                        aria-label={`Enable ${tool.name}`}
                      />
                    </li>
                  ))}
                </ul>
              )}
            </Card>
          );
        })
      )}
    </div>
  );
};

export default McpPanel;
