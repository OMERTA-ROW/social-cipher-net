import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Wallet, ArrowDownToLine, CreditCard } from "lucide-react";
import { toast } from "sonner";

export const WalletCard = () => {
  const [balance, setBalance] = useState<number>(0);
  const [loading, setLoading] = useState(true);
  const [withdrawAmount, setWithdrawAmount] = useState("");
  const [isWithdrawing, setIsWithdrawing] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  useEffect(() => {
    fetchWallet();
    const interval = setInterval(fetchWallet, 30000);
    return () => clearInterval(interval);
  }, []);

  const fetchWallet = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from("user_wallets")
        .select("balance")
        .eq("user_id", user.id)
        .maybeSingle();

      if (error) throw error;
      setBalance(data?.balance ? Number(data.balance) : 0);
    } catch (error) {
      console.error("Error fetching wallet:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleWithdraw = async () => {
    const amount = parseFloat(withdrawAmount);
    if (!amount || amount <= 0) {
      toast.error("Please enter a valid amount");
      return;
    }

    if (amount > balance) {
      toast.error("Insufficient balance");
      return;
    }

    if (amount < 10) {
      toast.error("Minimum withdrawal amount is $10");
      return;
    }

    setIsWithdrawing(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast.error("Please sign in to withdraw");
        return;
      }

      const { data, error } = await supabase.functions.invoke("request-withdrawal", {
        body: { amount },
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      if (error) throw error;

      toast.success(data.message || "Withdrawal request submitted!");
      setWithdrawAmount("");
      setIsDialogOpen(false);
      fetchWallet();
    } catch (error: any) {
      console.error("Withdrawal error:", error);
      toast.error(error.message || "Failed to process withdrawal");
    } finally {
      setIsWithdrawing(false);
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

  return (
    <Card className="bg-gradient-to-br from-primary/10 via-card/50 to-secondary/10 backdrop-blur-sm border-primary/20 shadow-lg">
      <CardHeader>
        <CardTitle className="text-2xl flex items-center gap-2">
          <Wallet className="w-6 h-6 text-primary" />
          Digital Wallet
        </CardTitle>
        <CardDescription>
          Your earnings and balance for subscriptions & withdrawals
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="p-6 rounded-lg bg-primary/10 border border-primary/20">
          <p className="text-sm text-muted-foreground mb-1">Available Balance</p>
          <p className="text-4xl font-bold text-primary">
            ${balance.toFixed(2)}
          </p>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" className="w-full" disabled={balance < 10}>
                <ArrowDownToLine className="w-4 h-4 mr-2" />
                Withdraw
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Withdraw Funds</DialogTitle>
                <DialogDescription>
                  Request a withdrawal to your bank account. Minimum amount: $10
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Amount</label>
                  <Input
                    type="number"
                    placeholder="Enter amount"
                    value={withdrawAmount}
                    onChange={(e) => setWithdrawAmount(e.target.value)}
                    min="10"
                    max={balance}
                    step="0.01"
                  />
                  <p className="text-xs text-muted-foreground">
                    Available: ${balance.toFixed(2)}
                  </p>
                </div>
                <Button
                  onClick={handleWithdraw}
                  disabled={isWithdrawing}
                  className="w-full"
                >
                  {isWithdrawing ? "Processing..." : "Submit Withdrawal Request"}
                </Button>
              </div>
            </DialogContent>
          </Dialog>

          <Button variant="default" className="w-full" asChild>
            <a href="/subscription">
              <CreditCard className="w-4 h-4 mr-2" />
              Use for Subscription
            </a>
          </Button>
        </div>

        <p className="text-xs text-muted-foreground text-center">
          Earnings are automatically added to your wallet. Use balance to pay subscriptions or withdraw to bank account.
        </p>
      </CardContent>
    </Card>
  );
};
