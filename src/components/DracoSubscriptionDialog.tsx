import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Check, Crown, Sparkles } from "lucide-react";
import { DRACO_TIERS, DracoTier } from "@/hooks/useDracoSubscription";

interface DracoSubscriptionDialogProps {
  isOpen: boolean;
  onClose: () => void;
  currentTier: DracoTier;
  onSubscribe: (tier: "basic" | "pro") => void;
  onManageSubscription: () => void;
}

export const DracoSubscriptionDialog = ({
  isOpen,
  onClose,
  currentTier,
  onSubscribe,
  onManageSubscription
}: DracoSubscriptionDialogProps) => {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl bg-gradient-to-br from-red-950/95 to-orange-950/95 border-red-600/50">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold text-center text-red-500 flex items-center justify-center gap-2">
            <Crown className="h-6 w-6" />
            Draco Tactical Tiers
          </DialogTitle>
        </DialogHeader>
        
        <div className="grid md:grid-cols-3 gap-4 mt-4">
          {/* Free Tier */}
          <Card className={`p-6 ${currentTier === "free" ? "border-red-500 border-2" : "border-red-900/50"} bg-black/40`}>
            <div className="text-center mb-4">
              <h3 className="text-xl font-bold text-red-400">Free</h3>
              <p className="text-3xl font-bold text-white mt-2">$0<span className="text-sm text-red-400/70">/month</span></p>
            </div>
            <ul className="space-y-2 mb-6">
              {DRACO_TIERS.free.features.map((feature, idx) => (
                <li key={idx} className="flex items-start gap-2 text-sm text-red-200/80">
                  <Check className="h-4 w-4 text-red-500 mt-0.5 flex-shrink-0" />
                  {feature}
                </li>
              ))}
            </ul>
            {currentTier === "free" && (
              <div className="text-center text-sm text-red-400 font-semibold">Current Plan</div>
            )}
          </Card>

          {/* Basic Tier */}
          <Card className={`p-6 ${currentTier === "basic" ? "border-orange-500 border-2" : "border-orange-900/50"} bg-black/40`}>
            <div className="text-center mb-4">
              <h3 className="text-xl font-bold text-orange-400">Basic</h3>
              <p className="text-3xl font-bold text-white mt-2">$240<span className="text-sm text-orange-400/70">/year</span></p>
            </div>
            <ul className="space-y-2 mb-6">
              {DRACO_TIERS.basic.features.map((feature, idx) => (
                <li key={idx} className="flex items-start gap-2 text-sm text-orange-200/80">
                  <Check className="h-4 w-4 text-orange-500 mt-0.5 flex-shrink-0" />
                  {feature}
                </li>
              ))}
            </ul>
            {currentTier === "basic" ? (
              <Button
                onClick={onManageSubscription}
                className="w-full bg-gradient-to-r from-orange-600 to-red-600 hover:from-orange-700 hover:to-red-700"
              >
                Manage Subscription
              </Button>
            ) : (
              <Button
                onClick={() => onSubscribe("basic")}
                className="w-full bg-gradient-to-r from-orange-600 to-red-600 hover:from-orange-700 hover:to-red-700"
              >
                Upgrade to Basic
              </Button>
            )}
          </Card>

          {/* Pro Tier */}
          <Card className={`p-6 ${currentTier === "pro" ? "border-red-500 border-2" : "border-red-900/50"} bg-black/40 relative overflow-hidden`}>
            <div className="absolute top-2 right-2">
              <Sparkles className="h-5 w-5 text-red-400 animate-pulse" />
            </div>
            <div className="text-center mb-4">
              <h3 className="text-xl font-bold text-red-400">Pro</h3>
              <p className="text-3xl font-bold text-white mt-2">$480<span className="text-sm text-red-400/70">/year</span></p>
            </div>
            <ul className="space-y-2 mb-6">
              {DRACO_TIERS.pro.features.map((feature, idx) => (
                <li key={idx} className="flex items-start gap-2 text-sm text-red-200/80">
                  <Check className="h-4 w-4 text-red-500 mt-0.5 flex-shrink-0" />
                  {feature}
                </li>
              ))}
            </ul>
            {currentTier === "pro" ? (
              <Button
                onClick={onManageSubscription}
                className="w-full bg-gradient-to-r from-red-600 to-orange-600 hover:from-red-700 hover:to-orange-700"
              >
                Manage Subscription
              </Button>
            ) : (
              <Button
                onClick={() => onSubscribe("pro")}
                className="w-full bg-gradient-to-r from-red-600 to-orange-600 hover:from-red-700 hover:to-orange-700"
              >
                Upgrade to Pro
              </Button>
            )}
          </Card>
        </div>
      </DialogContent>
    </Dialog>
  );
};
