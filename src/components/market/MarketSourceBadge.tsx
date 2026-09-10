import { AlertTriangle, Wifi, WifiOff } from "lucide-react";
import { formatAsOf } from "@/services/marketData";

interface MarketSourceBadgeProps {
  source?: string | null;
  latency?: "realtime" | "delayed" | null;
  asOf?: number | null;
  connected: boolean;
  error?: string | null;
  extra?: string | null;
  className?: string;
}

/** Honest provenance line: provider, latency, freshness and connection state. */
const MarketSourceBadge = ({
  source,
  latency,
  asOf,
  connected,
  error,
  extra,
  className = "",
}: MarketSourceBadgeProps) => (
  <div className={`flex flex-wrap items-center gap-x-2 gap-y-1 text-[10px] text-muted-foreground ${className}`}>
    {connected ? (
      <span className="flex items-center gap-1 text-primary">
        <Wifi className="w-3 h-3" /> Live
      </span>
    ) : (
      <span className="flex items-center gap-1 text-destructive">
        <WifiOff className="w-3 h-3" /> Disconnected
      </span>
    )}
    <span>·</span>
    <span>{source ?? "No source"}</span>
    {latency && (
      <>
        <span>·</span>
        <span>{latency === "realtime" ? "real-time" : "delayed"}</span>
      </>
    )}
    <span>·</span>
    <span>updated {formatAsOf(asOf)}</span>
    {extra && (
      <>
        <span>·</span>
        <span>{extra}</span>
      </>
    )}
    {error && (
      <span className="flex items-center gap-1 text-destructive">
        <AlertTriangle className="w-3 h-3" /> {error}
      </span>
    )}
  </div>
);

export default MarketSourceBadge;
