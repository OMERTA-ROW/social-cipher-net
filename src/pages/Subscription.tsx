import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import Navigation from "@/components/Navigation";
import CyberSpaceBackground from "@/components/CyberSpaceBackground";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Check, Loader2, Wallet, CreditCard } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";

const TIERS = {
  free: {
    name: "CyberFree",
    price: 0,
    priceId: null,
    productId: null,
    features: [
      "Basic post creation",
      "Access to free content",
      "Community features",
      "Standard support",
    ],
  },
  basis: {
    name: "CyberBasis",
    price: 50,
    priceId: "price_1SS5WmHTVeX8KHmEy9i3Aokb",
    productId: "prod_TOtJnFseC54ChY",
    features: [
      "Everything in CyberFree",
      "Create monetized posts",
      "Advanced analytics",
      "Priority support",
      "Custom profile themes",
    ],
  },
  pro: {
    name: "CyberPro",
    price: 100,
    priceId: "price_1SS5eQHTVeX8KHmExN8saFdg",
    productId: "prod_TOtRdMUKNeKkFc",
    features: [
      "Everything in CyberBasis",
      "Verified badge",
      "Premium content features",
      "Advanced monetization tools",
      "24/7 Priority support",
      "Early access to new features",
    ],
  },
};

const Subscription = () => {
  const [currentTier, setCurrentTier] = useState<string>("free");
  const [isLoading, setIsLoading] = useState(true);
  const [processingTier, setProcessingTier] = useState<string | null>(null);
  const [walletBalance, setWalletBalance] = useState<number>(0);
  const [selectedTier, setSelectedTier] = useState<"basis" | "pro" | null>(null);
  const [showPaymentDialog, setShowPaymentDialog] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    checkAuth();
    checkSubscription();
    fetchWallet();
  }, []);

  const checkAuth = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      navigate("/auth");
    }
  };

  const checkSubscription = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("check-subscription");
      
      if (error) throw error;

      if (data?.subscribed && data?.product_id) {
        // Map product ID to tier
        if (data.product_id === TIERS.basis.productId) {
          setCurrentTier("basis");
        } else if (data.product_id === TIERS.pro.productId) {
          setCurrentTier("pro");
        }
      }
    } catch (error: any) {
      console.error("Error checking subscription:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchWallet = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from("user_wallets")
        .select("balance")
        .eq("user_id", user.id)
        .maybeSingle();

      if (error) throw error;
      setWalletBalance(data?.balance ? Number(data.balance) : 0);
    } catch (error) {
      console.error("Error fetching wallet:", error);
    }
  };

  const handleSubscribeClick = (tier: "basis" | "pro") => {
    setSelectedTier(tier);
    setShowPaymentDialog(true);
  };

  const handlePayWithWallet = async () => {
    if (!selectedTier) return;
    
    const tierPrice = TIERS[selectedTier].price;
    if (walletBalance < tierPrice) {
      toast.error(`Insufficient balance. You need $${tierPrice} but have $${walletBalance.toFixed(2)}`);
      return;
    }

    setProcessingTier(selectedTier);
    setShowPaymentDialog(false);
    
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast.error("Please sign in");
        return;
      }

      const { data, error } = await supabase.functions.invoke("pay-subscription-from-wallet", {
        body: { tier: selectedTier },
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      if (error) throw error;

      toast.success(data.message || "Subscription activated!");
      checkSubscription();
      fetchWallet();
    } catch (error: any) {
      console.error("Wallet payment error:", error);
      toast.error(error.message || "Failed to process payment");
    } finally {
      setProcessingTier(null);
      setSelectedTier(null);
    }
  };

  const handleSubscribe = async (tier: "basis" | "pro") => {
    setProcessingTier(tier);
    setShowPaymentDialog(false);
    
    try {
      const { data, error } = await supabase.functions.invoke("create-tier-checkout", {
        body: { priceId: TIERS[tier].priceId },
      });

      if (error) throw error;

      if (data?.url) {
        window.open(data.url, "_blank");
        toast.success("Redirecting to checkout...");
      }
    } catch (error: any) {
      console.error("Subscription error:", error);
      toast.error(error.message || "Failed to start subscription");
    } finally {
      setProcessingTier(null);
      setSelectedTier(null);
    }
  };

  const handleManageSubscription = async () => {
    try {
      const { data, error } = await supabase.functions.invoke("customer-portal");

      if (error) throw error;

      if (data?.url) {
        window.open(data.url, "_blank");
      }
    } catch (error: any) {
      console.error("Portal error:", error);
      toast.error("Failed to open customer portal");
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <CyberSpaceBackground />
      <Navigation />
      
      <main className="container mx-auto px-4 pt-24 pb-8">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12">
            <h1 className="text-4xl md:text-5xl font-bold mb-4 bg-gradient-to-r from-primary via-accent to-primary bg-clip-text text-transparent">
              Choose Your Cyber Tier
            </h1>
            <p className="text-muted-foreground text-lg">
              Unlock powerful features with annual subscriptions
            </p>
          </div>

          {isLoading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : (
            <div className="grid md:grid-cols-3 gap-8">
              {Object.entries(TIERS).map(([key, tier]) => {
                const isCurrentTier = currentTier === key;
                const isPro = key === "pro";
                
                return (
                  <Card
                    key={key}
                    className={`relative ${
                      isPro
                        ? "border-primary/50 shadow-lg shadow-primary/20"
                        : "border-border"
                    } ${isCurrentTier ? "ring-2 ring-primary" : ""}`}
                  >
                    {isPro && (
                      <div className="absolute -top-4 left-1/2 -translate-x-1/2">
                        <Badge className="bg-primary text-primary-foreground">
                          Most Popular
                        </Badge>
                      </div>
                    )}
                    
                    <CardHeader className="text-center">
                      <CardTitle className="text-2xl mb-2">{tier.name}</CardTitle>
                      <div className="mb-4">
                        <span className="text-4xl font-bold text-primary">
                          ${tier.price}
                        </span>
                        {tier.price > 0 && (
                          <span className="text-muted-foreground">/year</span>
                        )}
                      </div>
                      {isCurrentTier && (
                        <Badge variant="outline" className="mx-auto">
                          Current Plan
                        </Badge>
                      )}
                    </CardHeader>

                    <CardContent className="space-y-6">
                      <ul className="space-y-3">
                        {tier.features.map((feature, index) => (
                          <li key={index} className="flex items-start gap-2">
                            <Check className="w-5 h-5 text-primary mt-0.5 flex-shrink-0" />
                            <span className="text-sm text-foreground/90">{feature}</span>
                          </li>
                        ))}
                      </ul>

                      {key === "free" ? (
                        isCurrentTier ? (
                          <Button disabled className="w-full">
                            Current Plan
                          </Button>
                        ) : null
                      ) : (
                        <Button
                          onClick={() =>
                            isCurrentTier
                              ? handleManageSubscription()
                              : handleSubscribeClick(key as "basis" | "pro")
                          }
                          disabled={processingTier === key}
                          className="w-full"
                          variant={isPro ? "default" : "outline"}
                        >
                          {processingTier === key ? (
                            <>
                              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                              Processing...
                            </>
                          ) : isCurrentTier ? (
                            "Manage Subscription"
                          ) : (
                            `Upgrade to ${tier.name}`
                          )}
                        </Button>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}

          <div className="mt-12 text-center">
            <p className="text-sm text-muted-foreground">
              All subscriptions are billed annually. Cancel anytime.
            </p>
            <p className="text-sm text-muted-foreground mt-2">
              Wallet Balance: <span className="text-primary font-semibold">${walletBalance.toFixed(2)}</span>
            </p>
          </div>
        </div>
      </main>

      <Dialog open={showPaymentDialog} onOpenChange={setShowPaymentDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Choose Payment Method</DialogTitle>
            <DialogDescription>
              Select how you'd like to pay for your {selectedTier && TIERS[selectedTier].name} subscription ($
              {selectedTier && TIERS[selectedTier].price}/year)
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <Card 
              className={`cursor-pointer transition-all hover:border-primary ${
                walletBalance >= (selectedTier ? TIERS[selectedTier].price : 0) 
                  ? 'border-primary/50' 
                  : 'opacity-50'
              }`}
              onClick={() => walletBalance >= (selectedTier ? TIERS[selectedTier].price : 0) && handlePayWithWallet()}
            >
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Wallet className="w-5 h-5" />
                  Pay with Wallet Balance
                </CardTitle>
                <CardDescription>
                  Available: ${walletBalance.toFixed(2)}
                  {walletBalance < (selectedTier ? TIERS[selectedTier].price : 0) && (
                    <span className="text-destructive block mt-1">
                      Insufficient balance (need ${selectedTier && (TIERS[selectedTier].price - walletBalance).toFixed(2)} more)
                    </span>
                  )}
                </CardDescription>
              </CardHeader>
            </Card>

            <Card 
              className="cursor-pointer transition-all hover:border-primary"
              onClick={() => selectedTier && handleSubscribe(selectedTier)}
            >
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <CreditCard className="w-5 h-5" />
                  Pay with Credit Card
                </CardTitle>
                <CardDescription>
                  Secure payment via Stripe
                </CardDescription>
              </CardHeader>
            </Card>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowPaymentDialog(false)}>
              Cancel
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Subscription;