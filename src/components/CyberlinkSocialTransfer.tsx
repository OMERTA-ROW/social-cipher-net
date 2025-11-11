import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { ArrowRightLeft, Shield } from "lucide-react";
import { toast } from "sonner";

interface CyberlinkSocialTransferProps {
  walletBalance: number;
  onTransferComplete: () => void;
}

export const CyberlinkSocialTransfer = ({ walletBalance, onTransferComplete }: CyberlinkSocialTransferProps) => {
  const [transferAmount, setTransferAmount] = useState("");
  const [isTransferring, setIsTransferring] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const handleTransfer = async () => {
    const amount = parseFloat(transferAmount);
    if (!amount || amount <= 0) {
      toast.error("Please enter a valid amount");
      return;
    }

    if (amount > walletBalance) {
      toast.error("Insufficient wallet balance");
      return;
    }

    setIsTransferring(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast.error("Please sign in to transfer funds");
        return;
      }

      const { data, error } = await supabase.functions.invoke("transfer-to-cyberlink-social", {
        body: { amount },
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      if (error) throw error;

      toast.success(`Transferred $${amount.toFixed(2)} to Cyberlink Social account`);
      setTransferAmount("");
      setIsDialogOpen(false);
      onTransferComplete();
    } catch (error: any) {
      console.error("Transfer error:", error);
      toast.error(error.message || "Failed to transfer funds");
    } finally {
      setIsTransferring(false);
    }
  };

  return (
    <Card className="bg-gradient-to-br from-accent/10 via-card/50 to-primary/10 backdrop-blur-sm border-accent/20">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Shield className="w-5 h-5 text-accent" />
          Cyberlink Social Master Account
        </CardTitle>
        <CardDescription>
          Transfer funds to your master Cyberlink Social account for centralized management
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button className="w-full" variant="default">
              <ArrowRightLeft className="w-4 h-4 mr-2" />
              Transfer to Cyberlink Social
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Transfer to Cyberlink Social</DialogTitle>
              <DialogDescription>
                Move funds from your wallet to your master Cyberlink Social account
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="p-4 rounded-lg bg-accent/10 border border-accent/20">
                <p className="text-sm text-muted-foreground">Available in Wallet</p>
                <p className="text-2xl font-bold text-accent">${walletBalance.toFixed(2)}</p>
              </div>
              
              <div className="space-y-2">
                <label className="text-sm font-medium">Transfer Amount</label>
                <Input
                  type="number"
                  placeholder="Enter amount"
                  value={transferAmount}
                  onChange={(e) => setTransferAmount(e.target.value)}
                  min="0.01"
                  max={walletBalance}
                  step="0.01"
                />
              </div>

              <div className="p-3 rounded-lg bg-muted/50 text-sm">
                <p className="text-muted-foreground">
                  Funds transferred to Cyberlink Social can be used across all connected platforms
                  and provide centralized control over your earnings.
                </p>
              </div>

              <Button
                onClick={handleTransfer}
                disabled={isTransferring}
                className="w-full"
              >
                {isTransferring ? "Processing..." : "Confirm Transfer"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        <div className="mt-4 p-3 rounded-lg bg-muted/30 text-xs text-muted-foreground">
          <p>
            <Shield className="w-3 h-3 inline mr-1" />
            Your Cyberlink Social account acts as a master controller for all platform earnings
          </p>
        </div>
      </CardContent>
    </Card>
  );
};
