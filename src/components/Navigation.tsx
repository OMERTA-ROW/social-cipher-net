import { Home, PlusSquare, User, Link2, Radio, ShoppingBag, DollarSign, Gamepad2, Shield } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";

interface NavigationProps {
  onCreatePost?: () => void;
}

const Navigation = ({ onCreatePost }: NavigationProps) => {
  const navigate = useNavigate();
  
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
              onClick={() => navigate("/cyber-gamers")}
              className="text-foreground hover:text-primary"
            >
              <Gamepad2 className="w-5 h-5" />
            </Button>
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
              onClick={() => navigate("/auth")}
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
