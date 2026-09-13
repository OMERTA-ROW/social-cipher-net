import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Radio, Gamepad2, ShoppingBag, DollarSign, Zap, Sparkles } from "lucide-react";
import { toast } from "sonner";

interface HyperspacePortalProps {
  isOpen: boolean;
  onClose: () => void;
}

const HyperspacePortal = ({ isOpen, onClose }: HyperspacePortalProps) => {
  const navigate = useNavigate();
  const [particles, setParticles] = useState<Array<{ id: number; x: number; y: number; size: number }>>([]);

  useEffect(() => {
    if (isOpen) {
      // Generate random particles for hyperspace effect
      const newParticles = Array.from({ length: 50 }, (_, i) => ({
        id: i,
        x: Math.random() * 100,
        y: Math.random() * 100,
        size: Math.random() * 3 + 1,
      }));
      setParticles(newParticles);
    }
  }, [isOpen]);

  const portals = [
    {
      id: "live",
      name: "Live Studio",
      description: "Start streaming instantly",
      icon: Radio,
      color: "from-red-500 to-pink-500",
      route: "/studio",
      action: "live"
    },
    {
      id: "gamers",
      name: "Cyber Gamers",
      description: "Join gaming community",
      icon: Gamepad2,
      color: "from-purple-500 to-blue-500",
      route: "/cyber-arena",
      action: "gamers"
    },
    {
      id: "marketplace",
      name: "Marketplace",
      description: "Browse products",
      icon: ShoppingBag,
      color: "from-cyan-500 to-teal-500",
      route: "/shop",
      action: "shop"
    },
    {
      id: "monetize",
      name: "Monetization",
      description: "Manage earnings",
      icon: DollarSign,
      color: "from-yellow-500 to-orange-500",
      route: "/monetization",
      action: "money"
    },
  ];

  const handlePortalEnter = (portal: typeof portals[0]) => {
    toast.success(`Entering ${portal.name} through hyperspace...`);
    setTimeout(() => {
      navigate(portal.route);
      onClose();
    }, 500);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-background/95 backdrop-blur-lg animate-fade-in">
      {/* Hyperspace particles */}
      <div className="absolute inset-0 overflow-hidden">
        {particles.map((particle) => (
          <div
            key={particle.id}
            className="absolute rounded-full bg-primary animate-pulse"
            style={{
              left: `${particle.x}%`,
              top: `${particle.y}%`,
              width: `${particle.size}px`,
              height: `${particle.size}px`,
              animationDuration: `${Math.random() * 3 + 1}s`,
              animationDelay: `${Math.random() * 2}s`,
            }}
          />
        ))}
      </div>

      {/* Portal interface */}
      <Card className="relative z-10 w-full max-w-4xl mx-4 p-8 bg-card/90 backdrop-blur border-primary/30 shadow-2xl">
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-2 mb-4">
            <Sparkles className="w-8 h-8 text-primary animate-pulse" />
            <h2 className="text-4xl font-bold text-primary text-glow">Hyperspace Portal</h2>
            <Sparkles className="w-8 h-8 text-accent animate-pulse" />
          </div>
          <p className="text-muted-foreground">Choose your destination through Zozo's hyperspace</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          {portals.map((portal) => {
            const Icon = portal.icon;
            return (
              <Card
                key={portal.id}
                className="p-6 cursor-pointer hover:scale-105 transition-all border-primary/20 hover:border-primary/50 bg-muted/20 hover:bg-muted/40"
                onClick={() => handlePortalEnter(portal)}
              >
                <div className={`w-16 h-16 rounded-full bg-gradient-to-br ${portal.color} flex items-center justify-center mb-4 mx-auto animate-pulse`}>
                  <Icon className="w-8 h-8 text-white" />
                </div>
                <h3 className="text-xl font-bold text-center text-foreground mb-2">{portal.name}</h3>
                <p className="text-sm text-center text-muted-foreground">{portal.description}</p>
              </Card>
            );
          })}
        </div>

        <Button
          variant="outline"
          onClick={onClose}
          className="w-full"
        >
          Close Hyperspace
        </Button>
      </Card>
    </div>
  );
};

export default HyperspacePortal;
