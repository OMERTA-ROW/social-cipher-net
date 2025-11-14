import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { X, Gift as GiftIcon, Coins } from "lucide-react";

const USD_TO_TOKENS = 1000;

function TokenDisplay({ tokens }: { tokens: number }) {
  const [displayTokens, setDisplayTokens] = useState(0);

  useEffect(() => {
    let start = 0;
    const duration = 1500;
    const startTime = Date.now();

    const animate = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const easeOut = 1 - Math.pow(1 - progress, 3);
      
      setDisplayTokens(Math.floor(tokens * easeOut));

      if (progress < 1) {
        requestAnimationFrame(animate);
      }
    };

    requestAnimationFrame(animate);
  }, [tokens]);

  return (
    <span className="font-mono">{displayTokens.toLocaleString()}</span>
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

interface GiftGalleryProps {
  gifts: Gift[];
  streamId: string;
  streamerId: string;
  onClose: () => void;
}

export function GiftGallery({ gifts, streamId, streamerId, onClose }: GiftGalleryProps) {
  const [selectedGift, setSelectedGift] = useState<Gift | null>(null);
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);

  const sendGift = async () => {
    if (!selectedGift) return;

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      toast.error("You must be logged in to send gifts");
      return;
    }

    setSending(true);

    try {
      // Check wallet balance
      const { data: wallet } = await supabase
        .from("user_wallets")
        .select("balance")
        .eq("user_id", user.id)
        .single();

      if (!wallet || wallet.balance < selectedGift.price) {
        toast.error(`Insufficient balance. Need ${(selectedGift.price * USD_TO_TOKENS).toLocaleString()} tokens ($${selectedGift.price}). Please add funds to your wallet.`);
        setSending(false);
        return;
      }

      // Calculate commission (25% platform, 75% streamer)
      const platformCommission = selectedGift.price * 0.25;
      const streamerAmount = selectedGift.price * 0.75;

      // Deduct from sender's wallet
      const { error: walletError } = await supabase
        .from("user_wallets")
        .update({ balance: wallet.balance - selectedGift.price })
        .eq("user_id", user.id);

      if (walletError) throw walletError;

      // Add to receiver's wallet (75%)
      const { data: receiverWallet } = await supabase
        .from("user_wallets")
        .select("balance")
        .eq("user_id", streamerId)
        .single();

      const newReceiverBalance = (receiverWallet?.balance || 0) + streamerAmount;

      const { error: receiverWalletError } = await supabase
        .from("user_wallets")
        .upsert({
          user_id: streamerId,
          balance: newReceiverBalance,
        });

      if (receiverWalletError) throw receiverWalletError;

      // Record gift transaction
      const { error: giftError } = await supabase.from("stream_gifts").insert({
        stream_id: streamId,
        sender_id: user.id,
        receiver_id: streamerId,
        gift_id: selectedGift.id,
        message: message || null,
      });

      if (giftError) throw giftError;

      // Record wallet transactions
      await supabase.from("wallet_transactions").insert([
        {
          user_id: user.id,
          amount: -selectedGift.price,
          transaction_type: "gift_sent",
          description: `Sent ${selectedGift.name} to streamer`,
          metadata: { gift_id: selectedGift.id, stream_id: streamId, platform_commission: platformCommission },
        },
        {
          user_id: streamerId,
          amount: streamerAmount,
          transaction_type: "gift_received",
          description: `Received ${selectedGift.name} (75% after commission)`,
          metadata: { gift_id: selectedGift.id, stream_id: streamId, commission_rate: 0.25 },
        }
      ]);

      toast.success(`${selectedGift.name} sent successfully! ${(selectedGift.price * USD_TO_TOKENS).toLocaleString()} tokens (25% commission collected)`);
      setMessage("");
      setSelectedGift(null);
      onClose();
    } catch (error) {
      console.error("Error sending gift:", error);
      toast.error("Failed to send gift. Please try again.");
    } finally {
      setSending(false);
    }
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-4xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <GiftIcon className="w-6 h-6 text-primary" />
            Gift Gallery
          </DialogTitle>
          <Button
            variant="ghost"
            size="icon"
            className="absolute right-4 top-4"
            onClick={onClose}
          >
            <X className="w-4 h-4" />
          </Button>
        </DialogHeader>

        <ScrollArea className="max-h-[60vh] pr-4">
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {gifts.sort((a, b) => b.price - a.price).map((gift, idx) => {
              const tokenPrice = gift.price * USD_TO_TOKENS;
              return (
                <Card
                  key={gift.id}
                  className={`p-4 cursor-pointer transition-all hover:scale-105 hover:shadow-lg animate-fade-in ${
                    selectedGift?.id === gift.id
                      ? "ring-2 ring-primary bg-primary/10"
                      : "bg-background"
                  }`}
                  style={{ animationDelay: `${idx * 50}ms` }}
                  onClick={() => setSelectedGift(gift)}
                >
                  <div className="text-center space-y-2">
                    <div className="text-6xl animate-bounce">{gift.icon_url}</div>
                    <h3 className="font-bold text-foreground">{gift.name}</h3>
                    <p className="text-xs text-muted-foreground">{gift.description}</p>
                    <div className="space-y-1">
                      <p className="text-lg font-bold text-primary flex items-center justify-center gap-1">
                        <Coins className="w-4 h-4" />
                        <TokenDisplay tokens={tokenPrice} />
                      </p>
                      <p className="text-xs text-muted-foreground">${gift.price}</p>
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        </ScrollArea>

        {selectedGift && (
          <div className="space-y-4 pt-4 border-t">
            <div>
              <label className="text-sm font-medium text-foreground">
                Add a message (optional)
              </label>
              <Input
                placeholder="Say something nice..."
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                maxLength={100}
                className="mt-1"
              />
            </div>
            <div className="flex gap-2">
              <Button
                onClick={sendGift}
                disabled={sending}
                className="flex-1 hover-scale"
              >
                {sending ? "Sending..." : (
                  <span className="flex items-center gap-2">
                    Send {selectedGift.name} for
                    <span className="flex items-center gap-1">
                      <Coins className="w-4 h-4" />
                      {(selectedGift.price * USD_TO_TOKENS).toLocaleString()}
                    </span>
                  </span>
                )}
              </Button>
              <Button
                variant="outline"
                onClick={() => setSelectedGift(null)}
              >
                Cancel
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
