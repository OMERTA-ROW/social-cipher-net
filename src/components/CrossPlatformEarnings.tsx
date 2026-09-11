import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Link } from "react-router-dom";
import { DollarSign, RefreshCw, AlertTriangle, PlugZap, Radio } from "lucide-react";
import { useCrossPlatformEarnings, type EarningsEntry } from "@/hooks/useCrossPlatformEarnings";

const money = (amount: number, currency = "USD") =>
  new Intl.NumberFormat(undefined, { style: "currency", currency }).format(amount);

const timeOf = (iso: string) =>
  new Date(iso).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" });

const StatusNote = ({ entry }: { entry: EarningsEntry }) => {
  if (entry.status === "ok") return null;
  const icon =
    entry.status === "needs_reconnect" ? (
      <PlugZap className="h-3 w-3" />
    ) : (
      <AlertTriangle className="h-3 w-3" />
    );
  return (
    <p className="text-xs text-muted-foreground flex items-start gap-1.5">
      <span className="mt-0.5">{icon}</span>
      <span>{entry.detail ?? "No earnings figure available."}</span>
    </p>
  );
};

export const CrossPlatformEarnings = ({ days = 30 }: { days?: number }) => {
  const { data, isLoading, isFetching, error, refetch } = useCrossPlatformEarnings(days);

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-28 w-full" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Skeleton className="h-24" />
          <Skeleton className="h-24" />
          <Skeleton className="h-24" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Earnings unavailable</CardTitle>
          <CardDescription>
            {(error as Error).message || "We could not reach your connected accounts."}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button variant="outline" onClick={() => refetch()}>
            <RefreshCw className="w-4 h-4 mr-2" />
            Try again
          </Button>
        </CardContent>
      </Card>
    );
  }

  const entries = data?.entries ?? [];
  const live = entries.filter((e) => e.status === "ok");
  const blocked = entries.filter((e) => e.status !== "ok");

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="flex flex-row items-start justify-between space-y-0">
          <div>
            <CardTitle className="flex items-center gap-2">
              <DollarSign className="h-5 w-5 text-muted-foreground" />
              Combined earnings
            </CardTitle>
            <CardDescription>
              Last {data?.period.days ?? days} days across every connected account
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="gap-1">
              <Radio className={`h-3 w-3 ${isFetching ? "animate-pulse" : ""}`} />
              {isFetching ? "Updating" : "Live"}
            </Badge>
            <Button size="icon" variant="ghost" onClick={() => refetch()} title="Refresh now">
              <RefreshCw className={`h-4 w-4 ${isFetching ? "animate-spin" : ""}`} />
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="text-4xl font-bold">{money(data?.total ?? 0, data?.currency)}</div>
          <p className="text-xs text-muted-foreground mt-1">
            {live.length} account{live.length === 1 ? "" : "s"} reporting
            {data?.generated_at ? ` • updated ${timeOf(data.generated_at)}` : ""}
          </p>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {live.map((entry) => (
          <Card key={entry.service_id}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <span aria-hidden>{entry.glyph}</span>
                {entry.name}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {money(entry.amount ?? 0, entry.currency)}
              </div>
              <p className="text-xs text-muted-foreground">
                Updated {timeOf(entry.fetched_at)}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      {blocked.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Accounts not reporting money</CardTitle>
            <CardDescription>
              These are connected, but their platform does not hand us a figure right now.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {blocked.map((entry) => (
              <div key={entry.service_id} className="flex items-start justify-between gap-4">
                <div className="space-y-1">
                  <p className="text-sm font-medium flex items-center gap-2">
                    <span aria-hidden>{entry.glyph}</span>
                    {entry.name}
                  </p>
                  <StatusNote entry={entry} />
                </div>
                {entry.status === "needs_reconnect" && (
                  <Button asChild size="sm" variant="outline">
                    <Link to="/connectors">Reconnect</Link>
                  </Button>
                )}
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {entries.length <= 1 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Connect your accounts</CardTitle>
            <CardDescription>
              Link your social, streaming and store accounts and their earnings appear here live.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild>
              <Link to="/connectors">Open connections</Link>
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default CrossPlatformEarnings;
