import { AlertTriangle, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";

interface MarketUnavailableProps {
  message?: string | null;
  onRetry?: () => void;
  className?: string;
}

/** Explicit unavailable state. We never substitute placeholder numbers. */
const MarketUnavailable = ({ message, onRetry, className = "" }: MarketUnavailableProps) => (
  <div className={`flex flex-col items-center justify-center gap-2 py-6 text-center ${className}`}>
    <AlertTriangle className="w-5 h-5 text-destructive" />
    <p className="text-sm text-muted-foreground">Live data unavailable</p>
    <p className="text-xs text-muted-foreground/80 max-w-xs break-words">
      {message ?? "The market feed did not respond."}
    </p>
    {onRetry && (
      <Button size="sm" variant="outline" onClick={onRetry} className="mt-1">
        <RefreshCw className="w-3 h-3 mr-1" /> Retry
      </Button>
    )}
  </div>
);

export default MarketUnavailable;
