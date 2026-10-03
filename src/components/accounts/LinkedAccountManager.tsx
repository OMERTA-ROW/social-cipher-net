import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { isVerifiedConnection, connectionNeedsAttention } from "@/lib/integrationStatus";
import { Input } from "@/components/ui/input";
import { CheckCircle2, Link2, Loader2, Pencil, RefreshCw, Unlink } from "lucide-react";
import { toast } from "sonner";
import { useLinkedAccounts, type LinkedAccount } from "@/hooks/useLinkedAccounts";
import { CONNECTOR_SERVICES, getService } from "@/lib/connectors/registry";

interface Props {
  /** Limit the manager to one connector category, e.g. only trading accounts. */
  category?: string;
  title?: string;
  description?: string;
}

/**
 * Multiple accounts per provider, with one marked active. Connecting and
 * reconnecting always go through the Connectors screen so credentials are
 * collected and encrypted server-side — nothing sensitive is handled here.
 */
export const LinkedAccountManager = ({
  category,
  title = "Linked accounts",
  description = "Each provider can hold several accounts. The active one is used for reading and publishing.",
}: Props) => {
  const { accounts, loading, forService, setActive, rename, disconnect } = useLinkedAccounts();
  const [busy, setBusy] = useState<string | null>(null);
  const [editing, setEditing] = useState<string | null>(null);
  const [draftLabel, setDraftLabel] = useState("");

  const services = useMemo(() => {
    const ids = Array.from(new Set(accounts.map((a) => a.service_id)));
    return ids
      .map((id) => ({ id, service: getService(id) }))
      .filter(({ service }) => !category || service?.category === category);
  }, [accounts, category]);

  const relevantCatalogue = CONNECTOR_SERVICES.filter((s) => !category || s.category === category);

  const run = async (key: string, fn: () => Promise<unknown>, okMessage: string) => {
    setBusy(key);
    try {
      await fn();
      toast.success(okMessage);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "That did not work");
    } finally {
      setBusy(null);
    }
  };

  const statusBadge = (account: LinkedAccount) => {
    if (isVerifiedConnection(account)) {
      return <Badge variant="outline" className="border-primary/40 text-primary">Connected</Badge>;
    }
    if (connectionNeedsAttention(account)) {
      return <Badge variant="destructive">Connection failed</Badge>;
    }
    // Saved keys/tokens that no provider has verified: kept as-is, never shown as connected.
    return <Badge variant="secondary">Not verified</Badge>;
  };

  return (
    <Card className="bg-card/60 border-primary/20 backdrop-blur-sm">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <Link2 className="h-5 w-5 text-primary" />
          {title}
        </CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {loading && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" /> Loading your accounts…
          </div>
        )}

        {!loading && services.length === 0 && (
          <div className="rounded-lg border border-border/60 p-4 text-sm text-muted-foreground">
            You have no accounts linked here yet.{" "}
            <Link to="/integrations" className="text-primary hover:underline">
              Open Connections
            </Link>{" "}
            to add one. {relevantCatalogue.length} provider
            {relevantCatalogue.length === 1 ? " is" : "s are"} available to link.
          </div>
        )}

        {services.map(({ id, service }) => {
          const list = forService(id);
          return (
            <div key={id} className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-lg">{service?.glyph ?? "🔗"}</span>
                  <span className="font-medium">{service?.name ?? id}</span>
                  <Badge variant="secondary">{list.length} account{list.length === 1 ? "" : "s"}</Badge>
                </div>
                <Button asChild size="sm" variant="outline">
                  <Link to="/integrations">Add another</Link>
                </Button>
              </div>

              <div className="space-y-2">
                {list.map((account) => (
                  <div
                    key={account.id}
                    className="flex flex-wrap items-center gap-3 rounded-lg border border-border/60 bg-background/40 p-3"
                  >
                    <div className="min-w-[10rem] flex-1">
                      {editing === account.id ? (
                        <div className="flex items-center gap-2">
                          <Input
                            value={draftLabel}
                            onChange={(e) => setDraftLabel(e.target.value)}
                            placeholder="Account name"
                            className="h-8"
                          />
                          <Button
                            size="sm"
                            disabled={busy === account.id}
                            onClick={() =>
                              run(account.id, async () => {
                                await rename(id, account.id, draftLabel.trim());
                                setEditing(null);
                              }, "Account renamed")
                            }
                          >
                            Save
                          </Button>
                        </div>
                      ) : (
                        <>
                          <p className="text-sm font-medium">
                            {account.account_label || account.account_name || account.account_handle || account.account_key}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            Linked {new Date(account.connected_at).toLocaleDateString()} · {account.method}
                          </p>
                        </>
                      )}
                      {account.last_error && (
                        <p className="mt-1 text-xs text-destructive">{account.last_error}</p>
                      )}
                    </div>

                    {statusBadge(account)}
                    {account.is_active_account && isVerifiedConnection(account) ? (
                      <Badge className="gap-1">
                        <CheckCircle2 className="h-3 w-3" /> Active
                      </Badge>
                    ) : account.is_active_account ? (
                      <Badge variant="outline" className="text-muted-foreground">
                        Default (not verified)
                      </Badge>
                    ) : (
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={busy === account.id}
                        onClick={() => run(account.id, () => setActive(id, account.id), "Active account changed")}
                      >
                        Make active
                      </Button>
                    )}

                    <Button
                      size="icon"
                      variant="ghost"
                      aria-label="Rename account"
                      onClick={() => {
                        setEditing(account.id);
                        setDraftLabel(account.account_label ?? "");
                      }}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button asChild size="icon" variant="ghost" aria-label="Reconnect account">
                      <Link to="/integrations">
                        <RefreshCw className="h-4 w-4" />
                      </Link>
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      aria-label="Disconnect account"
                      disabled={busy === account.id}
                      onClick={() => run(account.id, () => disconnect(id, account.id), "Account disconnected")}
                    >
                      <Unlink className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
};

export default LinkedAccountManager;
