import { useState, useEffect } from "react";
import { Link, useSearchParams, useNavigate } from "react-router-dom";
import AppShell from "@/components/layout/AppShell";
import { PlatformEarningsCard } from "@/components/PlatformEarningsCard";
import CreatePostDialog from "@/components/CreatePostDialog";
import PostComposer from "@/components/post/PostComposer";
import SpaceBackground from "@/components/space/SpaceBackground";
import { QualificationProgress } from "@/components/QualificationProgress";
import StoriesBar from "@/components/StoriesBar";
import { WalletCard } from "@/components/WalletCard";
import { CryptoWalletConnect } from "@/components/CryptoWalletConnect";
import { CryptoBalanceCard } from "@/components/CryptoBalanceCard";
import SocialFeed from "@/components/SocialFeed";
import { useFloatingWindowsContext } from "@/providers/FloatingWindowsProvider";
import { Button } from "@/components/ui/button";
import { Wallet, TrendingUp, Award, DollarSign, Eye, ChevronDown, ChevronUp, LayoutDashboard, User, Radio, Gamepad2, Globe, Rocket } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from "@/components/ui/carousel";
import { Card } from "@/components/ui/card";
import { signInPath } from "@/lib/authRedirect";

const Index = () => {
  const navigate = useNavigate();
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [feedRefreshKey, setFeedRefreshKey] = useState(0);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [searchParams] = useSearchParams();
  const { openWindow } = useFloatingWindowsContext();
  const [showSpaceBackground, setShowSpaceBackground] = useState(true);
  const [quickAccessOpen, setQuickAccessOpen] = useState(() => {
    try {
      return localStorage.getItem("cyberlink:quick-access-collapsed") !== "1";
    } catch {
      return true;
    }
  });

  const toggleQuickAccess = () => {
    setQuickAccessOpen((open) => {
      try {
        localStorage.setItem("cyberlink:quick-access-collapsed", open ? "1" : "0");
      } catch {
        /* storage may be unavailable */
      }
      return !open;
    });
  };

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) {
        navigate(signInPath());
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (!session) {
        navigate(signInPath());
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  useEffect(() => {
    checkUser();
    
    const payment = searchParams.get("payment");
    const postId = searchParams.get("post_id");
    
    if (payment === "success" && postId) {
      handlePaymentSuccess(postId);
    }
  }, [searchParams]);

  const checkUser = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    setCurrentUserId(user?.id || null);
  };

  const handlePaymentSuccess = async (postId: string) => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      await supabase.functions.invoke("complete-post-payment", {
        body: { postId },
      });

      toast.success("Payment successful! Content unlocked.");
      setFeedRefreshKey((key) => key + 1);
    } catch (error: any) {
      console.error("Payment error:", error);
      toast.error("Failed to process payment");
    }
  };

  const handleCreatePost = () => {
    setFeedRefreshKey((k) => k + 1);
  };

  return (
    <AppShell onCreatePost={() => setIsCreateDialogOpen(true)}>
      <StoriesBar />
      <div>
        <div>
          <nav aria-label="Major sections" className="mb-5 grid grid-cols-3 gap-2 sm:grid-cols-6">
            {[
              { label: "Dashboard", path: "/dashboard", icon: LayoutDashboard },
              { label: "Profile", path: "/profile", icon: User },
              { label: "Studio", path: "/studio", icon: Radio },
              { label: "Arena", path: "/cyber-arena", icon: Gamepad2 },
              { label: "Cyber World", path: "/cyber-world", icon: Globe },
              { label: "Monetization", path: "/monetization", icon: DollarSign },
            ].map((item) => (
              <Button key={item.path} asChild variant="outline" className="h-auto min-h-16 flex-col gap-1 px-2 py-2 text-xs">
                <Link to={item.path}>
                  <item.icon className="h-5 w-5 text-primary" />
                  <span className="text-center leading-tight">{item.label}</span>
                </Link>
              </Button>
            ))}
          </nav>
          {currentUserId && (
            <div className="mb-6 p-4 border rounded-lg bg-muted/30">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-semibold">Quick Access Windows</h3>
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-6 w-6"
                  onClick={toggleQuickAccess}
                  title={quickAccessOpen ? "Collapse quick access" : "Expand quick access"}
                  aria-label={quickAccessOpen ? "Collapse quick access" : "Expand quick access"}
                  aria-expanded={quickAccessOpen}
                >
                  {quickAccessOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                </Button>
              </div>
              {quickAccessOpen && (
              <Carousel className="w-full">
                <CarouselContent className="-ml-2 md:-ml-4">
                  <CarouselItem className="pl-2 md:pl-4 basis-auto">
                    <Button 
                      size="sm" 
                      variant="outline"
                      onClick={() => openWindow("Platform Earnings", <PlatformEarningsCard />)}
                    >
                      <DollarSign className="w-4 h-4 mr-2" />
                      Earnings
                    </Button>
                  </CarouselItem>
                  <CarouselItem className="pl-2 md:pl-4 basis-auto">
                    <Button 
                      size="sm" 
                      variant="outline"
                      onClick={() => openWindow("My Wallet", <WalletCard />)}
                    >
                      <Wallet className="w-4 h-4 mr-2" />
                      Wallet
                    </Button>
                  </CarouselItem>
                  <CarouselItem className="pl-2 md:pl-4 basis-auto">
                    <Button 
                      size="sm" 
                      variant="outline"
                      onClick={() => openWindow("Crypto Balance", <CryptoBalanceCard />)}
                    >
                      <TrendingUp className="w-4 h-4 mr-2" />
                      Crypto
                    </Button>
                  </CarouselItem>
                  <CarouselItem className="pl-2 md:pl-4 basis-auto">
                    <Button 
                      size="sm" 
                      variant="outline"
                      onClick={() => openWindow("Qualification Progress", <QualificationProgress />)}
                    >
                      <Award className="w-4 h-4 mr-2" />
                      Progress
                    </Button>
                  </CarouselItem>
                  <CarouselItem className="pl-2 md:pl-4 basis-auto">
                    <Button 
                      size="sm" 
                      variant="outline"
                      onClick={() => {
                        setShowSpaceBackground(false);
                        openWindow("All Seeing Eye - Multiverse Explorer", <SpaceBackground />, 900, 700);
                      }}
                    >
                      <Eye className="w-4 h-4 mr-2" />
                      All Seeing Eye
                    </Button>
                  </CarouselItem>
                </CarouselContent>
                <CarouselPrevious className="hidden md:flex" />
                <CarouselNext className="hidden md:flex" />
              </Carousel>
              )}
            </div>
          )}
          
          <div className="mb-6">
            <PostComposer onPublished={() => setFeedRefreshKey((k) => k + 1)} />
          </div>

          <div className="mb-6 flex items-center justify-between gap-4 border-y border-primary/20 bg-background/55 px-4 py-3 backdrop-blur-md">
            <div className="min-w-0">
              <p className="text-sm font-semibold text-foreground">Solar System Voyage</p>
              <p className="truncate text-xs text-muted-foreground">Fly a physics-driven mission through the live 3D starfield.</p>
            </div>
            <Button asChild size="sm" className="shrink-0">
              <Link to="/voyage"><Rocket className="mr-2 h-4 w-4" />Launch</Link>
            </Button>
          </div>

          <SocialFeed refreshKey={feedRefreshKey} />

        </div>
      </div>

      <CreatePostDialog
        open={isCreateDialogOpen}
        onOpenChange={setIsCreateDialogOpen}
        onPost={handleCreatePost}
      />
    </AppShell>
  );
};

export default Index;