import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Check, Infinity, Sparkles, Zap } from "lucide-react";
import { INFINITY_TIERS, useInfinitySubscription } from "@/hooks/useInfinitySubscription";

interface InfinitySubscriptionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const InfinitySubscriptionDialog = ({ open, onOpenChange }: InfinitySubscriptionDialogProps) => {
  const { status, loading, startCheckout } = useInfinitySubscription();
  const currentTier = status.tier;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto bg-gradient-to-br from-purple-950/95 to-indigo-950/95 backdrop-blur border-purple-500/30">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-2xl text-purple-300">
            <Infinity className="w-8 h-8 animate-spin" style={{ animationDuration: '3s' }} />
            Infinity AI Ecosystem Plans
          </DialogTitle>
        </DialogHeader>

        <div className="grid md:grid-cols-3 gap-4 mt-6">
          {/* Free Tier */}
          <Card className="bg-muted/10 border-muted/20 p-6">
            <div className="text-center mb-4">
              <h3 className="text-xl font-bold text-foreground mb-2">{INFINITY_TIERS.free.name}</h3>
              <div className="text-3xl font-bold text-purple-400">Free</div>
              <p className="text-sm text-muted-foreground mt-2">Basic infinity features</p>
            </div>

            <div className="space-y-3 mb-6">
              {INFINITY_TIERS.free.features.map((feature, index) => (
                <div key={index} className="flex items-start gap-2">
                  <Check className="w-4 h-4 text-muted-foreground mt-0.5 flex-shrink-0" />
                  <span className="text-sm text-muted-foreground">{feature}</span>
                </div>
              ))}
            </div>

            {currentTier === "free" && (
              <Badge className="w-full justify-center bg-purple-500/20 text-purple-300 border-purple-500/30">
                Current Plan
              </Badge>
            )}
          </Card>

          {/* Quantum Tier */}
          <Card className="bg-gradient-to-br from-purple-900/20 to-indigo-900/20 border-purple-500/30 p-6 relative overflow-hidden">
            <div className="absolute top-0 right-0 bg-purple-500 text-white text-xs px-3 py-1 rounded-bl-lg">
              Popular
            </div>
            
            <div className="text-center mb-4">
              <h3 className="text-xl font-bold text-purple-300 mb-2">{INFINITY_TIERS.quantum.name}</h3>
              <div className="text-3xl font-bold text-purple-300">
                ${INFINITY_TIERS.quantum.price}
                <span className="text-sm font-normal text-muted-foreground">/year</span>
              </div>
              <p className="text-sm text-muted-foreground mt-2">Advanced automation</p>
            </div>

            <div className="space-y-3 mb-6">
              {INFINITY_TIERS.quantum.features.map((feature, index) => (
                <div key={index} className="flex items-start gap-2">
                  <Check className="w-4 h-4 text-purple-400 mt-0.5 flex-shrink-0" />
                  <span className="text-sm text-foreground">{feature}</span>
                </div>
              ))}
            </div>

            <Button
              onClick={() => startCheckout("quantum")}
              disabled={loading || currentTier === "quantum"}
              className="w-full bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700"
            >
              <Zap className="w-4 h-4 mr-2" />
              {currentTier === "quantum" ? "Current Plan" : "Upgrade to Quantum"}
            </Button>
          </Card>

          {/* Cosmic Tier */}
          <Card className="bg-gradient-to-br from-purple-900/30 to-pink-900/30 border-purple-400/40 p-6 relative overflow-hidden">
            <div className="absolute top-0 right-0 bg-gradient-to-r from-purple-500 to-pink-500 text-white text-xs px-3 py-1 rounded-bl-lg flex items-center gap-1">
              <Sparkles className="w-3 h-3" />
              Premium
            </div>
            
            <div className="text-center mb-4">
              <h3 className="text-xl font-bold text-purple-200 mb-2">{INFINITY_TIERS.cosmic.name}</h3>
              <div className="text-3xl font-bold text-purple-200">
                ${INFINITY_TIERS.cosmic.price}
                <span className="text-sm font-normal text-muted-foreground">/year</span>
              </div>
              <p className="text-sm text-muted-foreground mt-2">Ultimate infinity power</p>
            </div>

            <div className="space-y-3 mb-6">
              {INFINITY_TIERS.cosmic.features.map((feature, index) => (
                <div key={index} className="flex items-start gap-2">
                  <Check className="w-4 h-4 text-purple-300 mt-0.5 flex-shrink-0" />
                  <span className="text-sm text-foreground">{feature}</span>
                </div>
              ))}
            </div>

            <Button
              onClick={() => startCheckout("cosmic")}
              disabled={loading || currentTier === "cosmic"}
              className="w-full bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600"
            >
              <Sparkles className="w-4 h-4 mr-2" />
              {currentTier === "cosmic" ? "Current Plan" : "Upgrade to Cosmic"}
            </Button>
          </Card>
        </div>

        <div className="mt-6 p-4 bg-purple-950/30 border border-purple-500/20 rounded-lg">
          <h4 className="font-semibold text-purple-300 mb-2 flex items-center gap-2">
            <Infinity className="w-5 h-5" />
            What is Infinity AI?
          </h4>
          <p className="text-sm text-muted-foreground">
            Infinity AI is the autonomous orchestrator of your CyberLink ecosystem. It continuously monitors, 
            optimizes, and enhances your experience by coordinating between Zozo and Draco, predicting your needs, 
            and executing automated workflows in an infinite loop of intelligence.
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
};
