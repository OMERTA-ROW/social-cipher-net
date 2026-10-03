import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Plug,
  Search,
  Loader2,
  CheckCircle2,
  AlertTriangle,
  Unplug,
  RefreshCw,
} from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import {
  CONNECTOR_CATEGORIES,
  CONNECTOR_SERVICES,
  AVAILABILITY_LABELS,
  type ConnectorService,
} from "@/lib/connectors/registry";
import { useConnections } from "@/hooks/useConnections";
import ConnectDialog from "@/components/connectors/ConnectDialog";
import McpPanel from "@/components/connectors/McpPanel";
import AiAgentsPanel from "@/components/connectors/AiAgentsPanel";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import MulticastPanel from "@/components/connectors/MulticastPanel";
import PlatformComposer from "@/components/connectors/PlatformComposer";
import { signInPath } from "@/lib/authRedirect";

const Connectors = () => {
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const { connections, loading, refresh, byService } = useConnections();
  const [query, setQuery] = useState("");
  const [active, setActive] = useState<ConnectorService | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [finishing, setFinishing] = useState(false);
  const [testing, setTesting] = useState<string | null>(null);
  const [recovery, setRecovery] = useState<{ serviceId: string | null; message: string } | null>(null);

  // Auth guard
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) navigate(signInPath());
    });
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_e, session) => {
      if (!session) navigate(signInPath());
    });
    return () => subscription.unsubscribe();
  }, [navigate]);

  // Finish an OAuth round trip when the provider sends us back here.
  useEffect(() => {
    const code = params.get("code");
    const state = params.get("state");
    const providerError = params.get("error");
    if ((!code && !providerError) || !state) return;

    setFinishing(true);
    // When the provider sent us back inside a popup, hand the result to the
    // opener and close, so the main page shows the confirmation.
    const inPopup = !!window.opener && window.opener !== window;

    supabase.functions
      .invoke("connector-oauth", { body: { action: "callback", code, state, error: providerError } })
      .then(({ data, error }) => {
        const failed = !!(error || data?.error);
        const message = data?.error ?? error?.message ?? "Authorization failed";
        const serviceId: string | null = data?.service_id ?? null;
        if (inPopup) {
          window.opener.postMessage(
            {
              type: "cyberlink:oauth-result",
              ok: !failed,
              message: failed ? message : "Account connected",
              account: data?.account_name ?? null,
              serviceId,
            },
            window.location.origin,
          );
          window.close();
          return;
        }
        if (failed) {
          setRecovery({ serviceId, message });
          refresh();
        } else {
          setRecovery(null);
          toast.success(
            data?.account_name
              ? `Connected as ${data.account_name}`
              : "Account connected",
          );
          refresh();
        }
      })
      .finally(() => {
        if (inPopup) return;
        setFinishing(false);
        params.delete("code");
        params.delete("state");
        params.delete("error");
        params.delete("error_description");
        setParams(params, { replace: true });
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Confirmation coming back from the OAuth popup.
  useEffect(() => {
    const onMessage = (event: MessageEvent) => {
      if (event.origin !== window.location.origin) return;
      if (event.data?.type !== "cyberlink:oauth-result") return;
      if (event.data.ok) {
        setRecovery(null);
        toast.success(
          event.data.account
            ? `Connected as ${event.data.account}`
            : "Account connected",
        );
        refresh();
      } else {
        setRecovery({ serviceId: event.data.serviceId ?? null, message: event.data.message || "Authorization failed" });
        refresh();
      }
    };
    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, [refresh]);

  const disconnect = async (service: ConnectorService) => {
    const { data, error } = await supabase.functions.invoke(
      "connector-credentials",
      { body: { action: "disconnect", service_id: service.id } },
    );
    if (error || data?.error) {
      toast.error(data?.error ?? error?.message ?? "Could not disconnect");
      return;
    }
    toast.success(`${service.name} disconnected`);
    refresh();
  };

  // Real round trip to the provider so the badge reflects a live check.
  const testConnection = async (service: ConnectorService) => {
    setTesting(service.id);
    try {
      const { data, error } = await supabase.functions.invoke("connector-action", {
        body: { action: "profile", service_id: service.id },
      });
      const result = Array.isArray(data?.results) ? data.results[0] : null;
      // Strict: only an explicit ok:true result from the provider counts.
      const ok = !error && !data?.error && result !== null && result?.ok === true;
      if (ok) {
        toast.success(`${service.name} responded successfully`);
      } else {
        toast.error(
          result?.detail ?? data?.error ?? error?.message ?? "The provider did not respond",
        );
      }
    } finally {
      setTesting(null);
      refresh();
    }
  };

  const open = (service: ConnectorService) => {
    setActive(service);
    setDialogOpen(true);
  };

  const filtered = (categoryId: string) =>
    CONNECTOR_SERVICES.filter(
      (s) =>
        s.category === categoryId &&
        (query.trim() === "" ||
          s.name.toLowerCase().includes(query.trim().toLowerCase())),
    );

  const connectedCount = connections.filter((c) => c.status === "connected").length;

  return (
    <div className="min-h-screen bg-transparent">
      <main className="container mx-auto px-4 pb-16 max-w-5xl">
        <header className="mb-6">
          <p className="text-muted-foreground">
            One place to link every service you use — then post, comment, read your
            feeds and stream out to all of them from inside Cyber Link.
          </p>
          <div className="flex items-center gap-2 mt-3">
            <Badge variant="outline">{connectedCount} connected</Badge>
            <Badge variant="outline">{CONNECTOR_SERVICES.length} available</Badge>
            {finishing && (
              <Badge className="gap-1">
                <Loader2 className="w-3 h-3 animate-spin" />
                Finishing sign-in
              </Badge>
            )}
          </div>
        </header>

        {recovery && (() => {
          const svc = CONNECTOR_SERVICES.find((s) => s.id === recovery.serviceId) ?? null;
          return (
            <Card role="alert" className="mb-6 p-4 border-destructive/50 bg-destructive/10">
              <p className="font-medium">
                {svc ? `${svc.name} wasn't connected` : "That account wasn't connected"}
              </p>
              <p className="text-sm text-muted-foreground mt-1">{recovery.message}</p>
              <p className="text-sm mt-2">
                Your existing connected accounts were not changed. To retry, start a fresh
                authorization — each attempt can only be used once. Make sure you approve every
                requested permission and stay signed in to the same provider account.
              </p>
              <div className="flex gap-2 mt-3">
                {svc && (
                  <Button size="sm" onClick={() => { setRecovery(null); open(svc); }}>
                    Try again
                  </Button>
                )}
                <Button size="sm" variant="outline" onClick={() => setRecovery(null)}>
                  Dismiss
                </Button>
              </div>
            </Card>
          );
        })()}

        <div className="relative mb-6 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Find a service..."
            className="pl-9"
          />
        </div>

        <Tabs defaultValue="services" className="mb-8">
          <TabsList>
            <TabsTrigger value="services">Services</TabsTrigger>
            <TabsTrigger value="agents">AI assistants</TabsTrigger>
            <TabsTrigger value="mcp">MCP servers</TabsTrigger>
          </TabsList>

          <TabsContent value="services" className="mt-6">
            <div className="grid gap-6">
              <PlatformComposer />
              <MulticastPanel />
            </div>
          </TabsContent>

          <TabsContent value="agents" className="mt-6">
            <AiAgentsPanel />
          </TabsContent>

          <TabsContent value="mcp" className="mt-6">
            <McpPanel />
          </TabsContent>
        </Tabs>

        {CONNECTOR_CATEGORIES.map((category) => {
          const services = filtered(category.id);
          if (services.length === 0) return null;
          return (
            <section key={category.id} className="mb-8">
              <h2 className="text-xl font-bold text-foreground mb-1">
                {category.label}
              </h2>
              <p className="text-sm text-muted-foreground mb-3">
                {category.description}
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {services.map((service) => {
                  const connection = byService(service.id);
                  const connected = connection?.status === "connected";
                  return (
                    <Card
                      key={service.id}
                      className="p-4 bg-card/50 backdrop-blur border-primary/20 hover:border-primary/50 transition-colors flex flex-col"
                    >
                      <div className="flex items-start gap-3 mb-2">
                        <span className="text-2xl" aria-hidden>
                          {service.glyph}
                        </span>
                        <div className="min-w-0 flex-1">
                          <h3 className="font-semibold text-foreground truncate">
                            {service.name}
                          </h3>
                          <p className="text-xs text-muted-foreground">
                            {service.blurb}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 mb-3">
                        {loading ? (
                          <Badge variant="outline" className="text-[10px]">
                            Checking
                          </Badge>
                        ) : connected ? (
                          <Badge className="text-[10px] gap-1">
                            <CheckCircle2 className="w-3 h-3" />
                            Connected
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="text-[10px]">
                            Not connected
                          </Badge>
                        )}
                        {connected && connection?.health === "needs_reconnect" && (
                          <Badge variant="destructive" className="text-[10px]">
                            Needs reconnect
                          </Badge>
                        )}
                        {!connected && service.availability !== "available" && (
                          <Badge variant="outline" className="text-[10px]">
                            {AVAILABILITY_LABELS[service.availability]}
                          </Badge>
                        )}
                        {connection?.account_name && (
                          <span className="text-[11px] text-muted-foreground truncate">
                            {connection.account_name}
                          </span>
                        )}
                      </div>

                      {!connected && service.availabilityNote && (
                        <p className="text-[11px] text-muted-foreground mb-2 line-clamp-2">
                          {service.availabilityNote}
                        </p>
                      )}

                      {connected && connection?.last_synced_at && (
                        <p className="text-[11px] text-muted-foreground mb-2">
                          Last updated{" "}
                          {new Date(connection.last_synced_at).toLocaleString()}
                        </p>
                      )}

                      {connection?.last_error && (
                        <p className="text-[11px] text-destructive flex items-start gap-1 mb-2">
                          <AlertTriangle className="w-3 h-3 mt-0.5 shrink-0" />
                          <span className="line-clamp-2">{connection.last_error}</span>
                        </p>
                      )}

                      <div className="mt-auto flex gap-2">
                        <Button
                          size="sm"
                          variant={connected ? "outline" : "default"}
                          className="flex-1"
                          onClick={() => open(service)}
                        >
                          {connected ? (
                            <>
                              <RefreshCw className="w-3 h-3 mr-1" />
                              Reconnect
                            </>
                          ) : (
                            "Connect"
                          )}
                        </Button>
                        {connected && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => testConnection(service)}
                            disabled={testing === service.id}
                          >
                            {testing === service.id ? (
                              <Loader2 className="w-3 h-3 animate-spin" />
                            ) : (
                              "Test"
                            )}
                          </Button>
                        )}
                        {connected && (
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => disconnect(service)}
                            aria-label={`Disconnect ${service.name}`}
                          >
                            <Unplug className="w-4 h-4" />
                          </Button>
                        )}
                      </div>
                    </Card>
                  );
                })}
              </div>
            </section>
          );
        })}
      </main>

      <ConnectDialog
        service={active}
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        onConnected={refresh}
      />
    </div>
  );
};

export default Connectors;
