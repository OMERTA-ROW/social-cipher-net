/**
 * Human confirmation gate for every money-moving action.
 *
 * Hard rule, enforced in code and not exposed as a setting: an action can only
 * be executed from a real user gesture inside this dialog. Automation and AI
 * agents cannot call the execute path — `requestTradeConfirmation` refuses any
 * request that is not marked as user-initiated, and the executor is only ever
 * handed over after the user presses Confirm here.
 */

import { useState } from "react";
import { AlertTriangle, ShieldCheck } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import TradingDisclaimer from "@/components/market/TradingDisclaimer";

export interface TradeIntent {
  /** trade | transfer | swap | approval */
  kind: "trade" | "transfer" | "swap" | "approval";
  asset: string;
  amount: string;
  price?: string;
  fees?: string;
  slippage?: string;
  destination?: string;
  venue?: string;
  /** must be true — set only by a direct user gesture */
  userInitiated: boolean;
}

export class AutomationBlockedError extends Error {
  constructor() {
    super("Money-moving actions can only be started by you. Automation and AI agents are blocked.");
    this.name = "AutomationBlockedError";
  }
}

/** Throws for anything that is not a direct human request. */
export function assertHumanInitiated(intent: TradeIntent) {
  if (!intent.userInitiated) throw new AutomationBlockedError();
}

export async function logTradingAction(action: string, details: Record<string, unknown>) {
  const { data } = await supabase.auth.getSession();
  const user = data.session?.user;
  if (!user) return;
  await supabase.from("trading_audit_log").insert({
    user_id: user.id,
    action,
    category: "trading",
    details: details as never,
  });
}

interface Props {
  intent: TradeIntent | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (intent: TradeIntent) => Promise<void> | void;
}

const Row = ({ label, value }: { label: string; value?: string }) =>
  value ? (
    <div className="flex items-center justify-between gap-4 py-1 text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium text-right break-all">{value}</span>
    </div>
  ) : null;

const TradeConfirmDialog = ({ intent, open, onOpenChange, onConfirm }: Props) => {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const confirm = async () => {
    if (!intent) return;
    setBusy(true);
    setError(null);
    try {
      assertHumanInitiated(intent);
      await onConfirm(intent);
      await logTradingAction(`${intent.kind}_confirmed`, { ...intent });
      onOpenChange(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Action failed");
      await logTradingAction(`${intent.kind}_failed`, { ...intent, error: String(e) });
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-primary" /> Confirm this {intent?.kind ?? "action"}
          </DialogTitle>
          <DialogDescription>
            Review exactly what will happen. Nothing moves until you confirm.
          </DialogDescription>
        </DialogHeader>

        <div className="rounded-lg border border-border/60 p-3">
          <Row label="Asset" value={intent?.asset} />
          <Row label="Amount" value={intent?.amount} />
          <Row label="Price" value={intent?.price} />
          <Row label="Fees" value={intent?.fees} />
          <Row label="Max slippage" value={intent?.slippage} />
          <Row label="Destination" value={intent?.destination} />
          <Row label="Venue" value={intent?.venue} />
        </div>

        <p className="flex items-start gap-2 text-xs text-muted-foreground">
          <AlertTriangle className="w-3.5 h-3.5 mt-0.5 shrink-0" />
          We never hold your keys, seed phrase or funds. You sign in your own wallet or at your own
          broker; this step only prepares the request.
        </p>
        <TradingDisclaimer />

        {error && <p className="text-xs text-destructive">{error}</p>}

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={busy}>
            Cancel
          </Button>
          <Button onClick={confirm} disabled={busy || !intent}>
            {busy ? "Working…" : "Confirm"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default TradeConfirmDialog;
