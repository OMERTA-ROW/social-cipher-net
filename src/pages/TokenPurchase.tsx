import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Wallet, Coins } from "lucide-react";
import { toast } from "sonner";
import { GiftGallery } from "@/components/GiftGallery";

interface Gift {
  id: string;
  name: string;
  description: string;
  price: number;
  icon_url: string;
  animation_type: string;
}

export default function TokenPurchase() {
  const navigate = useNavigate();
  const [balance, setBalance] = useState<number>(0);
  const [gifts, setGifts] = useState<Gift[]>([]);
  const [showGiftGallery, setShowGiftGallery] = useState(false);
  const [loading, setLoading] = useState(true);

  const tokenPackages = [
    { tokens: 100, price: 0.99, bonus: 0 },
    { tokens: 500, price: 4.99, bonus: 50 },
    { tokens: 1000, price: 9.99, bonus: 150 },
    { tokens: 5000, price: 49.99, bonus: 1000 },
    { tokens: 10000, price: 99.99, bonus: 2500 },
    { tokens: 100000, price: 999.99, bonus: 50000 },
  ];

  useEffect(() => {
    fetchWalletAndGifts();
  }, []);

  const fetchWalletAndGifts = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setLoading(false);
        return;
      }

      const [walletResponse, giftsResponse] = await Promise.all([
        supabase.from("user_wallets").select("balance").eq("user_id", user.id).maybeSingle(),
        supabase.from("gifts").select("*").order("price", { ascending: true })
      ]);

      if (walletResponse.error) throw walletResponse.error;
      if (giftsResponse.error) throw giftsResponse.error;

      setBalance(walletResponse.data?.balance ? Number(walletResponse.data.balance) : 0);
      setGifts(giftsResponse.data || []);
    } catch (error) {
      console.error("Error fetching data:", error);
      toast.error("Failed to load data");
    } finally {
      setLoading(false);
    }
  };

  const handlePurchaseTokens = async (pkg: typeof tokenPackages[0]) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      toast.error("Please sign in to purchase tokens");
      navigate("/auth");
      return;
    }

    // In a real app, this would integrate with a payment processor
    toast.info("Payment integration coming soon! Tokens added for demo.");
    
    const totalTokens = (pkg.tokens + pkg.bonus) / 100; // Convert to dollars
    const { error } = await supabase.from("user_wallets").upsert({
      user_id: user.id,
      balance: balance + totalTokens,
    });

    if (error) {
      toast.error("Failed to add tokens");
      return;
    }

    await supabase.from("wallet_transactions").insert({
      user_id: user.id,
      amount: totalTokens,
      transaction_type: "token_purchase",
      description: `Purchased ${pkg.tokens} tokens (+${pkg.bonus} bonus)`,
      metadata: { package: pkg },
    });

    toast.success(`Added ${pkg.tokens + pkg.bonus} tokens to your wallet!`);
    fetchWalletAndGifts();
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-background via-background/95 to-primary/5 p-6">
        <div className="max-w-7xl mx-auto">
          <div className="animate-pulse space-y-4">
            <div className="h-8 bg-muted rounded w-1/4"></div>
            <div className="h-64 bg-muted rounded"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-background via-background/95 to-primary/5 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <Button variant="ghost" onClick={() => navigate(-1)} className="gap-2">
            <ArrowLeft className="w-4 h-4" />
            Back
          </Button>
          <Card className="bg-card/50 backdrop-blur-sm border-primary/20">
            <CardContent className="p-4 flex items-center gap-2">
              <Wallet className="w-5 h-5 text-primary" />
              <span className="font-semibold">${balance.toFixed(2)}</span>
            </CardContent>
          </Card>
        </div>

        <Card className="bg-gradient-to-br from-primary/10 via-card/50 to-secondary/10 backdrop-blur-sm border-primary/20">
          <CardHeader>
            <CardTitle className="text-3xl flex items-center gap-2">
              <Coins className="w-8 h-8 text-primary" />
              Purchase Cyber Tokens
            </CardTitle>
            <CardDescription>
              Buy tokens to send animated gifts to live streamers. Tokens are tracked in your wallet.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {tokenPackages.map((pkg) => (
                <Card
                  key={pkg.tokens}
                  className="bg-background/50 border-primary/20 hover:border-primary/40 transition-all hover:scale-105"
                >
                  <CardHeader>
                    <CardTitle className="text-2xl">
                      {pkg.tokens.toLocaleString()} Tokens
                    </CardTitle>
                    {pkg.bonus > 0 && (
                      <CardDescription className="text-green-500 font-semibold">
                        +{pkg.bonus.toLocaleString()} Bonus Tokens!
                      </CardDescription>
                    )}
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="text-center">
                      <p className="text-3xl font-bold text-primary">${pkg.price}</p>
                      <p className="text-sm text-muted-foreground">
                        Total: {(pkg.tokens + pkg.bonus).toLocaleString()} tokens
                      </p>
                    </div>
                    <Button
                      className="w-full"
                      onClick={() => handlePurchaseTokens(pkg)}
                    >
                      Purchase
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-secondary/10 via-card/50 to-primary/10 backdrop-blur-sm border-primary/20">
          <CardHeader>
            <CardTitle className="text-2xl">Animated Gifts Gallery</CardTitle>
            <CardDescription>
              Preview available animated gifts for live streams. Prices range from $0.01 to $1,000.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
              {gifts.map((gift) => (
                <Card
                  key={gift.id}
                  className="bg-background/50 border-primary/20 hover:scale-105 transition-all"
                >
                  <CardContent className="p-4 text-center space-y-2">
                    <div className="text-4xl">{gift.icon_url}</div>
                    <p className="font-semibold text-sm">{gift.name}</p>
                    <p className="text-primary font-bold">${gift.price}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
