/**
 * Non-custodial Solana wallet connection (Phantom, Solflare) using each
 * wallet's own injected provider — the official, documented browser API.
 *
 * We only ever read the public address the user chooses to share. No private
 * key, no seed phrase, and no transaction is ever created here.
 */

import { useEffect, useState } from "react";
import { Wallet, Unlink, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { logTradingAction } from "./TradeConfirmDialog";

type SolProvider = {
  isPhantom?: boolean;
  connect: (opts?: { onlyIfTrusted?: boolean }) => Promise<{ publicKey: { toString(): string } }>;
  disconnect: () => Promise<void>;
  publicKey?: { toString(): string } | null;
};

const getProvider = (which: "phantom" | "solflare"): SolProvider | null => {
  const w = window as unknown as {
    phantom?: { solana?: SolProvider };
    solflare?: SolProvider & { isSolflare?: boolean };
    solana?: SolProvider;
  };
  if (which === "phantom") return w.phantom?.solana ?? (w.solana?.isPhantom ? w.solana : null);
  return w.solflare ?? null;
};

const SolanaWalletConnect = () => {
  const [address, setAddress] = useState<string | null>(null);
  const [wallet, setWallet] = useState<"phantom" | "solflare" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const p = getProvider("phantom");
    if (p?.publicKey) {
      setAddress(p.publicKey.toString());
      setWallet("phantom");
    }
  }, []);

  const connect = async (which: "phantom" | "solflare") => {
    setError(null);
    const provider = getProvider(which);
    if (!provider) {
      setError(
        `${which === "phantom" ? "Phantom" : "Solflare"} is not installed in this browser. Install the extension, then try again.`,
      );
      return;
    }
    setBusy(true);
    try {
      const res = await provider.connect();
      const pk = res?.publicKey?.toString() ?? provider.publicKey?.toString() ?? null;
      setAddress(pk);
      setWallet(which);
      await logTradingAction("wallet_connected", { chain: "solana", wallet: which, address: pk });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Wallet connection was rejected.");
    } finally {
      setBusy(false);
    }
  };

  const disconnect = async () => {
    if (wallet) {
      try {
        await getProvider(wallet)?.disconnect();
      } catch {
        /* provider already closed */
      }
      await logTradingAction("wallet_disconnected", { chain: "solana", wallet });
    }
    setAddress(null);
    setWallet(null);
  };

  return (
    <div className="space-y-3">
      {address ? (
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="outline" className="text-[10px] uppercase">
            {wallet}
          </Badge>
          <code className="text-xs break-all">{address}</code>
          <Button size="sm" variant="ghost" onClick={disconnect}>
            <Unlink className="mr-1 h-3 w-3" /> Disconnect
          </Button>
        </div>
      ) : (
        <div className="flex flex-wrap gap-2">
          <Button size="sm" variant="outline" disabled={busy} onClick={() => connect("phantom")}>
            <Wallet className="mr-1 h-3 w-3" /> Phantom
          </Button>
          <Button size="sm" variant="outline" disabled={busy} onClick={() => connect("solflare")}>
            <Wallet className="mr-1 h-3 w-3" /> Solflare
          </Button>
        </div>
      )}
      {error && (
        <p className="flex items-start gap-1 text-xs text-destructive">
          <AlertTriangle className="mt-0.5 h-3 w-3 shrink-0" /> {error}
        </p>
      )}
      <p className="text-[10px] text-muted-foreground">
        Read-only address sharing. We never see or store keys or seed phrases.
      </p>
    </div>
  );
};

export default SolanaWalletConnect;
