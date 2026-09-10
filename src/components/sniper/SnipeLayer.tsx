import { useSnipeStatus } from "@/hooks/useSnipeStatus";
import { CrackOverlay } from "./CrackOverlay";
import { SniperStrike } from "./SniperStrike";

interface SnipeLayerProps {
  /** The user whose view carries the sniper scar. */
  targetUserId?: string | null;
}

/**
 * Drop-in layer for a profile or live stream view: plays the strike when a
 * $1000 Sniper gift lands and keeps the shattered glass afterwards.
 */
export function SnipeLayer({ targetUserId }: SnipeLayerProps) {
  const { hits, expiresAt, incoming, clearIncoming } = useSnipeStatus(targetUserId);

  if (!targetUserId) return null;

  return (
    <>
      <CrackOverlay hits={hits} expiresAt={expiresAt} hideBadge={!!incoming} />
      {incoming && <SniperStrike hit={incoming} onComplete={clearIncoming} />}
    </>
  );
}
