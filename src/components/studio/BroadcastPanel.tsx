import { useCallback, useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Radio,
  Copy,
  RefreshCw,
  Loader2,
  Eye,
  EyeOff,
  AlertTriangle,
  Plug,
} from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { CONNECTOR_SERVICES, type ConnectorService } from "@/lib/connectors/registry";
import { useConnections } from "@/hooks/useConnections";
import ConnectDialog from "@/components/connectors/ConnectDialog";
import MulticastPanel from "@/components/connectors/MulticastPanel";

interface IngestInfo {
  stream_key: string;
  status: string;
  last_source: string | null;
  last_seen_at: string | null;
  rtmp_url: string | null;
  srt_url: string | null;
  configured: boolean;
}

const BROADCAST_TOOLS = ["obs", "streamlabs", "restream"];

/** Broadcast software hookup: ingest details, per-tool status and multicast. */
const BroadcastPanel = () => {
  const { connections, byService, refresh } = useConnections();
  const [ingest, setIngest] = useState<IngestInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [rotating, setRotating] = useState(false);
  const [revealed, setRevealed] = useState(false);
  const [active, setActive] = useState<ConnectorService | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  const load = useCallback(async (action: "get" | "rotate" = "get") => {
    action === "rotate" ? setRotating(true) : setLoading(true);
    setError(null);
    try {
      const { data, error: fnError } = await supabase.functions.invoke("stream-ingest", {
        body: { action },
      });
      if (fnError) throw fnError;
      if (data?.error) throw new Error(data.error);
      setIngest(data.ingest as IngestInfo);
      if (action === "rotate") toast.success("New stream key generated");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not load your ingest details");
    } finally {
      setLoading(false);
      setRotating(false);
    }
  }, []);

  useEffect(() => {
    load();
    const timer = window.setInterval(() => load(), 30000);
    return () => window.clearInterval(timer);
  }, [load]);

  const copy = async (value: string | null, label: string) => {
    if (!value) return;
    try {
      await navigator.clipboard.writeText(value);
      toast.success(`${label} copied`);
    } catch {
      toast.error("Could not copy — select and copy manually");
    }
  };

  const tools = BROADCAST_TOOLS.map(
    (id) => CONNECTOR_SERVICES.find((s) => s.id === id),
  ).filter(Boolean) as ConnectorService[];

  const isLive = ingest?.status === "live";

  const toolStatus = (service: ConnectorService) => {
    const connection = byService(service.id);
    // OBS pushes straight into our ingest, so its live state is the ingest state.
    if (service.id === "obs") {
      if (isLive) return { label: "Live", tone: "live" as const };
      return connection?.status === "connected"
        ? { label: "Connected", tone: "connected" as const }
        : { label: "Offline", tone: "offline" as const };
    }
    if (connection?.status === "connected") {
      if (isLive && ingest?.last_source === service.id) {
        return { label: "Live", tone: "live" as const };
      }
      if (connection.health && connection.health !== "healthy") {
        return { label: "Needs reconnect", tone: "warn" as const };
      }
      return { label: "Connected", tone: "connected" as const };
    }
    return { label: "Offline", tone: "offline" as const };
  };

  const toneClass = (tone: string) =>
    tone === "live"
      ? "bg-primary/20 text-primary border-primary/40"
      : tone === "connected"
        ? "border-primary/30 text-primary"
        : tone === "warn"
          ? "border-secondary/40 text-secondary"
          : "border-muted-foreground/30 text-muted-foreground";

  return (
    <div className="space-y-4">
      <Card className="p-6 bg-card/50 backdrop-blur border-primary/20">
        <div className="flex items-center justify-between gap-3 mb-1">
          <h3 className="text-xl font-bold text-foreground flex items-center gap-2">
            <Radio className="w-5 h-5 text-primary" />
            Broadcast into Cyber Link
          </h3>
          <Badge
            variant="outline"
            className={toneClass(isLive ? "live" : "offline")}
          >
            {isLive ? "Live now" : "Offline"}
          </Badge>
        </div>
        <p className="text-sm text-muted-foreground mb-4">
          Paste these into OBS, Streamlabs or Restream to stream straight onto your
          channel here.
        </p>

        {loading ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="w-4 h-4 animate-spin" /> Loading your ingest details…
          </div>
        ) : error ? (
          <div className="flex items-start gap-2 text-sm text-destructive">
            <AlertTriangle className="w-4 h-4 mt-0.5" />
            <div>
              <p>{error}</p>
              <Button
                variant="outline"
                size="sm"
                className="mt-2"
                onClick={() => load()}
              >
                Try again
              </Button>
            </div>
          </div>
        ) : ingest ? (
          <div className="space-y-3">
            {!ingest.configured && (
              <div className="flex items-start gap-2 rounded-lg border border-secondary/30 bg-muted/20 p-3 text-xs text-muted-foreground">
                <AlertTriangle className="w-4 h-4 mt-0.5 text-secondary" />
                <span>
                  No ingest server address is set up yet, so the server URL below is
                  empty. Your stream key is ready — add the ingest address in project
                  settings and it will appear here.
                </span>
              </div>
            )}

            <div>
              <p className="text-xs text-muted-foreground mb-1">RTMP server URL</p>
              <div className="flex gap-2">
                <Input
                  readOnly
                  value={ingest.rtmp_url ?? "Not configured"}
                  className="font-mono text-xs"
                />
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => copy(ingest.rtmp_url, "Server URL")}
                  disabled={!ingest.rtmp_url}
                  aria-label="Copy server URL"
                >
                  <Copy className="w-4 h-4" />
                </Button>
              </div>
            </div>

            <div>
              <p className="text-xs text-muted-foreground mb-1">SRT URL (low latency)</p>
              <div className="flex gap-2">
                <Input
                  readOnly
                  value={ingest.srt_url ?? "Not configured"}
                  className="font-mono text-xs"
                />
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => copy(ingest.srt_url, "SRT URL")}
                  disabled={!ingest.srt_url}
                  aria-label="Copy SRT URL"
                >
                  <Copy className="w-4 h-4" />
                </Button>
              </div>
            </div>

            <div>
              <p className="text-xs text-muted-foreground mb-1">Stream key (private)</p>
              <div className="flex gap-2">
                <Input
                  readOnly
                  type={revealed ? "text" : "password"}
                  value={ingest.stream_key}
                  className="font-mono text-xs"
                />
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => setRevealed((v) => !v)}
                  aria-label={revealed ? "Hide stream key" : "Show stream key"}
                >
                  {revealed ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </Button>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => copy(ingest.stream_key, "Stream key")}
                  aria-label="Copy stream key"
                >
                  <Copy className="w-4 h-4" />
                </Button>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => load("rotate")}
                  disabled={rotating}
                  aria-label="Generate a new stream key"
                >
                  {rotating ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <RefreshCw className="w-4 h-4" />
                  )}
                </Button>
              </div>
              <p className="text-[11px] text-muted-foreground mt-1">
                Keep this private. Generating a new key stops any stream using the old one.
              </p>
            </div>
          </div>
        ) : null}
      </Card>

      <Card className="p-6 bg-card/50 backdrop-blur border-primary/20">
        <h3 className="text-lg font-bold text-foreground mb-1">Broadcast software</h3>
        <p className="text-sm text-muted-foreground mb-4">
          Connect the tools you already stream with. Status updates as they come online.
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {tools.map((service) => {
            const status = toolStatus(service);
            const connection = byService(service.id);
            return (
              <div
                key={service.id}
                className="rounded-lg border border-primary/10 bg-muted/20 p-4 flex flex-col gap-2"
              >
                <div className="flex items-center gap-2">
                  <span aria-hidden className="text-lg">
                    {service.glyph}
                  </span>
                  <span className="text-sm font-semibold text-foreground flex-1">
                    {service.name}
                  </span>
                  <Badge variant="outline" className={`text-[10px] ${toneClass(status.tone)}`}>
                    {status.label}
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground flex-1">{service.blurb}</p>
                {connection?.account_name && (
                  <p className="text-[11px] text-muted-foreground truncate">
                    {connection.account_name}
                  </p>
                )}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setActive(service);
                    setDialogOpen(true);
                  }}
                >
                  <Plug className="w-3.5 h-3.5 mr-1.5" />
                  {connection?.status === "connected" ? "Manage" : "Connect"}
                </Button>
              </div>
            );
          })}
        </div>
        <p className="text-[11px] text-muted-foreground mt-3">
          {connections.length === 0
            ? "Nothing connected yet — connecting here also shows up in your connectors setup."
            : "These live alongside the rest of your connectors."}
        </p>
      </Card>

      <MulticastPanel />

      <ConnectDialog
        service={active}
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        onConnected={() => {
          setDialogOpen(false);
          refresh();
        }}
      />
    </div>
  );
};

export default BroadcastPanel;
