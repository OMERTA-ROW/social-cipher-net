import { useEffect, useMemo, useState } from "react";
import { Crosshair } from "lucide-react";
import { buildCrackWeb } from "./crackGeometry";
import type { SnipeHit } from "@/hooks/useSnipeStatus";

const formatRemaining = (ms: number) => {
  if (ms <= 0) return "expired";
  const hours = Math.floor(ms / 3600000);
  const minutes = Math.floor((ms % 3600000) / 60000);
  if (hours >= 24) {
    const days = Math.floor(hours / 24);
    return `${days}d ${hours % 24}h left`;
  }
  if (hours > 0) return `${hours}h ${minutes}m left`;
  return `${minutes}m left`;
};

interface CrackOverlayProps {
  hits: SnipeHit[];
  expiresAt: number | null;
  /** Hide the little counter badge (used while the strike is playing). */
  hideBadge?: boolean;
}

/**
 * Persistent shattered-glass scar. Purely visual: never intercepts pointer
 * events, so scrolling and clicking work normally underneath.
 */
export function CrackOverlay({ hits, expiresAt, hideBadge }: CrackOverlayProps) {
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    const t = window.setInterval(() => setNow(Date.now()), 60000);
    return () => window.clearInterval(t);
  }, []);

  const webs = useMemo(
    () =>
      hits.map((hit, i) => ({
        hit,
        web: buildCrackWeb(hit.seed + i, hit.impact_x, hit.impact_y, 1 + i * 0.12),
      })),
    [hits],
  );

  if (hits.length === 0) return null;

  return (
    <div className="pointer-events-none fixed inset-0 z-[60]" aria-hidden="true">
      <svg
        className="absolute inset-0 h-full w-full"
        viewBox="0 0 100 100"
        preserveAspectRatio="none"
      >
        <defs>
          <filter id="snipe-glass-glow" x="-30%" y="-30%" width="160%" height="160%">
            <feGaussianBlur stdDeviation="0.35" result="b" />
            <feMerge>
              <feMergeNode in="b" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
          <radialGradient id="snipe-hole">
            <stop offset="0%" stopColor="hsl(var(--foreground))" stopOpacity="0.85" />
            <stop offset="55%" stopColor="hsl(var(--foreground))" stopOpacity="0.25" />
            <stop offset="100%" stopColor="hsl(var(--foreground))" stopOpacity="0" />
          </radialGradient>
        </defs>

        {webs.map(({ hit, web }) => (
          <g key={hit.id} filter="url(#snipe-glass-glow)">
            {/* refraction ghost */}
            {web.spokes.map((d, i) => (
              <path
                key={`r-${i}`}
                d={d}
                fill="none"
                stroke="hsl(var(--primary))"
                strokeOpacity="0.35"
                strokeWidth="0.42"
                transform="translate(0.25,0.2)"
                vectorEffect="non-scaling-stroke"
              />
            ))}
            {web.spokes.map((d, i) => (
              <path
                key={`s-${i}`}
                d={d}
                fill="none"
                stroke="hsl(var(--foreground))"
                strokeOpacity="0.7"
                strokeWidth="0.3"
                vectorEffect="non-scaling-stroke"
              />
            ))}
            {web.webs.map((d, i) => (
              <path
                key={`w-${i}`}
                d={d}
                fill="none"
                stroke="hsl(var(--foreground))"
                strokeOpacity="0.4"
                strokeWidth="0.2"
                vectorEffect="non-scaling-stroke"
              />
            ))}
            {web.shards.map((d, i) => (
              <path
                key={`sh-${i}`}
                d={d}
                fill="none"
                stroke="hsl(var(--primary))"
                strokeOpacity="0.5"
                strokeWidth="0.18"
                vectorEffect="non-scaling-stroke"
              />
            ))}
            <circle
              cx={hit.impact_x}
              cy={hit.impact_y}
              r="2.2"
              fill="url(#snipe-hole)"
            />
            <circle
              cx={hit.impact_x}
              cy={hit.impact_y}
              r="0.9"
              fill="hsl(var(--background))"
              fillOpacity="0.9"
              stroke="hsl(var(--primary))"
              strokeOpacity="0.6"
              strokeWidth="0.2"
              vectorEffect="non-scaling-stroke"
            />
          </g>
        ))}
      </svg>

      {!hideBadge && (
        <div className="absolute bottom-4 right-4 flex items-center gap-2 rounded-full border border-primary/40 bg-background/80 px-3 py-1.5 backdrop-blur">
          <Crosshair className="h-4 w-4 text-primary" />
          <span className="text-xs font-semibold text-foreground">
            Sniped ×{hits.length}
          </span>
          {expiresAt && (
            <span className="text-xs text-muted-foreground">
              {formatRemaining(expiresAt - now)}
            </span>
          )}
        </div>
      )}
    </div>
  );
}
