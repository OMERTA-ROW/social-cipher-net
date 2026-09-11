import { Home, PlusSquare, User, Link2, Radio, ShoppingBag, DollarSign, Gamepad2, Shield, Tv, FileText, BadgeCheck, CreditCard, ExternalLink, Globe, Brain, Pickaxe, Image, Crown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { useMiningFeatures } from "@/hooks/useMiningFeatures";
import { useIsCeo } from "@/hooks/useIsCeo";

interface NavigationProps {
  onCreatePost?: () => void;
}

const Navigation = ({ onCreatePost }: NavigationProps) => {
  const navigate = useNavigate();
  const { draco, zozo } = useMiningFeatures();
  const { isCeo } = useIsCeo();
  
  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-card/80 backdrop-blur-lg border-b border-border">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center gap-2">
            <Link2 className="w-8 h-8 text-primary text-glow" />
            <h1 className="text-2xl font-bold text-primary text-glow">Cyber Link</h1>
          </div>
          
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" className="text-foreground hover:text-primary" onClick={() => navigate("/")}>
              <Home className="w-5 h-5" />
            </Button>
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={() => navigate("/studio")}
              className="text-foreground hover:text-primary"
            >
              <Radio className="w-5 h-5" />
            </Button>
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={() => navigate("/affiliate")}
              className="text-foreground hover:text-primary"
            >
              <ShoppingBag className="w-5 h-5" />
            </Button>
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={() => navigate("/monetization")}
              className="text-foreground hover:text-primary"
            >
              <DollarSign className="w-5 h-5" />
            </Button>
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={() => navigate("/affiliate-links")}
              className="text-foreground hover:text-primary"
              title="External Affiliate Links (CyberPro)"
            >
              <ExternalLink className="w-5 h-5" />
            </Button>
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={() => navigate("/subscription")}
              className="text-foreground hover:text-primary"
              title="Subscription Tiers"
            >
              <CreditCard className="w-5 h-5" />
            </Button>
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={() => navigate("/cyber-arena")}
              className="text-foreground hover:text-primary"
              title="CyberLink Arena"
            >
              <Gamepad2 className="w-5 h-5" />
            </Button>
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={() => navigate("/cyber-streamer")}
              className="text-foreground hover:text-primary"
            >
              <Tv className="w-5 h-5" />
            </Button>
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={() => navigate("/cyber-world")}
              className="text-foreground hover:text-primary"
              title="CyberWorld Hub"
            >
              <Globe className="w-5 h-5" />
            </Button>
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={() => navigate("/backgrounds")}
              className="text-foreground hover:text-primary"
              title="Space Backgrounds"
            >
              <Image className="w-5 h-5" />
            </Button>
            {isCeo && (
              <Button
                variant="ghost"
                size="icon"
                onClick={() => navigate("/ceo")}
                className="text-foreground hover:text-primary"
                title="CEO Portal"
              >
                <Crown className="w-5 h-5" />
              </Button>
            )}
            {(draco || zozo) && (
              <Button 
                variant="ghost" 
                size="icon" 
                onClick={() => navigate("/miners")}
                className="text-foreground hover:text-primary"
                title="Miners Hub (Premium)"
              >
                <Pickaxe className="w-5 h-5" />
              </Button>
            )}
            {onCreatePost && (
              <Button 
                variant="default" 
                size="icon" 
                onClick={onCreatePost}
                className="bg-primary text-primary-foreground hover:bg-primary/90 glow-primary"
              >
                <PlusSquare className="w-5 h-5" />
              </Button>
            )}
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={() => navigate("/security")}
              className="text-foreground hover:text-primary"
            >
              <Shield className="w-5 h-5" />
            </Button>
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={() => navigate("/community-guidelines")}
              className="text-foreground hover:text-primary"
              title="Community Guidelines"
            >
              <FileText className="w-5 h-5" />
            </Button>
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={() => navigate("/verification")}
              className="text-foreground hover:text-primary"
              title="Get Verified"
            >
              <BadgeCheck className="w-5 h-5" />
            </Button>
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={() => navigate("/profile")}
              title="My Profile"
              className="text-foreground hover:text-primary"
            >
              <User className="w-5 h-5" />
            </Button>
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navigation;
