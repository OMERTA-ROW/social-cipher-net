/**
 * Multi-chart trading workspace.
 *
 * All prices and candles come from the live market-data service (crypto feed
 * for crypto pairs, global equity/FX/futures feed for everything else). There
 * is no simulated data anywhere on this page: a missing feed renders an
 * explicit unavailable state.
 *
 * Feature access is gated by the project's existing subscription tiers
 * (free / plus / pro) through `useTradingTier`.
 */

import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  Grid2x2,
  History,
  Info,
  Plus,
  Save,
  ShieldCheck,
  Star,
  Trash2,
  Wallet,
} from "lucide-react";
import AppShell from "@/components/layout/AppShell";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import ChartPane, { type PaneConfig } from "@/components/trading/ChartPane";
import TradingChartWorkspace from "@/components/trading/TradingChartWorkspace";
import TradeConfirmDialog, {
  logTradingAction,
  type TradeIntent,
} from "@/components/trading/TradeConfirmDialog";
import SolanaWalletConnect from "@/components/trading/SolanaWalletConnect";
import { CryptoWalletConnect } from "@/components/CryptoWalletConnect";
import TradingDisclaimer from "@/components/market/TradingDisclaimer";
import MarketSourceBadge from "@/components/market/MarketSourceBadge";
import { useQuotes } from "@/hooks/useMarketData";
import { resolveSymbol, SYMBOL_SUGGESTIONS } from "@/lib/symbols";
import { useTradingTier, nextTierAbove } from "@/lib/tradingTiers";
import type { Timeframe } from "@/services/marketData";

const uid = () => Math.random().toString(36).slice(2, 10);

const makePane = (symbol = "BTC", timeframe: Timeframe = "1h"): PaneConfig => ({
  id: uid(),
  symbol,
  timeframe,
  chartType: "candles",
  indicators: ["volume"],
});

const DEFAULT_WATCH = ["BTC", "ETH", "AAPL", "SPY", "EURUSD=X", "GC=F"];

interface AuditRow {
  id: string;
  action: string;
  details: Record<string, unknown> | null;
  created_at: string;
}

const Trading = () => {
  const { tier, limits, loading: tierLoading, signedIn } = useTradingTier();
  const [grid, setGrid] = useState(1);
  const [panes, setPanes] = useState<PaneConfig[]>([makePane()]);
  const [watchlist, setWatchlist] = useState<string[]>(DEFAULT_WATCH);
  const [watchDraft, setWatchDraft] = useState("");
  const [layoutName, setLayoutName] = useState("My layout");
  const [layouts, setLayouts] = useState<{ id: string; name: string; grid: number; panes: PaneConfig[] }[]>([]);
  const [audit, setAudit] = useState<AuditRow[]>([]);
  const [intent, setIntent] = useState<TradeIntent | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);

  const upgrade = useCallback(
    (reason: string) => {
      const next = nextTierAbove(tier);
      toast.info(reason, {
        description: next ? `Upgrade to ${next === "plus" ? "Plus" : "Pro"} to unlock it.` : undefined,
      });
    },
    [tier],
  );

  /* keep pane count inside the tier's allowance */
  useEffect(() => {
    if (tierLoading) return;
    const allowedGrid = limits.grids.includes(grid) ? grid : limits.grids[limits.grids.length - 1];
    if (allowedGrid !== grid) setGrid(allowedGrid);
    setPanes((prev) => {
      const cap = Math.min(allowedGrid, limits.maxPanes);
      if (prev.length > cap) return prev.slice(0, cap);
      if (prev.length < cap) {
        const extra = Array.from({ length: cap - prev.length }, (_, i) =>
          makePane(DEFAULT_WATCH[(prev.length + i) % DEFAULT_WATCH.length]),
        );
        return [...prev, ...extra];
      }
      return prev;
    });
  }, [grid, limits, tierLoading]);

  /* saved layouts + audit trail */
  const loadSaved = useCallback(async () => {
    const { data: session } = await supabase.auth.getSession();
    if (!session.session) return;
    const [{ data: rows }, { data: lists }, { data: log }] = await Promise.all([
      supabase.from("trading_layouts").select("id, name, grid, panes").order("updated_at", { ascending: false }),
      supabase.from("trading_watchlists").select("symbols").order("updated_at", { ascending: false }).limit(1),
      supabase.from("trading_audit_log").select("id, action, details, created_at").order("created_at", { ascending: false }).limit(25),
    ]);
    setLayouts(
      (rows ?? []).map((r) => ({
        id: r.id,
        name: r.name,
        grid: r.grid,
        panes: (r.panes as unknown as PaneConfig[]) ?? [],
      })),
    );
    const saved = (lists?.[0]?.symbols as unknown as string[]) ?? null;
    if (saved?.length) setWatchlist(saved);
    setAudit((log ?? []) as unknown as AuditRow[]);
  }, []);

  useEffect(() => {
    loadSaved();
  }, [loadSaved]);

  const quotes = useQuotes("crypto", watchlist.filter((s) => resolveSymbol(s).assetClass === "crypto").map((s) => resolveSymbol(s).symbol), limits.refreshMs);
  const stockQuotes = useQuotes("stock", watchlist.filter((s) => resolveSymbol(s).assetClass === "stock").map((s) => resolveSymbol(s).symbol), limits.refreshMs);
  const allQuotes = useMemo(
    () => [...(quotes.data ?? []), ...(stockQuotes.data ?? [])],
    [quotes.data, stockQuotes.data],
  );

  const saveLayout = async () => {
    const { data: session } = await supabase.auth.getSession();
    const user = session.session?.user;
    if (!user) {
      toast.error("Sign in to save layouts.");
      return;
    }
    if (layouts.length >= limits.maxLayouts) {
      upgrade(`Your plan saves ${limits.maxLayouts} layout${limits.maxLayouts === 1 ? "" : "s"}.`);
      return;
    }
    const { error } = await supabase.from("trading_layouts").insert({
      user_id: user.id,
      name: layoutName || "Layout",
      grid,
      panes: panes as never,
    });
    if (error) {
      toast.error(error.message);
      return;
    }
    await logTradingAction("layout_saved", { name: layoutName, grid });
    toast.success("Layout saved");
    loadSaved();
  };

  const saveWatchlist = async () => {
    const { data: session } = await supabase.auth.getSession();
    const user = session.session?.user;
    if (!user) {
      toast.error("Sign in to save your watchlist.");
      return;
    }
    const { data: existing } = await supabase.from("trading_watchlists").select("id").limit(1);
    const payload = { user_id: user.id, name: "Default", symbols: watchlist as never };
    const { error } = existing?.length
      ? await supabase.from("trading_watchlists").update(payload).eq("id", existing[0].id)
      : await supabase.from("trading_watchlists").insert(payload);
    if (error) toast.error(error.message);
    else toast.success("Watchlist saved");
  };

  const applyLayout = (id: string) => {
    const found = layouts.find((l) => l.id === id);
    if (!found) return;
    const cap = Math.min(found.grid, limits.maxPanes);
    setGrid(limits.grids.includes(found.grid) ? found.grid : limits.grids[limits.grids.length - 1]);
    setPanes(found.panes.slice(0, cap).map((p) => ({ ...p, id: uid() })));
  };

  const openPreview = () => {
    setIntent({
      kind: "trade",
      asset: panes[0]?.symbol ?? "BTC",
      amount: "—",
      price: "—",
      fees: "Shown by your wallet or broker before you sign",
      slippage: "Set in your wallet or broker",
      venue: "Your connected account",
      userInitiated: true,
    });
    setConfirmOpen(true);
  };

  return (
    <AppShell>
      <div className="space-y-4">
        <header className="flex flex-wrap items-center gap-3">
          <h1 className="text-xl font-semibold">Trading workspace</h1>
          <Badge variant="outline" className="text-[10px] uppercase">
            {limits.label} plan
          </Badge>
          {!signedIn && (
            <Link to="/auth" className="text-xs text-primary underline">
              Sign in to save layouts
            </Link>
          )}
          <Link to="/subscription" className="ml-auto text-xs text-primary underline">
            Compare plans
          </Link>
        </header>

        <Tabs defaultValue="charts" className="space-y-4">
          <TabsList>
            <TabsTrigger value="charts">Charts</TabsTrigger>
            <TabsTrigger value="watchlist">Watchlist</TabsTrigger>
            <TabsTrigger value="accounts">Wallets &amp; accounts</TabsTrigger>
            <TabsTrigger value="activity">Activity log</TabsTrigger>
          </TabsList>

          {/* ------------------------------ charts ------------------------------ */}
          <TabsContent value="charts" className="space-y-3">
            <div className="flex flex-wrap items-center gap-2">
              <Grid2x2 className="h-4 w-4 text-muted-foreground" />
              {[1, 2, 4, 6, 9].map((g) => {
                const locked = !limits.grids.includes(g);
                return (
                  <Button
                    key={g}
                    size="sm"
                    variant={grid === g ? "default" : "outline"}
                    onClick={() =>
                      locked
                        ? upgrade(`A ${g}-chart grid is available on a higher plan.`)
                        : setGrid(g)
                    }
                    className={locked ? "opacity-50" : ""}
                  >
                    {g}
                  </Button>
                );
              })}
              <Button
                size="sm"
                variant="outline"
                onClick={() =>
                  panes.length >= Math.min(grid, limits.maxPanes)
                    ? upgrade(`Your plan shows ${limits.maxPanes} chart${limits.maxPanes === 1 ? "" : "s"} at once.`)
                    : setPanes((p) => [...p, makePane()])
                }
              >
                <Plus className="mr-1 h-3 w-3" /> Add chart
              </Button>

              <div className="ml-auto flex items-center gap-2">
                <Input
                  value={layoutName}
                  onChange={(e) => setLayoutName(e.target.value)}
                  className="h-8 w-40 text-xs"
                  aria-label="Layout name"
                />
                <Button size="sm" variant="outline" onClick={saveLayout}>
                  <Save className="mr-1 h-3 w-3" /> Save layout
                </Button>
              </div>
            </div>

            {layouts.length > 0 && (
              <div className="flex flex-wrap items-center gap-2 text-xs">
                <span className="text-muted-foreground">Saved:</span>
                {layouts.map((l) => (
                  <span key={l.id} className="flex items-center gap-1">
                    <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => applyLayout(l.id)}>
                      {l.name}
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-7 w-7"
                      aria-label={`Delete ${l.name}`}
                      onClick={async () => {
                        await supabase.from("trading_layouts").delete().eq("id", l.id);
                        loadSaved();
                      }}
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </span>
                ))}
              </div>
            )}

            <TradingChartWorkspace
              panes={panes.slice(0, Math.min(grid, limits.maxPanes))}
              limits={limits}
              onChange={(next) => setPanes((current) => current.map((pane) => (pane.id === next.id ? next : pane)))}
              onRemove={(id) => setPanes((current) => (current.length > 1 ? current.filter((pane) => pane.id !== id) : current))}
              onUpgradeNeeded={upgrade}
            />

            <Card className="border-border/60 bg-card/60">
              <CardContent className="space-y-2 p-3">
                <p className="flex items-start gap-2 text-xs text-muted-foreground">
                  <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                  Crypto prices are real-time exchange data. Equities, ETFs, forex, futures, indices and
                  commodities are delayed by the venue. Each chart shows its own source and freshness.
                </p>
                <TradingDisclaimer />
              </CardContent>
            </Card>
          </TabsContent>

          {/* ---------------------------- watchlist ---------------------------- */}
          <TabsContent value="watchlist" className="space-y-3">
            <div className="flex flex-wrap items-center gap-2">
              <Input
                value={watchDraft}
                onChange={(e) => setWatchDraft(e.target.value)}
                placeholder="Add a ticker (BTC, AAPL, EURUSD=X, GC=F, ^GSPC)"
                className="h-8 max-w-xs text-xs"
                onKeyDown={(e) => {
                  if (e.key !== "Enter") return;
                  const s = watchDraft.trim().toUpperCase();
                  if (s && !watchlist.includes(s)) setWatchlist((w) => [...w, s]);
                  setWatchDraft("");
                }}
              />
              <Button size="sm" variant="outline" onClick={saveWatchlist}>
                <Star className="mr-1 h-3 w-3" /> Save watchlist
              </Button>
            </div>

            <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
              {SYMBOL_SUGGESTIONS.map((s) => (
                <Button
                  key={s.symbol}
                  size="sm"
                  variant="ghost"
                  className="h-7 text-xs"
                  onClick={() => setWatchlist((w) => (w.includes(s.symbol) ? w : [...w, s.symbol]))}
                >
                  {s.symbol} · {s.label}
                </Button>
              ))}
            </div>

            <Card className="border-border/60 bg-card/60">
              <CardContent className="divide-y divide-border/50 p-0">
                {watchlist.map((symbol) => {
                  const r = resolveSymbol(symbol);
                  const q = allQuotes.find((x) => x.symbol.toUpperCase() === r.symbol.toUpperCase());
                  return (
                    <div key={symbol} className="flex items-center gap-3 px-3 py-2 text-sm">
                      <button
                        className="font-semibold hover:text-primary"
                        onClick={() =>
                          setPanes((p) => [{ ...p[0], symbol }, ...p.slice(1)])
                        }
                      >
                        {symbol}
                      </button>
                      <span className="ml-auto tabular-nums">
                        {q ? q.price.toLocaleString(undefined, { maximumFractionDigits: 6 }) : "not connected"}
                      </span>
                      <span
                        className={`w-20 text-right tabular-nums ${
                          q ? (q.change24h >= 0 ? "text-primary" : "text-destructive") : "text-muted-foreground"
                        }`}
                      >
                        {q ? `${q.change24h >= 0 ? "+" : ""}${q.change24h.toFixed(2)}%` : "—"}
                      </span>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-7 w-7"
                        aria-label={`Remove ${symbol}`}
                        onClick={() => setWatchlist((w) => w.filter((s) => s !== symbol))}
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  );
                })}
              </CardContent>
            </Card>
            <MarketSourceBadge
              connected={quotes.connected || stockQuotes.connected}
              source={[quotes.source, stockQuotes.source].filter(Boolean).join(" + ") || null}
              latency={stockQuotes.latency ?? quotes.latency}
              asOf={Math.max(quotes.asOf ?? 0, stockQuotes.asOf ?? 0) || null}
              error={quotes.error ?? stockQuotes.error}
            />
          </TabsContent>

          {/* ----------------------------- accounts ----------------------------- */}
          <TabsContent value="accounts" className="space-y-3">
            <Card className="border-border/60 bg-card/60">
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-base">
                  <Wallet className="h-4 w-4" /> Crypto wallets
                </CardTitle>
                <CardDescription>
                  MetaMask, Coinbase Wallet, Trust Wallet and any WalletConnect wallet below; Phantom and
                  Solflare connect through their own extensions. Non-custodial — you keep your keys.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <CryptoWalletConnect />
                <SolanaWalletConnect />
              </CardContent>
            </Card>

            <Card className="border-border/60 bg-card/60">
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Exchanges &amp; brokerages</CardTitle>
                <CardDescription>
                  Connected through the Connectors page using each platform's official documented API with
                  your own read or trade keys. Keys are encrypted on our servers and never sent to the browser.
                  Your plan allows {limits.maxConnections} connected account
                  {limits.maxConnections === 1 ? "" : "s"}.
                </CardDescription>
              </CardHeader>
              <CardContent className="flex flex-wrap items-center gap-2">
                <Link to="/connectors">
                  <Button size="sm" variant="outline">Open Connectors</Button>
                </Link>
                <Button size="sm" variant="ghost" onClick={openPreview}>
                  <ShieldCheck className="mr-1 h-3 w-3" /> See the confirmation step
                </Button>
              </CardContent>
            </Card>

            <Card className="border-border/60 bg-card/60">
              <CardContent className="space-y-2 p-3 text-xs text-muted-foreground">
                <p>
                  Every trade, transfer, swap and approval needs your explicit confirmation with a full
                  preview first. No agent, bot or automation on this platform can move money on its own —
                  that block is written into the code, not a setting you can switch off.
                </p>
                <p>We never take custody of funds, keys or seed phrases.</p>
                <TradingDisclaimer />
              </CardContent>
            </Card>
          </TabsContent>

          {/* ----------------------------- activity ----------------------------- */}
          <TabsContent value="activity">
            <Card className="border-border/60 bg-card/60">
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-base">
                  <History className="h-4 w-4" /> Activity log
                </CardTitle>
                <CardDescription>
                  A permanent record of your trading-layer actions. Entries can be read but never edited or
                  deleted.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-2">
                {audit.length === 0 ? (
                  <p className="text-xs text-muted-foreground">No actions recorded yet.</p>
                ) : (
                  audit.map((row) => (
                    <div key={row.id} className="flex flex-wrap items-center gap-2 border-b border-border/40 pb-1 text-xs">
                      <span className="font-medium">{row.action.replace(/_/g, " ")}</span>
                      <span className="text-muted-foreground">
                        {new Date(row.created_at).toLocaleString()}
                      </span>
                      <span className="ml-auto max-w-[60%] truncate text-muted-foreground">
                        {JSON.stringify(row.details ?? {})}
                      </span>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      <TradeConfirmDialog
        intent={intent}
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        onConfirm={async () => {
          toast.info("Nothing was sent — connect an exchange or wallet to complete an order.");
        }}
      />
    </AppShell>
  );
};

export default Trading;
