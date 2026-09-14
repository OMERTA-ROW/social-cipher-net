import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Wallet, Coins } from "lucide-react";
import { toast } from "sonner";
import { GiftGallery } from "@/components/GiftGallery";
import { signInPath } from "@/lib/authRedirect";

// Conversion rate: $1 = 1000 tokens, $1000 = 1,000,000 tokens
const USD_TO_TOKENS = 1000;

function AnimatedTokenCount({ tokens, duration = 2000 }: { tokens: number; duration?: number }) {
  const [displayTokens, setDisplayTokens] = useState(0);
  const startTimeRef = useRef<number | null>(null);
  const animationRef = useRef<number>();

  useEffect(() => {
    startTimeRef.current = null;
    setDisplayTokens(0);

    const animate = (currentTime: number) => {
      if (!startTimeRef.current) startTimeRef.current = currentTime;
      const elapsed = currentTime - startTimeRef.current;
      const progress = Math.min(elapsed / duration, 1);
      
      // Ease out cubic
      const easeOut = 1 - Math.pow(1 - progress, 3);
      setDisplayTokens(Math.floor(tokens * easeOut));

      if (progress < 1) {
        animationRef.current = requestAnimationFrame(animate);
      }
    };

    animationRef.current = requestAnimationFrame(animate);

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [tokens, duration]);

  return (
    <span className="font-mono">
      {displayTokens.toLocaleString()}
    </span>
  );
}

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
    { price: 0.01, tokens: 10, bonus: 0 },
    { price: 0.10, tokens: 100, bonus: 10 },
    { price: 1, tokens: 1000, bonus: 100 },
    { price: 10, tokens: 10000, bonus: 2000 },
    { price: 100, tokens: 100000, bonus: 25000 },
    { price: 1000, tokens: 1000000, bonus: 500000 },
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
      navigate(signInPath());
      return;
    }

    // Wallet balances are credited server-side only, after a verified payment.
    const totalTokens = pkg.tokens + pkg.bonus;
    toast.info(
      `Checkout for ${totalTokens.toLocaleString()} tokens is not available yet. Tokens are only added after a confirmed payment.`
    );
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
          <Card className="bg-gradient-to-r from-primary/10 to-secondary/10 backdrop-blur-sm border-primary/30">
            <CardContent className="p-4 flex items-center gap-3">
              <Coins className="w-6 h-6 text-primary animate-pulse" />
              <div className="flex flex-col">
                <span className="text-xs text-muted-foreground">Token Balance</span>
                <span className="font-bold text-lg text-primary flex items-center gap-2">
                  <span className="text-2xl">∞</span>
                  <span>Unlimited</span>
                </span>
              </div>
            </CardContent>
          </Card>
        </div>

        <Card className="bg-gradient-to-br from-primary/10 via-card/50 to-secondary/10 backdrop-blur-sm border-primary/20">
          <CardHeader>
            <CardTitle className="text-3xl flex items-center gap-2">
              <Coins className="w-8 h-8 text-primary animate-pulse" />
              Purchase Cyber Tokens
            </CardTitle>
            <CardDescription>
              Buy tokens to send animated gifts. 1,000 tokens = $1 | 1,000,000 tokens = $1,000
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {tokenPackages.map((pkg, idx) => (
                <Card
                  key={pkg.price}
                  className="bg-background/50 border-primary/20 hover:border-primary/40 transition-all hover:scale-105 animate-fade-in"
                  style={{ animationDelay: `${idx * 100}ms` }}
                >
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-xl">
                        <AnimatedTokenCount tokens={pkg.tokens} />
                      </CardTitle>
                      <Coins className="w-6 h-6 text-primary" />
                    </div>
                    {pkg.bonus > 0 && (
                      <CardDescription className="text-green-500 font-semibold animate-pulse">
                        +<AnimatedTokenCount tokens={pkg.bonus} duration={1500} /> Bonus!
                      </CardDescription>
                    )}
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="text-center space-y-2">
                      <p className="text-4xl font-bold text-primary animate-scale-in">
                        ${pkg.price.toFixed(pkg.price < 1 ? 2 : 0)}
                      </p>
                      <p className="text-sm text-muted-foreground font-mono">
                        Total: <AnimatedTokenCount tokens={pkg.tokens + pkg.bonus} duration={2500} /> tokens
                      </p>
                    </div>
                    <Button
                      className="w-full hover-scale"
                      onClick={() => handlePurchaseTokens(pkg)}
                    >
                      Purchase Package
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
              Preview available animated gifts. Prices from 10 tokens ($0.01) to 1M tokens ($1,000)
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
              {gifts.sort((a, b) => b.price - a.price).map((gift, idx) => {
                const tokenPrice = gift.price * USD_TO_TOKENS;
                return (
                  <Card
                    key={gift.id}
                    className="bg-background/50 border-primary/20 hover:scale-105 transition-all animate-fade-in"
                    style={{ animationDelay: `${idx * 50}ms` }}
                  >
                    <CardContent className="p-4 text-center space-y-2">
                      <div className="text-4xl animate-bounce">{gift.icon_url}</div>
                      <p className="font-semibold text-sm">{gift.name}</p>
                      <div className="space-y-1">
                        <p className="text-primary font-bold font-mono text-xs">
                          <AnimatedTokenCount tokens={tokenPrice} duration={1500} />
                        </p>
                        <p className="text-xs text-muted-foreground">${gift.price}</p>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
