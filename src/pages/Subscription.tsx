import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import Navigation from "@/components/Navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Check, Loader2, Wallet, CreditCard, TerminalSquare as TerminalIcon } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";
import {
  TIERS,
  TIER_ORDER,
  TERMINAL_ADDON,
  priceIdFor,
  yearlyDiscountPercent,
  useTier,
  type BillingInterval,
  type TierKey,
} from "@/lib/tiers";

const Subscription = () => {
  const { tier: currentTier, hasTerminal, loading: tierLoading, refresh } = useTier();
  const [interval, setInterval] = useState<BillingInterval>("year");
  const [processingTier, setProcessingTier] = useState<string | null>(null);
  const [walletBalance, setWalletBalance] = useState<number>(0);
  const [selectedTier, setSelectedTier] = useState<Exclude<TierKey, "free"> | null>(null);
  const [showPaymentDialog, setShowPaymentDialog] = useState(false);
  const [terminalBusy, setTerminalBusy] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    checkAuth();
    fetchWallet();
    syncEntitlements();
  }, []);

  const checkAuth = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) navigate("/auth");
  };

  // Mirrors live Stripe subscriptions into entitlements, then reflects them here.
  const syncEntitlements = async () => {
    try {
      await supabase.functions.invoke("sync-entitlements");
      refresh();
    } catch (error) {
      console.error("Entitlement sync failed:", error);
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

  const priceFor = (key: Exclude<TierKey, "free">) =>
    interval === "year" ? TIERS[key].yearly : TIERS[key].monthly;

  const handleBuyTerminal = async () => {
    setTerminalBusy(true);
    try {
      const { data, error } = await supabase.functions.invoke("create-tier-checkout", {
        body: { priceId: TERMINAL_ADDON.yearlyPriceId },
      });
      if (error) throw error;
      if (data?.url) {
        window.open(data.url, "_blank");
        toast.success("Opening checkout for the Terminal add-on");
      }
    } catch (error: any) {
      toast.error(error.message || "Could not start checkout");
    } finally {
      setTerminalBusy(false);
    }
  };

  const handleSubscribeClick = (key: Exclude<TierKey, "free">) => {
    setSelectedTier(key);
    setShowPaymentDialog(true);
  };

  const handlePayWithWallet = async () => {
    if (!selectedTier) return;
    const price = priceFor(selectedTier);
    if (walletBalance < price) {
      toast.error(`Insufficient balance. You need $${price} but have $${walletBalance.toFixed(2)}`);
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
        body: { tier: selectedTier === "plus" ? "basic" : "premium" },
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      if (error) throw error;
      toast.success(data?.message || "Subscription activated!");
      await syncEntitlements();
      fetchWallet();
    } catch (error: any) {
      toast.error(error.message || "Failed to process payment");
    } finally {
      setProcessingTier(null);
      setSelectedTier(null);
    }
  };

  const handleSubscribe = async (key: Exclude<TierKey, "free">) => {
    setProcessingTier(key);
    setShowPaymentDialog(false);
    try {
      const { data, error } = await supabase.functions.invoke("create-tier-checkout", {
        body: { priceId: priceIdFor(TIERS[key], interval) },
      });
      if (error) throw error;
      if (data?.url) {
        window.open(data.url, "_blank");
        toast.success("Redirecting to checkout...");
      }
    } catch (error: any) {
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
      if (data?.url) window.open(data.url, "_blank");
    } catch (error: any) {
      toast.error("Failed to open customer portal");
    }
  };

  return (
    <div className="min-h-screen bg-transparent">
      <Navigation />

      <main className="container mx-auto px-4 pt-24 pb-8">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-8">
            <h1 className="text-4xl md:text-5xl font-bold mb-4 bg-gradient-to-r from-primary via-accent to-primary bg-clip-text text-transparent">
              Choose Your Cyber Tier
            </h1>
            <p className="text-muted-foreground text-lg">
              Monthly or yearly — yearly saves {yearlyDiscountPercent(TIERS.plus)}%
            </p>
          </div>

          <div className="flex justify-center gap-2 mb-10">
            <Button
              variant={interval === "month" ? "default" : "outline"}
              onClick={() => setInterval("month")}
            >
              Monthly
            </Button>
            <Button
              variant={interval === "year" ? "default" : "outline"}
              onClick={() => setInterval("year")}
            >
              Yearly
            </Button>
          </div>

          {tierLoading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : (
            <div className="grid md:grid-cols-3 gap-8">
              {TIER_ORDER.map((key) => {
                const tier = TIERS[key];
                const isCurrentTier = currentTier === key;
                const isPro = key === "pro";
                const price = key === "free" ? 0 : priceFor(key as Exclude<TierKey, "free">);

                return (
                  <Card
                    key={key}
                    className={`relative ${isPro ? "border-primary/50 shadow-lg shadow-primary/20" : "border-border"} ${
                      isCurrentTier ? "ring-2 ring-primary" : ""
                    }`}
                  >
                    {isPro && (
                      <div className="absolute -top-4 left-1/2 -translate-x-1/2">
                        <Badge className="bg-primary text-primary-foreground">Most Popular</Badge>
                      </div>
                    )}

                    <CardHeader className="text-center">
                      <CardTitle className="text-2xl mb-2">{tier.name}</CardTitle>
                      <CardDescription className="mb-2">{tier.blurb}</CardDescription>
                      <div className="mb-4">
                        <span className="text-4xl font-bold text-primary">${price}</span>
                        {price > 0 && (
                          <span className="text-muted-foreground">
                            /{interval === "year" ? "year" : "month"}
                          </span>
                        )}
                      </div>
                      {isCurrentTier && (
                        <Badge variant="outline" className="mx-auto">Current Plan</Badge>
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
                        isCurrentTier ? <Button disabled className="w-full">Current Plan</Button> : null
                      ) : (
                        <Button
                          onClick={() =>
                            isCurrentTier
                              ? handleManageSubscription()
                              : handleSubscribeClick(key as Exclude<TierKey, "free">)
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

          <Card className="mt-10 border-primary/30 bg-card/60">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-xl">
                <TerminalIcon className="h-5 w-5 text-primary" />
                {TERMINAL_ADDON.name}
              </CardTitle>
              <CardDescription>
                Sandboxed command line with the AI assistant. Read-only commands, money actions never run from it.
                Included with Pro.
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-wrap items-center justify-between gap-4">
              <div className="text-2xl font-bold">
                ${TERMINAL_ADDON.yearly}
                <span className="text-sm text-muted-foreground font-normal">/year</span>
              </div>
              {hasTerminal ? (
                <div className="flex items-center gap-2">
                  <Badge variant="secondary">Active</Badge>
                  <Button variant="outline" size="sm" onClick={() => navigate("/terminal")}>
                    Open Terminal
                  </Button>
                </div>
              ) : (
                <Button onClick={handleBuyTerminal} disabled={terminalBusy}>
                  {terminalBusy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Add the Terminal
                </Button>
              )}
            </CardContent>
          </Card>

          <div className="mt-12 text-center">
            <p className="text-sm text-muted-foreground">Cancel anytime.</p>
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
              Select how you'd like to pay for {selectedTier && TIERS[selectedTier].name} ($
              {selectedTier && priceFor(selectedTier)}/{interval === "year" ? "year" : "month"})
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <Card
              className={`cursor-pointer transition-all hover:border-primary ${
                selectedTier && walletBalance >= priceFor(selectedTier) ? "border-primary/50" : "opacity-50"
              }`}
              onClick={() => selectedTier && walletBalance >= priceFor(selectedTier) && handlePayWithWallet()}
            >
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Wallet className="w-5 h-5" />
                  Pay with Wallet Balance
                </CardTitle>
                <CardDescription>
                  Available: ${walletBalance.toFixed(2)}
                  {selectedTier && walletBalance < priceFor(selectedTier) && (
                    <span className="text-destructive block mt-1">
                      Insufficient balance (need ${(priceFor(selectedTier) - walletBalance).toFixed(2)} more)
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
                <CardDescription>Secure payment via Stripe</CardDescription>
              </CardHeader>
            </Card>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowPaymentDialog(false)}>Cancel</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Subscription;
