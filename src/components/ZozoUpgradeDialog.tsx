import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Crown, Check, Sparkles } from "lucide-react";
import { ZOZO_TIERS } from "@/hooks/useZozoSubscription";

interface ZozoUpgradeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelectTier: (tier: "basic" | "premium") => void;
}

const ZozoUpgradeDialog = ({ open, onOpenChange, onSelectTier }: ZozoUpgradeDialogProps) => {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl">
        <DialogHeader>
          <DialogTitle className="text-center text-2xl flex items-center justify-center gap-2">
            <Sparkles className="w-6 h-6 text-primary" />
            Activate Zozo AI Assistant
            <Sparkles className="w-6 h-6 text-accent" />
          </DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 py-6">
          {/* Free Tier */}
          <Card className="p-6 border-border bg-muted/20">
            <div className="text-center mb-4">
              <h3 className="text-xl font-bold text-foreground mb-2">Free</h3>
              <p className="text-3xl font-bold text-primary mb-1">$0</p>
              <p className="text-xs text-muted-foreground">Forever</p>
            </div>
            <ul className="space-y-2 mb-6">
              {ZOZO_TIERS.free.features.map((feature, idx) => (
                <li key={idx} className="flex items-start gap-2 text-sm">
                  <Check className="w-4 h-4 text-muted-foreground flex-shrink-0 mt-0.5" />
                  <span className="text-muted-foreground">{feature}</span>
                </li>
              ))}
            </ul>
            <Badge variant="outline" className="w-full justify-center">
              Current Plan
            </Badge>
          </Card>

          {/* Basic Tier */}
          <Card className="p-6 border-primary/50 bg-primary/5 relative">
            <Badge className="absolute -top-3 left-1/2 -translate-x-1/2 bg-primary">
              Popular
            </Badge>
            <div className="text-center mb-4">
              <h3 className="text-xl font-bold text-foreground mb-2">Basic</h3>
              <p className="text-3xl font-bold text-primary mb-1">$20</p>
              <p className="text-xs text-muted-foreground">per year</p>
            </div>
            <ul className="space-y-2 mb-6">
              {ZOZO_TIERS.basic.features.map((feature, idx) => (
                <li key={idx} className="flex items-start gap-2 text-sm">
                  <Check className="w-4 h-4 text-primary flex-shrink-0 mt-0.5" />
                  <span>{feature}</span>
                </li>
              ))}
            </ul>
            <Button onClick={() => onSelectTier("basic")} className="w-full glow-primary">
              Subscribe to Basic
            </Button>
          </Card>

          {/* Premium Tier */}
          <Card className="p-6 border-accent/50 bg-accent/5 relative">
            <Badge className="absolute -top-3 left-1/2 -translate-x-1/2 bg-gradient-to-r from-primary to-accent">
              <Crown className="w-3 h-3 mr-1" />
              Premium
            </Badge>
            <div className="text-center mb-4">
              <h3 className="text-xl font-bold text-foreground mb-2">Premium</h3>
              <p className="text-3xl font-bold text-accent mb-1">$40</p>
              <p className="text-xs text-muted-foreground">per year</p>
            </div>
            <ul className="space-y-2 mb-6">
              {ZOZO_TIERS.premium.features.map((feature, idx) => (
                <li key={idx} className="flex items-start gap-2 text-sm">
                  <Check className="w-4 h-4 text-accent flex-shrink-0 mt-0.5" />
                  <span>{feature}</span>
                </li>
              ))}
            </ul>
            <Button
              onClick={() => onSelectTier("premium")}
              className="w-full bg-gradient-to-r from-primary to-accent hover:opacity-90"
            >
              <Crown className="w-4 h-4 mr-2" />
              Subscribe to Premium
            </Button>
          </Card>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ZozoUpgradeDialog;
