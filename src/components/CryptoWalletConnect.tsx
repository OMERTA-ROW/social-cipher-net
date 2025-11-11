import { useEffect } from "react";
import { useAccount, useDisconnect } from "wagmi";
import { useWeb3Modal } from "@web3modal/wagmi/react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Wallet, Link as LinkIcon, Unlink } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { SUPPORTED_CHAINS } from "@/lib/web3Config";

export const CryptoWalletConnect = () => {
  const { open } = useWeb3Modal();
  const { address, isConnected, chain } = useAccount();
  const { disconnect } = useDisconnect();

  useEffect(() => {
    if (isConnected && address && chain) {
      saveWalletAddress(address, chain.id);
    }
  }, [isConnected, address, chain]);

  const saveWalletAddress = async (walletAddress: string, chainId: number) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const chainName = SUPPORTED_CHAINS.find(c => c.id === chainId)?.name.toLowerCase() || 'ethereum';

      const { error } = await supabase
        .from("crypto_wallets")
        .upsert({
          user_id: user.id,
          wallet_address: walletAddress,
          chain: chainName,
          is_primary: true,
        }, {
          onConflict: 'user_id,wallet_address,chain'
        });

      if (error) throw error;
      toast.success("Crypto wallet connected!");
    } catch (error: any) {
      console.error("Error saving wallet:", error);
      toast.error("Failed to save wallet address");
    }
  };

  const handleDisconnect = () => {
    disconnect();
    toast.success("Crypto wallet disconnected");
  };

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
            onClick={() => open()}
          >
            <LinkIcon className="w-4 h-4 mr-2" />
            Connect Crypto Wallet
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
