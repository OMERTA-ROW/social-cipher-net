import { useCallback, useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Brain, Shield, Eye, Database, Zap, Activity, Loader2, Sparkles } from "lucide-react";

/**
 * Owner console for the CyberLink Brain.
 *
 * Everything shown here is read live from the database: the accounts actually
 * connected, the AI agents actually configured and the security events actually
 * recorded. Nothing is generated, estimated or simulated — when a source has no
 * rows the section says so instead of showing a number.
 */

interface ConnectionRow {
  id: string;
  platform: string | null;
  status: string | null;
  last_sync_at: string | null;
}

interface AgentRow {
  id: string;
  name: string | null;
  is_active: boolean | null;
}

interface SecurityEventRow {
  id: string;
  event_type: string;
  severity: string | null;
  created_at: string;
}

const CyberLinkBrainDashboard = () => {
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState<string | null>(null);
  const [connections, setConnections] = useState<ConnectionRow[]>([]);
  const [agents, setAgents] = useState<AgentRow[]>([]);
  const [events, setEvents] = useState<SecurityEventRow[]>([]);
  const [activity, setActivity] = useState<string[]>([]);

  const load = useCallback(async () => {
    setLoading(true);
    const [conn, ag, ev] = await Promise.all([
      supabase
        .from("user_connections")
        .select("id, platform, status, last_sync_at")
        .order("created_at", { ascending: false })
        .limit(100),
      supabase.from("ai_agents").select("id, name, is_active").limit(100),
      supabase
        .from("security_audit_log")
        .select("id, event_type, severity, created_at")
        .order("created_at", { ascending: false })
        .limit(25),
    ]);
    setConnections((conn.data ?? []) as ConnectionRow[]);
    setAgents((ag.data ?? []) as AgentRow[]);
    setEvents((ev.data ?? []) as SecurityEventRow[]);
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const executeAction = async (action: string, label: string) => {
    setRunning(action);
    try {
      const { data, error } = await supabase.functions.invoke("cyberlink-brain-ai", {
        body: { action, context: `Execute ${action} protocol` },
      });
      if (error) throw error;
      const summary = typeof data?.result === "string" ? data.result : `${label} completed`;
      setActivity((prev) => [`${new Date().toLocaleTimeString()} ${summary}`, ...prev].slice(0, 20));
      toast.success(`${label} completed`);
      await load();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : `${label} failed`);
    } finally {
      setRunning(null);
    }
  };

  const activeAgents = agents.filter((a) => a.is_active).length;
  const liveConnections = connections.filter((c) => (c.status ?? "") === "connected").length;
  const criticalEvents = events.filter((e) => (e.severity ?? "") === "critical").length;

  const stat = (label: string, value: number | null, icon: React.ReactNode, empty: string) => (
    <Card className="bg-muted/50 border-primary/20">
      <CardContent className="p-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm text-muted-foreground">{label}</span>
          {icon}
        </div>
        {value === null ? (
          <div className="text-sm text-muted-foreground">{empty}</div>
        ) : (
          <div className="text-2xl font-bold">{value}</div>
        )}
      </CardContent>
    </Card>
  );

  return (
    <Card className="w-full bg-card/60 backdrop-blur border-2 border-primary/40">
      <CardHeader className="border-b border-primary/30">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <CardTitle className="flex items-center gap-3">
            <div className="relative">
              <Brain className="h-6 w-6 text-primary" />
              <Eye className="h-3 w-3 text-purple-400 absolute -top-1 -right-1" />
            </div>
            CyberLink Brain
          </CardTitle>
          <Badge variant="outline" className="gap-1 border-primary/40">
            <Shield className="h-3 w-3" />
            Owner access only
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="space-y-6 pt-6">
        {loading ? (
          <div className="flex items-center gap-2 text-muted-foreground py-8 justify-center">
            <Loader2 className="h-4 w-4 animate-spin" />
            Loading live data…
          </div>
        ) : (
          <>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {stat(
                "Connected accounts",
                connections.length === 0 ? null : liveConnections,
                <Database className="h-4 w-4 text-blue-500" />,
                "Connect an account to see data",
              )}
              {stat(
                "AI agents active",
                agents.length === 0 ? null : activeAgents,
                <Activity className="h-4 w-4 text-green-500" />,
                "No agents configured yet",
              )}
              {stat(
                "Security events (recent)",
                events.length === 0 ? null : events.length,
                <Shield className="h-4 w-4 text-red-500" />,
                "No security events recorded",
              )}
              {stat(
                "Critical events",
                events.length === 0 ? null : criticalEvents,
                <Zap className="h-4 w-4 text-amber-500" />,
                "No security events recorded",
              )}
            </div>

            <Card className="bg-muted/30 border-border/60">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm">Connected accounts</CardTitle>
              </CardHeader>
              <CardContent>
                {connections.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    No accounts connected yet. Connect an account to see its data here.
                  </p>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                    {connections.map((c) => (
                      <div
                        key={c.id}
                        className="flex items-center justify-between rounded-md border border-border/60 px-3 py-2 text-sm"
                      >
                        <span className="capitalize truncate">{c.platform ?? "Account"}</span>
                        <Badge variant="outline" className="ml-2 shrink-0">
                          {c.status ?? "unknown"}
                        </Badge>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            <Card className="bg-muted/30 border-border/60">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm">Recent security events</CardTitle>
              </CardHeader>
              <CardContent>
                {events.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No security events recorded yet.</p>
                ) : (
                  <ScrollArea className="h-48">
                    <div className="space-y-2 pr-3">
                      {events.map((e) => (
                        <div key={e.id} className="flex items-center justify-between text-sm">
                          <span className="truncate">{e.event_type}</span>
                          <span className="text-xs text-muted-foreground ml-3 shrink-0">
                            {e.severity ?? "info"} · {new Date(e.created_at).toLocaleString()}
                          </span>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                )}
              </CardContent>
            </Card>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={running !== null}
                onClick={() => executeAction("orchestrate", "Orchestrate")}
                className="gap-1"
              >
                <Brain className="h-3 w-3" />
                Orchestrate
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={running !== null}
                onClick={() => executeAction("military_security", "Security review")}
                className="gap-1"
              >
                <Shield className="h-3 w-3" />
                Security review
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={running !== null}
                onClick={() => executeAction("database_synthesis", "Synthesis")}
                className="gap-1"
              >
                <Database className="h-3 w-3" />
                Synthesize
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={running !== null}
                onClick={() => executeAction("all_seeing_eye", "Overview")}
                className="gap-1"
              >
                <Sparkles className="h-3 w-3" />
                Overview
              </Button>
            </div>

            <Card className="bg-muted/30 border-border/60">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm">Brain activity this session</CardTitle>
              </CardHeader>
              <CardContent>
                {activity.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    Nothing run yet. Results of the actions above appear here.
                  </p>
                ) : (
                  <ScrollArea className="h-40">
                    <div className="space-y-1 pr-3 font-mono text-xs">
                      {activity.map((line, i) => (
                        <div key={i}>{line}</div>
                      ))}
                    </div>
                  </ScrollArea>
                )}
              </CardContent>
            </Card>
          </>
        )}
      </CardContent>
    </Card>
  );
};

export default CyberLinkBrainDashboard;
