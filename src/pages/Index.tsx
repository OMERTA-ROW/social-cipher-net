import { useState, useEffect } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import AppShell from "@/components/layout/AppShell";
import { PlatformEarningsCard } from "@/components/PlatformEarningsCard";
import CreatePostDialog from "@/components/CreatePostDialog";
import RealisticSpaceBackground from "@/components/RealisticSpaceBackground";
import { QualificationProgress } from "@/components/QualificationProgress";
import StoriesBar from "@/components/StoriesBar";
import { WalletCard } from "@/components/WalletCard";
import { CryptoWalletConnect } from "@/components/CryptoWalletConnect";
import { CryptoBalanceCard } from "@/components/CryptoBalanceCard";
import SocialFeed from "@/components/SocialFeed";
import { useFloatingWindowsContext } from "@/providers/FloatingWindowsProvider";
import { Button } from "@/components/ui/button";
import { Wallet, TrendingUp, Award, DollarSign, Eye, ChevronDown, ChevronUp } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from "@/components/ui/carousel";
import { Card } from "@/components/ui/card";

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
        navigate("/auth");
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (!session) {
        navigate("/auth");
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
                        openWindow("All Seeing Eye - Multiverse Explorer", <RealisticSpaceBackground />, 900, 700);
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
          
          <div className="mb-8">
            <h2 className="text-3xl font-bold text-foreground mb-2">Feed</h2>
            <p className="text-muted-foreground">Stay connected with the cyber community</p>
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