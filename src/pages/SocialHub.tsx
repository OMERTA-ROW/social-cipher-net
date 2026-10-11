import { useEffect, useMemo, useState } from "react";
import { Link, Navigate, useLocation, useNavigate, useParams } from "react-router-dom";
import { toast } from "sonner";
import { ExternalLink, Loader2, PlugZap, RefreshCw, Search, ShieldCheck, Unlink } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from "@/components/ui/resizable";
import { useIsMobile } from "@/hooks/use-mobile";
import { useConfiguredProviders } from "@/hooks/useConfiguredProviders";
import { useLinkedAccounts, type LinkedAccount } from "@/hooks/useLinkedAccounts";
import { isVerifiedConnection, rememberIntegrationReturn, takeIntegrationResult } from "@/lib/integrationStatus";
import {
  AVAILABILITY_TEXT, CAPABILITY_LABELS, CAPABILITY_STATE_LABELS, SOCIAL_PROVIDERS,
  getSocialProvider, providerAvailability, socialProviderForService,
  type CapabilityKey, type ProviderAvailability, type SocialProvider,
} from "@/lib/social/providers";

const TABS = [
  { id: "accounts", label: "Connected Accounts", path: "/social/accounts" },
  { id: "discover", label: "Discover Platforms", path: "/connectors/social" },
  { id: "content", label: "Content & Publishing", path: "/social/content" },
  { id: "analytics", label: "Analytics", path: "/social/analytics" },
  { id: "inbox", label: "Inbox & Engagement", path: "/social/inbox" },
  { id: "webhooks", label: "Webhooks", path: "/social/webhooks" },
  { id: "activity", label: "Activity & Errors", path: "/social/activity" },
  { id: "permissions", label: "Permissions & Security", path: "/social/permissions" },
] as const;
type TabId = (typeof TABS)[number]["id"];

const tabFor = (pathname: string): TabId => {
  const seg = pathname.split("/")[2];
  return (TABS.find((t) => t.id === seg)?.id ?? "discover") as TabId;
};

const RETURN_PATH = "/connectors/social";
const DETAIL_KEY = "cl_social_detail_open";

const availabilityVariant = (a: ProviderAvailability) => (a === "ready" ? "default" : "outline");

const accountState = (a: LinkedAccount) =>
  isVerifiedConnection(a) ? "Connected" : a.status === "error" || a.health === "failing" ? "Connection failed" : a.status === "pending" ? "Pending verification" : "Not verified";

const fmt = (v: string | null | undefined) => (v ? new Date(v).toLocaleString() : "—");

/** Starts the provider's official consent screen through the server OAuth function. */
const startConnect = async (p: SocialProvider) => {
  if (!p.oauthProvider) return;
  const { data, error } = await supabase.functions.invoke("connector-oauth", {
    body: { action: "start", provider: p.oauthProvider, service_id: p.serviceId },
  });
  let payload = data;
  if (error) {
    const ctx = (error as { context?: { text?: () => Promise<string> } }).context;
    try { payload = ctx?.text ? JSON.parse(await ctx.text()) : null; } catch { payload = null; }
    if (!payload?.error) throw new Error(`Could not start ${p.name} sign-in. Try again.`);
  }
  if (payload?.error === "not_configured") throw new Error(`${p.name} isn't set up yet. An admin needs to add its app credentials.`);
  if (payload?.error) throw new Error(String(payload.error));
  const url: string | undefined = payload?.authorize_url;
  if (!url) throw new Error("No sign-in link was returned.");
  rememberIntegrationReturn(RETURN_PATH);
  const popup = window.open(url, "cyberlink-oauth", "width=600,height=760");
  if (!popup) { window.location.href = url; return; }
  toast.info(`Finish signing in to ${p.name} in the popup window`);
};

const SocialHub = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { provider: providerParam } = useParams();
  const isMobile = useIsMobile();
  const tab = tabFor(location.pathname);
  const { configured, loaded } = useConfiguredProviders();
  const { accounts, loading, refresh, disconnect } = useLinkedAccounts();
  const [query, setQuery] = useState("");
  const [stateFilter, setStateFilter] = useState<"all" | ProviderAvailability | "connected" | "error">("all");
  const [capFilter, setCapFilter] = useState<"all" | CapabilityKey>("all");
  const [sort, setSort] = useState<"name" | "availability">("name");
  const [busy, setBusy] = useState<string | null>(null);
  const [retry, setRetry] = useState<string | null>(null);
  const [detailOpen, setDetailOpen] = useState(() => localStorage.getItem(DETAIL_KEY) !== "0");
  useEffect(() => { localStorage.setItem(DETAIL_KEY, detailOpen ? "1" : "0"); }, [detailOpen]);

  const socialAccounts = useMemo(() => accounts.filter((a) => socialProviderForService(a.service_id)), [accounts]);
  const selected = getSocialProvider(providerParam);

  // Result of a provider consent: popup reports to its opener; full-page returns show it here.
  useEffect(() => {
    const result = takeIntegrationResult();
    if (!result) return;
    if (window.opener && window.opener !== window) {
      try { window.opener.postMessage({ type: "cyberlink:oauth-result", ok: result.ok, message: result.message, serviceId: result.serviceId }, window.location.origin); } catch { /* opener gone */ }
      window.close();
      return;
    }
    if (result.ok) { setRetry(null); toast.success(result.message); } else setRetry(result.message);
    void refresh();
  }, [refresh]);

  useEffect(() => {
    const onMessage = (e: MessageEvent) => {
      if (e.origin !== window.location.origin || e.data?.type !== "cyberlink:oauth-result") return;
      if (e.data.ok) { setRetry(null); toast.success(String(e.data.message ?? "Account connected")); }
      else setRetry(String(e.data.message ?? "Authorization failed. Your account was not connected."));
      void refresh();
    };
    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, [refresh]);

  const connect = async (p: SocialProvider) => {
    setBusy(p.id); setRetry(null);
    try { await startConnect(p); } catch (e) { setRetry(e instanceof Error ? e.message : "Could not start sign-in."); }
    finally { setBusy(null); }
  };

  const remove = async (a: LinkedAccount) => {
    if (!window.confirm("Disconnect this account and remove CyberLink's access? You can connect it again later.")) return;
    setBusy(a.id);
    try { await disconnect(a.service_id, a.id); toast.success("Account disconnected"); }
    catch (e) { toast.error(e instanceof Error ? e.message : "Disconnect failed. Try again."); }
    finally { setBusy(null); }
  };

  const providers = useMemo(() => {
    const q = query.trim().toLowerCase();
    const order: ProviderAvailability[] = ["ready", "setup", "planned", "unavailable"];
    return SOCIAL_PROVIDERS.filter((p) => {
      const a = providerAvailability(p, configured);
      const linked = socialAccounts.filter((x) => x.service_id === p.serviceId);
      if (q && !`${p.name} ${p.description} ${p.accountTypes}`.toLowerCase().includes(q)) return false;
      if (capFilter !== "all" && p.capabilities[capFilter] === "unavailable") return false;
      if (stateFilter === "connected") return linked.some(isVerifiedConnection);
      if (stateFilter === "error") return linked.some((x) => accountState(x) === "Connection failed");
      return stateFilter === "all" || a === stateFilter;
    }).sort((x, y) => sort === "name" ? x.name.localeCompare(y.name)
      : order.indexOf(providerAvailability(x, configured)) - order.indexOf(providerAvailability(y, configured)) || x.name.localeCompare(y.name));
  }, [query, stateFilter, capFilter, sort, configured, socialAccounts]);

  const verified = socialAccounts.filter(isVerifiedConnection);

  const providerCard = (p: SocialProvider) => {
    const a = providerAvailability(p, configured);
    const linked = socialAccounts.filter((x) => x.service_id === p.serviceId);
    const caps = (Object.keys(CAPABILITY_LABELS) as CapabilityKey[]).filter((k) => p.capabilities[k] !== "unavailable");
    return (
      <Card key={p.id} className="bg-card/80">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-base"><span aria-hidden>{p.glyph}</span>{p.name}</CardTitle>
          <CardDescription>{p.description}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex flex-wrap gap-1">
            <Badge variant={availabilityVariant(a)}>{loaded ? AVAILABILITY_TEXT[a] : "Checking…"}</Badge>
            {linked.map((x) => <Badge key={x.id} variant="secondary">{accountState(x)}</Badge>)}
          </div>
          <div className="flex flex-wrap gap-1">{caps.map((k) => <Badge key={k} variant="outline" className="text-[10px]">{CAPABILITY_LABELS[k]}{p.capabilities[k] === "approval" ? " *" : ""}</Badge>)}</div>
          <div className="flex flex-wrap gap-2">
            <Button size="sm" disabled={a !== "ready" || busy === p.id} onClick={() => connect(p)}>
              {busy === p.id ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : <PlugZap className="mr-1 h-4 w-4" />}
              {linked.length ? "Reconnect" : "Connect"}
            </Button>
            <Button size="sm" variant="outline" asChild><Link to={`/connectors/social/${p.id}`}>Details</Link></Button>
          </div>
          {a !== "ready" && <p className="text-xs text-muted-foreground">{p.unavailableReason ?? p.setup}</p>}
        </CardContent>
      </Card>
    );
  };

  const accountRow = (acc: LinkedAccount) => {
    const p = socialProviderForService(acc.service_id)!;
    return (
      <li key={acc.id} className="rounded-md border border-border p-3 space-y-2">
        <div className="flex flex-wrap items-center gap-2">
          <span aria-hidden>{p.glyph}</span>
          <strong>{acc.account_name || acc.account_label || p.name}</strong>
          {acc.account_handle && <span className="text-sm text-muted-foreground">@{acc.account_handle}</span>}
          <Badge variant={isVerifiedConnection(acc) ? "default" : "outline"}>{accountState(acc)}</Badge>
        </div>
        <dl className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs text-muted-foreground sm:grid-cols-4">
          <div><dt>Connected</dt><dd>{fmt(acc.connected_at)}</dd></div>
          <div><dt>Last sync</dt><dd>{fmt(acc.last_synced_at)}</dd></div>
          <div><dt>Token</dt><dd>{acc.expires_at ? (new Date(acc.expires_at) < new Date() ? "Expired — reconnect" : `Valid until ${fmt(acc.expires_at)}`) : acc.health ?? "Unknown"}</dd></div>
          <div><dt>Permissions</dt><dd>{acc.scopes?.length ? `${acc.scopes.length} granted` : "None recorded"}</dd></div>
        </dl>
        {acc.last_error && <p role="alert" className="text-xs text-destructive">{acc.last_error}</p>}
        <div className="flex flex-wrap gap-2">
          <Button size="sm" variant="outline" onClick={() => void refresh()}><RefreshCw className="mr-1 h-3 w-3" />Refresh status</Button>
          <Button size="sm" variant="outline" disabled={providerAvailability(p, configured) !== "ready" || busy === p.id} onClick={() => connect(p)}>Reconnect</Button>
          <Button size="sm" variant="outline" asChild><Link to="/social/permissions">View permissions</Link></Button>
          {p.manageUrl && <Button size="sm" variant="ghost" asChild><a href={p.manageUrl} target="_blank" rel="noreferrer">Manage at {p.name.split(" ")[0]}<ExternalLink className="ml-1 h-3 w-3" /></a></Button>}
          <Button size="sm" variant="outline" className="text-destructive" disabled={busy === acc.id} onClick={() => remove(acc)}><Unlink className="mr-1 h-3 w-3" />Disconnect</Button>
        </div>
      </li>
    );
  };

  const empty = (text: string) => <p role="status" className="rounded-md border border-dashed border-border p-6 text-center text-sm text-muted-foreground">{text}</p>;

  const capableAccounts = (k: CapabilityKey) => verified.filter((a) => socialProviderForService(a.service_id)!.capabilities[k] !== "unavailable");

  const featureTab = (k: CapabilityKey, title: string, note: string) => {
    const list = capableAccounts(k);
    return (
      <section className="space-y-3">
        <h2 className="text-lg font-semibold">{title}</h2>
        <p className="text-sm text-muted-foreground">{note}</p>
        {list.length === 0 ? empty("No connected account allows this yet. Connect a supported platform first.")
          : <ul className="space-y-2">{list.map((a) => {
              const p = socialProviderForService(a.service_id)!;
              return <li key={a.id} className="flex flex-wrap items-center gap-2 rounded-md border border-border p-3 text-sm">
                <span aria-hidden>{p.glyph}</span>{a.account_name || p.name}
                <Badge variant="outline">{CAPABILITY_STATE_LABELS[p.capabilities[k]]}</Badge>
                <span className="text-xs text-muted-foreground">No data is loaded until this feature is enabled for the account.</span>
              </li>;
            })}</ul>}
      </section>
    );
  };

  const filters = (
    <div className="flex flex-wrap items-center gap-2">
      <div className="relative min-w-[12rem] flex-1">
        <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" aria-hidden />
        <Input aria-label="Search platforms" placeholder="Search platforms" className="pl-8" value={query} onChange={(e) => setQuery(e.target.value)} />
      </div>
      <select aria-label="Filter by state" className="rounded-md border border-border bg-background p-2 text-sm" value={stateFilter} onChange={(e) => setStateFilter(e.target.value as typeof stateFilter)}>
        <option value="all">All states</option><option value="connected">Connected</option><option value="error">Has errors</option>
        <option value="ready">Ready to connect</option><option value="setup">Setup required</option><option value="planned">Not yet supported</option><option value="unavailable">Unavailable</option>
      </select>
      <select aria-label="Filter by feature" className="rounded-md border border-border bg-background p-2 text-sm" value={capFilter} onChange={(e) => setCapFilter(e.target.value as typeof capFilter)}>
        <option value="all">Any feature</option>
        {(Object.keys(CAPABILITY_LABELS) as CapabilityKey[]).map((k) => <option key={k} value={k}>{CAPABILITY_LABELS[k]}</option>)}
      </select>
      <select aria-label="Sort" className="rounded-md border border-border bg-background p-2 text-sm" value={sort} onChange={(e) => setSort(e.target.value as typeof sort)}>
        <option value="name">Sort by name</option><option value="availability">Sort by availability</option>
      </select>
    </div>
  );

  const detail = selected ? <ProviderDetail p={selected} availability={providerAvailability(selected, configured)} accounts={socialAccounts.filter((a) => a.service_id === selected.serviceId)} onConnect={() => connect(selected)} busy={busy === selected.id} />
    : <p className="p-4 text-sm text-muted-foreground">Choose a platform's Details to see its capability matrix and setup requirements.</p>;

  let body: JSX.Element;
  switch (tab) {
    case "accounts":
      body = loading ? <p role="status"><Loader2 className="inline h-4 w-4 animate-spin" /> Loading your accounts…</p>
        : socialAccounts.length === 0 ? empty("You haven't connected any social accounts yet. Open Discover Platforms to connect one.")
        : <ul className="space-y-3">{socialAccounts.map(accountRow)}</ul>;
      break;
    case "content":
      body = featureTab("publish", "Content & Publishing", "Publishing is only offered where the platform's API and your granted permissions allow it, and always asks you to confirm first. The existing Post tab on Connectors stays available meanwhile.");
      break;
    case "analytics":
      body = featureTab("analytics", "Analytics", "Analytics appear only for accounts you authorised with analytics permissions. Nothing is estimated or invented.");
      break;
    case "inbox":
      body = featureTab("comments", "Inbox & Engagement", "Comments and messages are fetched only where the platform, account type and app approval permit it.");
      break;
    case "webhooks":
      body = (
        <section className="space-y-3">
          <h2 className="text-lg font-semibold">Webhooks</h2>
          <p className="text-sm text-muted-foreground">No webhook endpoints are configured. Each needs signature verification with the provider's signing secret before deliveries are accepted.</p>
          <ul className="grid gap-2 sm:grid-cols-2">{SOCIAL_PROVIDERS.filter((p) => p.capabilities.webhooks !== "unavailable").map((p) => (
            <li key={p.id} className="flex items-center justify-between rounded-md border border-border p-3 text-sm"><span>{p.glyph} {p.name}</span><Badge variant="outline">Not configured</Badge></li>
          ))}</ul>
        </section>
      );
      break;
    case "activity":
      body = <ActivityLog accounts={socialAccounts} />;
      break;
    case "permissions":
      body = (
        <section className="space-y-3">
          <h2 className="text-lg font-semibold">Permissions & Security</h2>
          <p className="flex items-start gap-2 text-sm text-muted-foreground"><ShieldCheck className="mt-0.5 h-4 w-4 text-primary" />Connecting a social account is separate from signing in to CyberLink. Tokens stay encrypted on the server; this page only shows what each provider granted.</p>
          {socialAccounts.length === 0 ? empty("No connected accounts, so no permissions have been granted.") : (
            <ul className="space-y-2">{socialAccounts.map((a) => {
              const p = socialProviderForService(a.service_id)!;
              return <li key={a.id} className="rounded-md border border-border p-3 text-sm">
                <div className="font-medium">{p.glyph} {a.account_name || p.name}</div>
                <div className="mt-1 flex flex-wrap gap-1">{a.scopes?.length ? a.scopes.map((s) => <Badge key={s} variant="outline" className="text-[10px]">{s}</Badge>) : <span className="text-xs text-muted-foreground">No granted permissions recorded.</span>}</div>
                {p.manageUrl && <a className="mt-2 inline-flex items-center text-xs text-primary underline" href={p.manageUrl} target="_blank" rel="noreferrer">Review or revoke at the provider <ExternalLink className="ml-1 h-3 w-3" /></a>}
              </li>;
            })}</ul>
          )}
        </section>
      );
      break;
    default:
      body = (
        <div className="space-y-3">
          {filters}
          {providers.length === 0 ? empty("No platforms match these filters.") : <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">{providers.map(providerCard)}</div>}
          <p className="text-xs text-muted-foreground">* Needs the provider's app review or a higher API tier.</p>
        </div>
      );
  }

  return (
    <main className="mx-auto max-w-7xl space-y-4 p-4">
      <header className="space-y-1">
        <h1 className="text-2xl font-bold">Social Media Accounts</h1>
        <p className="text-sm text-muted-foreground">Connect your own social accounts. Each connection uses the platform's official sign-in and approval screen and belongs only to you.</p>
        <div className="flex flex-wrap gap-2 pt-1">
          <Badge variant="outline">{verified.length} connected</Badge>
          <Badge variant="outline">{SOCIAL_PROVIDERS.filter((p) => providerAvailability(p, configured) === "ready").length} ready to connect</Badge>
          <Link to="/connectors" className="text-xs text-primary underline">All connectors</Link>
        </div>
      </header>
      {retry && <div role="alert" className="flex flex-wrap items-center gap-2 rounded-md border border-destructive/50 p-3 text-sm text-destructive">{retry}<Button size="sm" variant="outline" onClick={() => setRetry(null)}>Dismiss</Button></div>}
      <nav aria-label="Social sections" className="flex gap-1 overflow-x-auto border-b border-border pb-1">
        {TABS.map((t) => (
          <Button key={t.id} size="sm" variant={tab === t.id ? "secondary" : "ghost"} aria-current={tab === t.id ? "page" : undefined} onClick={() => navigate(t.path)}>{t.label}</Button>
        ))}
      </nav>
      {isMobile ? (
        <div className="space-y-3">
          <div>{body}</div>
          {selected && <details open className="rounded-md border border-border"><summary className="cursor-pointer p-3 font-medium">{selected.name} details</summary>{detail}</details>}
        </div>
      ) : (
        <ResizablePanelGroup direction="horizontal" autoSaveId={`cl-social-${tab}`} className="min-h-[60vh] rounded-md border border-border">
          <ResizablePanel defaultSize={selected && detailOpen ? 62 : 100} minSize={35} className="p-3"><div className="h-full overflow-auto">{body}</div></ResizablePanel>
          {selected && detailOpen && <><ResizableHandle withHandle /><ResizablePanel defaultSize={38} minSize={22} className="p-0"><div className="h-full overflow-auto">
            <div className="flex justify-end p-2"><Button size="sm" variant="ghost" onClick={() => setDetailOpen(false)}>Hide details</Button></div>{detail}</div></ResizablePanel></>}
        </ResizablePanelGroup>
      )}
      {!isMobile && selected && !detailOpen && <Button size="sm" variant="outline" onClick={() => setDetailOpen(true)}>Show {selected.name} details</Button>}
    </main>
  );
};

const ProviderDetail = ({ p, availability, accounts, onConnect, busy }: { p: SocialProvider; availability: ProviderAvailability; accounts: LinkedAccount[]; onConnect: () => void; busy: boolean }) => (
  <section className="space-y-3 p-4">
    <h2 className="flex items-center gap-2 text-lg font-semibold"><span aria-hidden>{p.glyph}</span>{p.name}</h2>
    <Badge variant={availabilityVariant(availability)}>{AVAILABILITY_TEXT[availability]}</Badge>
    <p className="text-sm text-muted-foreground">{p.unavailableReason ?? p.description}</p>
    <dl className="space-y-1 text-sm">
      <div><dt className="font-medium">Account types</dt><dd className="text-muted-foreground">{p.accountTypes}</dd></div>
      <div><dt className="font-medium">Setup requirement</dt><dd className="text-muted-foreground">{p.setup}</dd></div>
      <div><dt className="font-medium">Requested permissions</dt><dd className="text-muted-foreground">{p.scopes.length ? p.scopes.join(", ") : "None"}</dd></div>
      <div><dt className="font-medium">Your accounts</dt><dd className="text-muted-foreground">{accounts.length ? accounts.map((a) => `${a.account_name || a.account_label || "Account"} (${accountState(a)})`).join(", ") : "None connected"}</dd></div>
    </dl>
    <table className="w-full text-sm">
      <caption className="mb-1 text-left font-medium">Capability matrix</caption>
      <tbody>{(Object.keys(CAPABILITY_LABELS) as CapabilityKey[]).map((k) => (
        <tr key={k} className="border-t border-border"><th scope="row" className="py-1 text-left font-normal">{CAPABILITY_LABELS[k]}</th><td className="py-1 text-right text-muted-foreground">{CAPABILITY_STATE_LABELS[p.capabilities[k]]}</td></tr>
      ))}</tbody>
    </table>
    <div className="flex flex-wrap gap-2">
      <Button size="sm" disabled={availability !== "ready" || busy} onClick={onConnect}>{accounts.length ? "Reconnect" : "Connect"}</Button>
      <Button size="sm" variant="outline" asChild><a href={p.docsUrl} target="_blank" rel="noreferrer">Provider docs<ExternalLink className="ml-1 h-3 w-3" /></a></Button>
    </div>
  </section>
);

type Activity = { id: string; service_id: string; action: string; status: string; detail: string | null; created_at: string };

const ActivityLog = ({ accounts }: { accounts: LinkedAccount[] }) => {
  const [rows, setRows] = useState<Activity[] | null>(null);
  const services = useMemo(() => Array.from(new Set(accounts.map((a) => a.service_id))), [accounts]);
  useEffect(() => {
    let active = true;
    Promise.all(services.map((id) => supabase.functions.invoke("connector-credentials", { body: { action: "activity", service_id: id } })
      .then(({ data }) => (Array.isArray(data?.activity) ? data.activity as Activity[] : [])).catch(() => [] as Activity[])))
      .then((lists) => { if (active) setRows(lists.flat().sort((a, b) => b.created_at.localeCompare(a.created_at))); });
    return () => { active = false; };
  }, [services]);
  return (
    <section className="space-y-3">
      <h2 className="text-lg font-semibold">Activity & Errors</h2>
      {rows === null ? <p role="status">Loading activity…</p> : rows.length === 0
        ? <p role="status" className="rounded-md border border-dashed border-border p-6 text-center text-sm text-muted-foreground">No connection activity recorded yet.</p>
        : <ul className="space-y-1 font-mono text-xs">{rows.map((r) => (
            <li key={r.id} className={r.status === "ok" ? "" : "text-destructive"}>{fmt(r.created_at)} · {socialProviderForService(r.service_id)?.name ?? r.service_id} · {r.action} · {r.status}{r.detail ? ` · ${r.detail}` : ""}</li>
          ))}</ul>}
    </section>
  );
};

/** Providers return to the single allowlisted callback; this alias forwards there. */
export const SocialCallbackRedirect = () => {
  const { search, hash } = useLocation();
  return <Navigate to={`/auth/callback${search}${hash}`} replace />;
};

export default SocialHub;
