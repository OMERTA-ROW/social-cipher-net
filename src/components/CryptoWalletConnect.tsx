import { useCallback, useEffect, useState } from "react";
import { useAccount, useBalance, useDisconnect } from "wagmi";
import { useWeb3Modal, useWeb3ModalEvents } from "@web3modal/wagmi/react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Wallet, Link as LinkIcon, Unlink, AlertTriangle, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { SUPPORTED_CHAINS, isWalletConnectConfigured } from "@/lib/web3Config";

const messageOfError = (error: unknown) => {
  if (error instanceof Error) return error.message;
  if (typeof error === "string") return error;
  return "Unknown wallet error";
};

export const CryptoWalletConnect = () => {
  const { open } = useWeb3Modal();
  const { address, isConnected, isConnecting, isReconnecting, chain } = useAccount();
  const { disconnect } = useDisconnect();
  const events = useWeb3ModalEvents();
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const { data: nativeBalance, isError: balanceError } = useBalance({
    address,
    query: { enabled: !!address, refetchInterval: 30000 },
  });

  // Surface modal-level failures instead of failing silently.
  useEffect(() => {
    const name = events?.data?.event;
    if (name === "CONNECT_ERROR") {
      setError("The wallet rejected or could not complete the connection. Please try again.");
    }
    if (name === "CONNECT_SUCCESS") {
      setError(null);
    }
  }, [events]);

  const saveWalletAddress = useCallback(async (walletAddress: string, chainId: number) => {
    setSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setError("Sign in to Cyber Link Social before linking a wallet.");
        return;
      }

      const chainName = SUPPORTED_CHAINS.find(c => c.id === chainId)?.name.toLowerCase() || 'ethereum';

      const { error: dbError } = await supabase
        .from("crypto_wallets")
        .upsert({
          user_id: user.id,
          wallet_address: walletAddress,
          chain: chainName,
          is_primary: true,
        }, {
          onConflict: 'user_id,wallet_address,chain'
        });

      if (dbError) throw dbError;
      setError(null);
      toast.success("Crypto wallet connected!");
    } catch (e) {
      console.error("Error saving wallet:", e);
      setError(`Wallet connected, but we could not save it: ${messageOfError(e)}`);
      toast.error("Failed to save wallet address");
    } finally {
      setSaving(false);
    }
  }, []);

  useEffect(() => {
    if (isConnected && address && chain) {
      saveWalletAddress(address, chain.id);
    }
  }, [isConnected, address, chain, saveWalletAddress]);

  useEffect(() => {
    if (isConnected && chain === undefined) {
      setError("Connected to an unsupported network. Switch to Ethereum, Polygon, Arbitrum, Optimism, Base or BSC.");
    }
  }, [isConnected, chain]);

  const handleConnect = async () => {
    if (!isWalletConnectConfigured) {
      setError("Wallet connections are not configured yet. Please contact support.");
      return;
    }
    setError(null);
    try {
      await open();
    } catch (e) {
      console.error("Wallet connect error:", e);
      setError(`Could not open the wallet picker: ${messageOfError(e)}`);
    }
  };

  const handleDisconnect = () => {
    try {
      disconnect();
      setError(null);
      toast.success("Crypto wallet disconnected");
    } catch (e) {
      setError(`Could not disconnect: ${messageOfError(e)}`);
    }
  };

  const busy = isConnecting || isReconnecting || saving;

  return (
    <Card className="bg-gradient-to-br from-primary/10 via-card/50 to-secondary/10 backdrop-blur-sm border-primary/20">
      <CardHeader>
        <CardTitle className="text-xl flex items-center gap-2">
          <Wallet className="w-5 h-5 text-primary" />
          Crypto Wallet
        </CardTitle>
        <CardDescription>
          Connect your wallet to accept crypto payments
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {error && (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>Wallet connection problem</AlertTitle>
            <AlertDescription className="break-words">
              {error}
              <Button
                size="sm"
                variant="outline"
                className="mt-2 w-full"
                onClick={handleConnect}
              >
                Try again
              </Button>
            </AlertDescription>
          </Alert>
        )}

        {isConnected && address ? (
          <>
            <div className="p-4 rounded-lg bg-primary/10 border border-primary/20">
              <p className="text-xs text-muted-foreground mb-1">Connected Wallet</p>
              <p className="text-sm font-mono break-all">{address}</p>
              {chain && (
                <Badge className="mt-2" variant="secondary">
                  {chain.name}
                </Badge>
              )}
              <p className="text-xs text-muted-foreground mt-2">
                {nativeBalance
                  ? `Balance: ${Number(nativeBalance.formatted).toFixed(5)} ${nativeBalance.symbol}`
                  : balanceError
                    ? "On-chain balance unavailable right now"
                    : "Loading on-chain balance…"}
              </p>
            </div>
            <Button 
              variant="outline" 
              className="w-full"
              onClick={handleDisconnect}
            >
              <Unlink className="w-4 h-4 mr-2" />
              Disconnect Wallet
            </Button>
          </>
        ) : (
          <Button 
            className="w-full"
            onClick={handleConnect}
            disabled={busy}
          >
            {busy ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <LinkIcon className="w-4 h-4 mr-2" />
            )}
            {busy ? "Connecting…" : "Connect Crypto Wallet"}
          </Button>
        )}
        
        <div className="text-xs text-muted-foreground space-y-1">
          <p>✓ Accept BTC, ETH, USDC, USDT, and more</p>
          <p>✓ Multi-chain support (Ethereum, Polygon, BSC, etc.)</p>
          <p>✓ Secure non-custodial wallet connection</p>
        </div>
      </CardContent>
    </Card>
  );
};
