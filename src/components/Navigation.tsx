import { Home, PlusSquare, User, Link2, Radio, ShoppingBag, DollarSign, Gamepad2, Shield, Tv, FileText, BadgeCheck, CreditCard, ExternalLink, Globe, Pickaxe, Image, Crown, type LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { useMiningFeatures } from "@/hooks/useMiningFeatures";
import { useIsCeo } from "@/hooks/useIsCeo";
import { useInsideAppShell } from "@/components/layout/AppShell";

interface NavigationProps {
  onCreatePost?: () => void;
}

const ICON_CLASS = "text-foreground hover:text-primary";

const NavIcon = ({ to, label, icon: Icon }: { to: string; label: string; icon: LucideIcon }) => (
  <Button asChild variant="ghost" size="icon" className={ICON_CLASS}>
    <Link to={to} aria-label={label} title={label}><Icon className="w-5 h-5" aria-hidden="true" /></Link>
  </Button>
);

/** Legacy header for pages not yet inside AppShell. Every item is a real, named link. */
const Navigation = ({ onCreatePost }: NavigationProps) => {
  const { draco, zozo } = useMiningFeatures();
  const { isCeo } = useIsCeo();
  const insideAppShell = useInsideAppShell();

  // Legacy pages still render this component while they migrate. The route-level
  // AppShell owns navigation now, so suppress the duplicate header inside it.
  if (insideAppShell) return null;

  return (
    <nav aria-label="Main" className="fixed top-0 left-0 right-0 z-50 bg-card/80 backdrop-blur-lg border-b border-border">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          <Link to="/" aria-label="Cyber Link home" className="flex items-center gap-2 rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
            <Link2 className="w-8 h-8 text-primary text-glow" aria-hidden="true" />
            <span className="text-2xl font-bold text-primary text-glow">Cyber Link</span>
          </Link>

          <div className="flex items-center gap-4">
            <NavIcon to="/" label="Home" icon={Home} />
            <NavIcon to="/studio" label="Live Studio" icon={Radio} />
            <NavIcon to="/affiliate" label="Affiliate program" icon={ShoppingBag} />
            <NavIcon to="/monetization" label="Monetization" icon={DollarSign} />
            <NavIcon to="/affiliate-links" label="External Affiliate Links (CyberPro)" icon={ExternalLink} />
            <NavIcon to="/subscription" label="Subscription Tiers" icon={CreditCard} />
            <NavIcon to="/cyber-arena" label="CyberLink Arena" icon={Gamepad2} />
            <NavIcon to="/cyber-streamer" label="Cyber Streamer" icon={Tv} />
            <NavIcon to="/cyber-world" label="CyberWorld Hub" icon={Globe} />
            <NavIcon to="/backgrounds" label="Space Backgrounds" icon={Image} />
            {isCeo && <NavIcon to="/ceo" label="CEO Portal" icon={Crown} />}
            {(draco || zozo) && <NavIcon to="/miners" label="Miners Hub (Premium)" icon={Pickaxe} />}
            {onCreatePost && (
              <Button variant="default" size="icon" onClick={onCreatePost} aria-label="Create post" title="Create post" className="bg-primary text-primary-foreground hover:bg-primary/90 glow-primary">
                <PlusSquare className="w-5 h-5" aria-hidden="true" />
              </Button>
            )}
            <NavIcon to="/security" label="Security" icon={Shield} />
            <NavIcon to="/community-guidelines" label="Community Guidelines" icon={FileText} />
            <NavIcon to="/verification" label="Get Verified" icon={BadgeCheck} />
            <NavIcon to="/profile" label="My Profile" icon={User} />
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navigation;
