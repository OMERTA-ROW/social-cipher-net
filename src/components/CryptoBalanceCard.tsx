import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Coins, TrendingUp } from "lucide-react";
import { toast } from "sonner";
import { CryptoToUsdConverter } from "./CryptoToUsdConverter";

interface CryptoBalance {
  [currency: string]: {
    amount: number;
    usdValue: number;
  };
}

export const CryptoBalanceCard = () => {
  const [balances, setBalances] = useState<CryptoBalance>({});
  const [loading, setLoading] = useState(true);
  const [totalUsd, setTotalUsd] = useState(0);

  useEffect(() => {
    fetchCryptoBalances();
    const interval = setInterval(fetchCryptoBalances, 30000);
    return () => clearInterval(interval);
  }, []);

  const fetchCryptoBalances = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setLoading(false);
        return;
      }

      const { data: wallet, error } = await supabase
        .from("user_wallets")
        .select("crypto_balance")
        .eq("user_id", user.id)
        .maybeSingle();

      if (error) throw error;

      const cryptoData = wallet?.crypto_balance || {};
      
      // Convert crypto_balance format from simple strings to proper structure
      const formattedBalances: CryptoBalance = {};
      let total = 0;

      // Fetch current prices
      const { data: priceData } = await supabase.functions.invoke("get-crypto-prices");
      const prices = priceData?.prices || {};

      for (const [currency, balance] of Object.entries(cryptoData)) {
        const amount = parseFloat(balance as string || "0");
        const price = prices[currency] || 0;
        const usdValue = amount * price;
        
        formattedBalances[currency] = {
          amount,
          usdValue,
        };
        total += usdValue;
      }

      setBalances(formattedBalances);
      setTotalUsd(total);
    } catch (error) {
      console.error("Error fetching crypto balances:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Card className="bg-card/50 backdrop-blur-sm border-primary/20">
        <CardContent className="pt-6">
          <div className="animate-pulse space-y-4">
            <div className="h-4 bg-muted rounded w-3/4"></div>
            <div className="h-8 bg-muted rounded"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  const hasBalance = Object.keys(balances).length > 0;

  // Convert balances to simple format for converter
  const simpleCryptoBalances: { [key: string]: string } = {};
  Object.entries(balances).forEach(([currency, balance]) => {
    simpleCryptoBalances[currency] = balance.amount.toString();
  });

  return (
    <>
      <Card className="bg-gradient-to-br from-accent/10 via-card/50 to-primary/10 backdrop-blur-sm border-accent/20">
        <CardHeader>
          <CardTitle className="text-xl flex items-center gap-2">
            <Coins className="w-5 h-5 text-accent" />
            Crypto Holdings
          </CardTitle>
          <CardDescription>
            Your cryptocurrency balances
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="p-4 rounded-lg bg-accent/10 border border-accent/20">
            <p className="text-xs text-muted-foreground mb-1">Total Value (USD)</p>
            <p className="text-3xl font-bold text-accent">
              ${totalUsd.toFixed(2)}
            </p>
          </div>

          {hasBalance ? (
            <div className="space-y-2">
              <p className="text-sm font-medium text-muted-foreground">Assets</p>
              {Object.entries(balances).map(([currency, balance]) => (
                <div 
                  key={currency}
                  className="flex items-center justify-between p-3 rounded-lg bg-card/50 border border-border"
                >
                  <div>
                    <p className="text-sm font-medium">{currency.toUpperCase()}</p>
                    <p className="text-xs font-mono text-muted-foreground">
                      {balance.amount.toFixed(6)}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-medium">
                      ${balance.usdValue.toFixed(2)}
                    </p>
                    <p className="text-xs text-muted-foreground flex items-center gap-1">
                      <TrendingUp className="w-3 h-3" />
                      Live price
                    </p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-6 text-muted-foreground">
              <p className="text-sm">No crypto assets yet</p>
              <p className="text-xs mt-1">Receive crypto payments to see balances</p>
            </div>
          )}
        </CardContent>
      </Card>

      {hasBalance && (
        <CryptoToUsdConverter 
          cryptoBalances={simpleCryptoBalances} 
          onConversionComplete={fetchCryptoBalances}
        />
      )}
    </>
  );
};
