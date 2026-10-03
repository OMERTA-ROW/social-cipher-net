import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Loader2, RefreshCw, Unplug, PlugZap } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import {
  integrationState,
  rememberIntegrationReturn,
  takeIntegrationResult,
  type IntegrationState,
} from "@/lib/integrationStatus";
import { INTEGRATION_PROVIDERS } from "../../supabase/functions/_shared/accountIntegrations";

interface ProviderConfig { id: string; missing: string[]; owner_note: string | null; revocable: boolean; refreshable: boolean }
interface Row { service_id: string; status: string | null; provider_account_id: string | null; account_name: string | null; account_handle: string | null; connected_at: string | null; last_error: string | null; scopes: string[] | null }

const STATE_STYLE: Record<IntegrationState, string> = {
  "Connected": "border-primary/60 text-primary",
  "Connecting": "border-primary/40 text-primary",
  "Approval required": "border-accent/50 text-accent",
  "Connection failed": "border-destructive/60 text-destructive",
  "Disconnected": "border-muted-foreground/40 text-muted-foreground",
  "Not connected": "border-muted-foreground/40 text-muted-foreground",
};

const readFnError = async (data: unknown, error: unknown): Promise<{ code?: string; message?: string; missing?: string[]; revocation?: string }> => {
  if (data && typeof data === "object" && ("error" in data || "ok" in data)) return data as never;
  try { return (await (error as { context?: Response }).context?.json()) ?? {}; } catch { return {}; }
};

const Integrations = () => {
  const { toast } = useToast();
  const [config, setConfig] = useState<Record<string, ProviderConfig> | null>(null);
  const [configError, setConfigError] = useState<string | null>(null);
  const [rows, setRows] = useState<Record<string, Row>>({});
  const [busy, setBusy] = useState<Record<string, "connecting" | "refreshing" | "disconnecting" | undefined>>({});
  const [lastResult, setLastResult] = useState<Record<string, "failed" | "disconnected">>({});
  const [messages, setMessages] = useState<Record<string, string>>({});

  const load = useCallback(async () => {
    const [{ data: cfg, error: cfgErr }, { data: conn }] = await Promise.all([
      supabase.functions.invoke("connector-oauth", { body: { action: "integration_status" } }),
      supabase.from("user_connections")
        .select("service_id,status,provider_account_id,account_name,account_handle,connected_at,last_error,scopes")
        .like("service_id", "acct:%"),
    ]);
    if (cfgErr || !cfg?.providers) setConfigError("Integration settings could not be loaded. Statuses below may be incomplete.");
    else {
      setConfigError(null);
      setConfig(Object.fromEntries((cfg.providers as ProviderConfig[]).map((p) => [p.id, p])));
    }
    setRows(Object.fromEntries(((conn ?? []) as Row[]).map((r) => [r.service_id.slice(5), r])));
  }, []);

  useEffect(() => {
    document.title = "Integrations | Cyber Link";
    const r = takeIntegrationResult();
    if (r) {
      const id = r.serviceId?.startsWith("acct:") ? r.serviceId.slice(5) : null;
      if (id) {
        setMessages((m) => ({ ...m, [id]: r.message }));
        if (!r.ok) setLastResult((l) => ({ ...l, [id]: "failed" }));
      }
      toast({ title: r.ok ? "Connection complete" : "Connection failed", description: r.message, variant: r.ok ? "default" : "destructive" });
    }
    load();
  }, [load, toast]);

  const connect = async (id: string) => {
    setBusy((b) => ({ ...b, [id]: "connecting" }));
    setMessages((m) => ({ ...m, [id]: "" }));
    const { data, error } = await supabase.functions.invoke("connector-oauth", { body: { action: "integration_start", provider: id } });
    if (data?.authorize_url) {
      rememberIntegrationReturn("/integrations");
      window.location.assign(data.authorize_url);
      return;
    }
    const info = await readFnError(data, error);
    setBusy((b) => ({ ...b, [id]: undefined }));
    if (info && (info as { error?: string }).error === "not_configured") {
      setMessages((m) => ({ ...m, [id]: `Approval required: ${(info.missing ?? []).join("; ")}.` }));
      load();
      return;
    }
    setLastResult((l) => ({ ...l, [id]: "failed" }));
    setMessages((m) => ({ ...m, [id]: info.message ?? "Could not start the connection. Nothing was changed." }));
  };

  const refresh = async (id: string) => {
    setBusy((b) => ({ ...b, [id]: "refreshing" }));
    const { data, error } = await supabase.functions.invoke("connector-oauth", { body: { action: "integration_refresh", provider: id } });
    const info = await readFnError(data, error);
    setBusy((b) => ({ ...b, [id]: undefined }));
    setMessages((m) => ({ ...m, [id]: data?.ok ? "Access renewed." : info.message ?? "Refresh failed. Reconnect to restore access." }));
    load();
  };

  const disconnect = async (id: string) => {
    setBusy((b) => ({ ...b, [id]: "disconnecting" }));
    const { data, error } = await supabase.functions.invoke("connector-oauth", { body: { action: "integration_disconnect", provider: id } });
    const info = await readFnError(data, error);
    setBusy((b) => ({ ...b, [id]: undefined }));
    if (data?.ok) {
      setLastResult((l) => ({ ...l, [id]: "disconnected" }));
      const rev = data.revocation === "revoked" ? "Access was revoked at the provider and stored credentials were deleted."
        : data.revocation === "failed" ? "Stored credentials were deleted, but the provider did not confirm revocation. Remove CyberLink from your account settings there too."
        : "Stored credentials were deleted. This provider has no revocation endpoint; remove CyberLink from your account settings there too.";
      setMessages((m) => ({ ...m, [id]: rev }));
    } else {
      setLastResult((l) => ({ ...l, [id]: "failed" }));
      setMessages((m) => ({ ...m, [id]: info.message ?? "Disconnect failed. Try again." }));
    }
    load();
  };

  return (
    <main className="mx-auto max-w-5xl space-y-6 p-4 md:p-8">
      <header className="space-y-2">
        <h1 className="text-2xl font-bold text-foreground">Account integrations</h1>
        <p className="text-sm text-muted-foreground">
          Connect outside accounts to CyberLink. This is separate from how you sign in. A service shows <strong>Connected</strong> only after the
          provider's consent completes and our server verifies and securely stores the connection.
        </p>
        <p className="text-xs text-muted-foreground">Looking for posting and streaming platforms? <Link to="/connectors" className="text-primary underline-offset-2 hover:underline">Open Connectors</Link>.</p>
        {configError && <p role="alert" className="text-sm text-destructive">{configError}</p>}
      </header>

      {config && !INTEGRATION_PROVIDERS.some((p) => config[p.id]?.missing.length === 0) && <p role="status" className="text-sm text-muted-foreground">No account integrations are currently available.</p>}
      <ul className="grid gap-4 md:grid-cols-2">
        {/* Unconfigured providers stay hidden unless the member already has a saved row to manage. */}
        {INTEGRATION_PROVIDERS.filter((p) => !!config?.[p.id] && config[p.id].missing.length === 0 || !!rows[p.id]).map((p) => {
          const row = rows[p.id] ?? null;
          const cfg = config?.[p.id];
          const state = integrationState({
            row, missingConfig: config ? cfg?.missing ?? [] : null,
            connecting: busy[p.id] === "connecting", lastResult: lastResult[p.id] ?? null,
          });
          const connected = state === "Connected";
          const b = busy[p.id];
          const message = messages[p.id] || (row?.status === "error" ? row.last_error ?? "" : "");
          return (
            <li key={p.id} className="flex flex-col gap-3 rounded-xl border border-primary/20 bg-card/70 p-4 backdrop-blur" aria-labelledby={`int-${p.id}`}>
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  <span aria-hidden="true" className="flex h-10 w-10 items-center justify-center rounded-lg border border-primary/30 bg-background/60 text-sm font-bold text-primary">
                    {p.name.slice(0, 2).toUpperCase()}
                  </span>
                  <div>
                    <h2 id={`int-${p.id}`} className="font-semibold text-foreground">{p.name}</h2>
                    <p className="text-xs text-muted-foreground">{p.feature}</p>
                  </div>
                </div>
                <Badge variant="outline" className={STATE_STYLE[state]} aria-label={`Status: ${state}`}>{state}</Badge>
              </div>

              <p className="text-xs text-muted-foreground">
                Permissions: {p.scopes.length ? p.scopes.map((s) => s.replace("https://www.googleapis.com/auth/", "")).join(", ") : "pages you choose during consent"}
              </p>

              {connected && row && (
                <p className="text-xs text-foreground">
                  Account: {row.account_name ?? row.account_handle ?? row.provider_account_id}
                  {row.connected_at && <> · since {new Date(row.connected_at).toLocaleDateString()}</>}
                </p>
              )}

              {state === "Approval required" && (
                <div className="rounded-md border border-accent/30 bg-background/40 p-2 text-xs text-muted-foreground">
                  {config === null ? "Configuration status could not be confirmed, so connecting is unavailable." : <>Owner setup needed: {(cfg?.missing ?? []).join("; ")}.</>}
                  {cfg?.owner_note && <div className="mt-1">{cfg.owner_note}</div>}
                </div>
              )}

              {message && <p role="status" className={`text-xs ${state === "Connection failed" ? "text-destructive" : "text-muted-foreground"}`}>{message}</p>}

              <div className="mt-auto flex flex-wrap gap-2">
                {connected ? (
                  <>
                    {p.refreshable && (
                      <Button size="sm" variant="outline" onClick={() => refresh(p.id)} disabled={Boolean(b)}>
                        {b === "refreshing" ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-1 h-4 w-4" />} Refresh access
                      </Button>
                    )}
                    <Button size="sm" variant="outline" onClick={() => connect(p.id)} disabled={Boolean(b)}>
                      <PlugZap className="mr-1 h-4 w-4" /> Reconnect
                    </Button>
                    <Button size="sm" variant="outline" className="text-destructive" onClick={() => disconnect(p.id)} disabled={Boolean(b)}>
                      {b === "disconnecting" ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : <Unplug className="mr-1 h-4 w-4" />} Disconnect
                    </Button>
                  </>
                ) : (
                  <>
                    <Button size="sm" onClick={() => connect(p.id)} disabled={Boolean(b) || state === "Approval required"}
                      aria-describedby={state === "Approval required" ? `int-${p.id}` : undefined}>
                      {b === "connecting" ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : <PlugZap className="mr-1 h-4 w-4" />}
                      {state === "Connection failed" ? "Reconnect" : `Connect ${p.name.split(" ")[0]}`}
                    </Button>
                    {row && (
                      <Button size="sm" variant="outline" className="text-destructive" onClick={() => disconnect(p.id)} disabled={Boolean(b)}>
                        <Unplug className="mr-1 h-4 w-4" /> Remove
                      </Button>
                    )}
                  </>
                )}
                <a href={p.docsUrl} target="_blank" rel="noreferrer" className="self-center text-xs text-primary underline-offset-2 hover:underline">Provider docs</a>
              </div>
            </li>
          );
        })}
      </ul>
    </main>
  );
};

export default Integrations;
