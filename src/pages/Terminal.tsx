/**
 * Sandboxed Terminal.
 *
 * Commands are an allow-list that only ever reads the signed-in user's own
 * data through the normal row-level rules — there is no shell, no arbitrary
 * query and no way to reach another account. Anything that would move money
 * is refused in code, not by configuration.
 */

import { useCallback, useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { Lock, TerminalSquare } from "lucide-react";
import AppShell from "@/components/layout/AppShell";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { getQuotes } from "@/services/marketData";
import { resolveSymbol } from "@/lib/symbols";

type Line = { kind: "in" | "out" | "err"; text: string };

const MONEY = /\b(trade|buy|sell|swap|send|transfer|withdraw|mint|payout|approve|stake)\b/i;

const HELP = `Available commands
  help                 this list
  whoami               your account
  profile              your profile summary
  posts [n]            your latest posts (default 5)
  followers            follower and following counts
  earnings             your recorded earnings total
  connections          connected platforms and their status
  agents               your AI agents
  market <SYMBOL>      live price for a ticker
  ask <question>       ask your selected AI agent
  history              recent terminal commands
  clear                clear the screen

Money actions (trades, transfers, withdrawals, mints) can never run here.`;

const Terminal = () => {
  const [lines, setLines] = useState<Line[]>([
    { kind: "out", text: "Cyber Link Terminal. Type `help` to begin." },
  ]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [allowed, setAllowed] = useState<boolean | null>(null);
  const [signedIn, setSignedIn] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.auth.getSession();
      const user = data.session?.user;
      setSignedIn(!!user);
      if (!user) {
        setAllowed(false);
        return;
      }
      const { data: ent } = await supabase
        .from("user_entitlements")
        .select("tier_key")
        .eq("status", "active");
      const keys = (ent ?? []).map((e) => e.tier_key);
      setAllowed(keys.includes("terminal") || keys.includes("pro"));
    })();
  }, []);

  useEffect(() => {
    endRef.current?.scrollIntoView({ block: "end" });
  }, [lines]);

  const push = (kind: Line["kind"], text: string) => setLines((l) => [...l, { kind, text }]);

  const run = useCallback(async (raw: string) => {
    const cmd = raw.trim();
    if (!cmd) return;
    push("in", `> ${cmd}`);

    const [name, ...rest] = cmd.split(/\s+/);
    const arg = rest.join(" ");
    const verb = name.toLowerCase();

    if (verb !== "ask" && MONEY.test(cmd)) {
      push(
        "err",
        "Refused. Money actions never run from the Terminal — open the trading workspace and confirm them yourself.",
      );
      return;
    }

    try {
      switch (verb) {
        case "help":
          push("out", HELP);
          return;
        case "clear":
          setLines([]);
          return;
        case "whoami": {
          const { data } = await supabase.auth.getUser();
          const u = data.user;
          push("out", u ? `${u.email ?? "no email"}  ·  id ${u.id}` : "Not signed in.");
          return;
        }
        case "profile": {
          const { data } = await supabase.auth.getUser();
          const { data: p } = await supabase
            .from("profiles")
            .select("username, display_name, bio, is_verified")
            .eq("id", data.user!.id)
            .maybeSingle();
          push(
            "out",
            p
              ? `@${p.username ?? "—"}  ${p.display_name ?? ""}\nverified: ${p.is_verified ? "yes" : "no"}\n${p.bio ?? ""}`
              : "No profile row yet.",
          );
          return;
        }
        case "posts": {
          const n = Math.min(Math.max(Number(arg) || 5, 1), 25);
          const { data } = await supabase.auth.getUser();
          const { data: posts } = await supabase
            .from("posts")
            .select("content, like_count, created_at")
            .eq("user_id", data.user!.id)
            .order("created_at", { ascending: false })
            .limit(n);
          push(
            "out",
            posts?.length
              ? posts
                  .map(
                    (p) =>
                      `${new Date(p.created_at).toLocaleDateString()}  ♥${p.like_count ?? 0}  ${(p.content ?? "").slice(0, 80)}`,
                  )
                  .join("\n")
              : "No posts yet.",
          );
          return;
        }
        case "followers": {
          const { data } = await supabase.auth.getUser();
          const { data: counts } = await supabase.rpc("get_follow_counts", { target_user: data.user!.id });
          const row = Array.isArray(counts) ? counts[0] : counts;
          push("out", `followers: ${row?.followers_count ?? 0}   following: ${row?.following_count ?? 0}`);
          return;
        }
        case "earnings": {
          const { data } = await supabase.auth.getUser();
          const { data: rows } = await supabase
            .from("creator_earnings")
            .select("amount, earning_type")
            .eq("creator_id", data.user!.id);
          const total = (rows ?? []).reduce((a, r) => a + Number(r.amount ?? 0), 0);
          push("out", `recorded earnings: $${total.toFixed(2)} across ${rows?.length ?? 0} entries`);
          return;
        }
        case "connections": {
          const { data: rows } = await supabase
            .from("user_connections")
            .select("service_id, status, health, account_name")
            .limit(50);
          push(
            "out",
            rows?.length
              ? rows.map((r) => `${r.service_id.padEnd(14)} ${r.status ?? "unknown"} / ${r.health ?? "—"}  ${r.account_name ?? ""}`).join("\n")
              : "No connected platforms yet. Open Connectors to add one.",
          );
          return;
        }
        case "agents": {
          const { data: rows } = await supabase
            .from("ai_agents")
            .select("label, provider, model, status, is_terminal_agent");
          push(
            "out",
            rows?.length
              ? rows
                  .map(
                    (a) =>
                      `${a.is_terminal_agent ? "*" : " "} ${a.label} · ${a.provider}${a.model ? ` · ${a.model}` : ""} · ${a.status}`,
                  )
                  .join("\n")
              : "No AI agents connected yet.",
          );
          return;
        }
        case "market": {
          if (!arg) {
            push("err", "Usage: market BTC");
            return;
          }
          const r = resolveSymbol(arg);
          const res = await getQuotes(r.assetClass, [r.symbol]);
          const q = res.quotes[0];
          push(
            "out",
            q
              ? `${q.symbol}  ${q.price}  ${q.change24h >= 0 ? "+" : ""}${q.change24h.toFixed(2)}%  · ${res.source} (${res.latency})`
              : `No live feed connected for ${r.symbol}.`,
          );
          return;
        }
        case "history": {
          const { data: rows } = await supabase
            .from("terminal_commands")
            .select("command, created_at")
            .order("created_at", { ascending: false })
            .limit(15);
          push(
            "out",
            rows?.length
              ? rows.map((r) => `${new Date(r.created_at).toLocaleTimeString()}  ${r.command}`).join("\n")
              : "No history yet.",
          );
          return;
        }
        case "ask": {
          if (!arg) {
            push("err", "Usage: ask how is my account doing?");
            return;
          }
          setBusy(true);
          const { data, error } = await supabase.functions.invoke("terminal-agent", {
            body: { prompt: arg },
          });
          if (error) throw error;
          if ((data as { error?: string })?.error) throw new Error((data as { error: string }).error);
          push("out", `${(data as { answer: string }).answer}\n\n— ${(data as { agent: string }).agent}`);
          return;
        }
        default:
          push("err", `Unknown command: ${verb}. Type \`help\`.`);
      }
    } catch (e) {
      push("err", e instanceof Error ? e.message : "Command failed.");
    } finally {
      setBusy(false);
    }
  }, []);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const cmd = input;
    setInput("");
    await run(cmd);
  };

  return (
    <AppShell>
      <div className="space-y-4">
        <header className="flex flex-wrap items-center gap-3">
          <h1 className="flex items-center gap-2 text-xl font-semibold">
            <TerminalSquare className="h-5 w-5" /> Terminal
          </h1>
          <Badge variant="outline" className="text-[10px] uppercase">
            sandboxed
          </Badge>
        </header>

        {allowed === false ? (
          <Card className="border-border/60 bg-card/60">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Lock className="h-4 w-4" /> Terminal is a paid feature
              </CardTitle>
              <CardDescription>
                {signedIn
                  ? "Add the Terminal add-on, or move to the Pro plan, to use it."
                  : "Sign in with a plan that includes the Terminal to use it."}
              </CardDescription>
            </CardHeader>
            <CardContent className="flex gap-2">
              <Link to="/subscription">
                <Button size="sm">See plans</Button>
              </Link>
              {!signedIn && (
                <Link to="/auth">
                  <Button size="sm" variant="outline">
                    Sign in
                  </Button>
                </Link>
              )}
            </CardContent>
          </Card>
        ) : (
          <Card className="border-border/60 bg-black/70">
            <CardContent className="p-0">
              <div className="max-h-[60vh] overflow-y-auto p-4 font-mono text-xs leading-relaxed">
                {lines.map((l, i) => (
                  <pre
                    key={i}
                    className={`whitespace-pre-wrap break-words ${
                      l.kind === "in"
                        ? "text-primary"
                        : l.kind === "err"
                          ? "text-destructive"
                          : "text-foreground/85"
                    }`}
                  >
                    {l.text}
                  </pre>
                ))}
                <div ref={endRef} />
              </div>
              <form onSubmit={submit} className="flex items-center gap-2 border-t border-border/60 p-2">
                <span className="pl-1 font-mono text-xs text-primary">$</span>
                <input
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  disabled={busy || allowed === null}
                  placeholder={busy ? "working…" : "type a command"}
                  className="flex-1 bg-transparent font-mono text-xs outline-none placeholder:text-muted-foreground"
                  aria-label="Terminal input"
                  autoFocus
                />
              </form>
            </CardContent>
          </Card>
        )}

        <p className="text-[10px] text-muted-foreground">
          Read-only sandbox over your own account. No shell access, no other accounts, and no trades,
          transfers, withdrawals or mints — those always need your own confirmation in the app.
        </p>
      </div>
    </AppShell>
  );
};

export default Terminal;
