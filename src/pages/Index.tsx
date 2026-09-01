import { useState, useEffect } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import Navigation from "@/components/Navigation";
import { PlatformEarningsCard } from "@/components/PlatformEarningsCard";
import PostCard from "@/components/PostCard";
import { PostCardSkeleton } from "@/components/PostCardSkeleton";
import CreatePostDialog from "@/components/CreatePostDialog";
import RealisticSpaceBackground from "@/components/RealisticSpaceBackground";
import { QualificationProgress } from "@/components/QualificationProgress";
import StoriesBar from "@/components/StoriesBar";
import { WalletCard } from "@/components/WalletCard";
import { CryptoWalletConnect } from "@/components/CryptoWalletConnect";
import { CryptoBalanceCard } from "@/components/CryptoBalanceCard";
import { InfinityScrollFeed } from "@/components/InfinityScrollFeed";
import SocialFeed from "@/components/SocialFeed";
import { useFloatingWindowsContext } from "@/providers/FloatingWindowsProvider";
import { Button } from "@/components/ui/button";
import { Wallet, TrendingUp, Award, DollarSign, Play, Eye } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from "@/components/ui/carousel";
import { Card } from "@/components/ui/card";

interface Post {
  id: string;
  user_id: string;
  content: string;
  created_at: string;
  monetization_type: string;
  price: number;
  reply_count: number;
  profiles: {
    display_name: string | null;
    username: string | null;
    is_verified: boolean;
  };
  post_media: Array<{
    media_url: string;
    media_type: 'image' | 'video';
  }>;
  has_paid?: boolean;
  has_story?: boolean;
  is_live?: boolean;
}

const Index = () => {
  const navigate = useNavigate();
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [posts, setPosts] = useState<Post[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [feedRefreshKey, setFeedRefreshKey] = useState(0);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [showInfinityScroll, setShowInfinityScroll] = useState(false);
  const [initialVideoId, setInitialVideoId] = useState<string | undefined>();
  const [searchParams] = useSearchParams();
  const { openWindow } = useFloatingWindowsContext();
  const [showSpaceBackground, setShowSpaceBackground] = useState(true);

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
    fetchPosts();
    checkUser();
    
    const payment = searchParams.get("payment");
    const postId = searchParams.get("post_id");
    
    if (payment === "success" && postId) {
      handlePaymentSuccess(postId);
    }
  }, [searchParams]);

  // Auto-open All Seeing Eye 3D space on login
  useEffect(() => {
    const initializeMultiverse = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        // Wait a brief moment for UI to settle
        setTimeout(() => {
          setShowSpaceBackground(false);
          openWindow(
            "All Seeing Eye - Multiverse Explorer", 
            <RealisticSpaceBackground />, 
            900, 
            700
          );
          toast.success("Welcome to the Multiverse - 360° exploration active");
        }, 1000);
      }
    };

    initializeMultiverse();
  }, []);

  const checkUser = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    setCurrentUserId(user?.id || null);
  };

  const fetchPosts = async () => {
    setIsLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      const { data, error } = await supabase
        .from("posts")
        .select(`
          *,
          profiles!posts_user_id_fkey(display_name, username, is_verified),
          post_media(media_url, media_type)
        `)
        .is('parent_post_id', null)
        .order("created_at", { ascending: false });

      if (error) throw error;

      if (user) {
        const postsWithPaymentStatus = await Promise.all(
          (data || []).map(async (post) => {
            // Check if user has active stories
            const { data: stories } = await supabase
              .from('stories')
              .select('id')
              .eq('user_id', post.user_id)
              .gt('expires_at', new Date().toISOString())
              .limit(1);
            
            // Check if user is currently live
            const { data: liveStream } = await supabase
              .from('live_streams')
              .select('id')
              .eq('user_id', post.user_id)
              .eq('is_live', true)
              .limit(1);
            
            if (post.monetization_type === "free" || post.user_id === user.id) {
              return { 
                ...post,
                post_media: (post.post_media || []).map((m: any) => ({
                  media_url: m.media_url,
                  media_type: m.media_type as 'image' | 'video'
                })),
                has_paid: true,
                has_story: (stories?.length || 0) > 0,
                is_live: (liveStream?.length || 0) > 0
              };
            }

            const { data: payment } = await supabase
              .from("post_payments")
              .select("id")
              .eq("post_id", post.id)
              .eq("payer_id", user.id)
              .maybeSingle();

            return { 
              ...post,
              post_media: (post.post_media || []).map((m: any) => ({
                media_url: m.media_url,
                media_type: m.media_type as 'image' | 'video'
              })),
              has_paid: !!payment,
              has_story: (stories?.length || 0) > 0,
              is_live: (liveStream?.length || 0) > 0
            };
          })
        );
        setPosts(postsWithPaymentStatus);
      } else {
        // For non-authenticated users, still check live status
        const postsWithStatus = await Promise.all(
          (data || []).map(async (post) => {
            const { data: liveStream } = await supabase
              .from('live_streams')
              .select('id')
              .eq('user_id', post.user_id)
              .eq('is_live', true)
              .limit(1);
            
            return {
              ...post,
              post_media: (post.post_media || []).map((m: any) => ({
                media_url: m.media_url,
                media_type: m.media_type as 'image' | 'video'
              })),
              has_paid: post.monetization_type === "free",
              has_story: false,
              is_live: (liveStream?.length || 0) > 0
            };
          })
        );
        setPosts(postsWithStatus);
      }
    } catch (error: any) {
      console.error("Error fetching posts:", error);
      toast.error(error.message || "Failed to load posts");
    } finally {
      setIsLoading(false);
    }
  };

  const handlePaymentSuccess = async (postId: string) => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      await supabase.functions.invoke("complete-post-payment", {
        body: { postId },
      });

      toast.success("Payment successful! Content unlocked.");
      fetchPosts();
    } catch (error: any) {
      console.error("Payment error:", error);
      toast.error("Failed to process payment");
    }
  };

  const handlePaymentRequired = async (postId: string, monetizationType: string) => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast.error("Please sign in to access paid content");
        return;
      }

      const { data, error } = await supabase.functions.invoke("create-post-payment", {
        body: { postId, paymentType: monetizationType },
      });

      if (error) throw error;

      if (data?.url) {
        window.open(data.url, "_blank");
      }
    } catch (error: any) {
      console.error("Payment initiation error:", error);
      toast.error(error.message || "Failed to initiate payment");
    }
  };

  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffInHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60));
    
    if (diffInHours < 1) return "Just now";
    if (diffInHours < 24) return `${diffInHours}h ago`;
    return `${Math.floor(diffInHours / 24)}d ago`;
  };

  const handleCreatePost = () => {
    fetchPosts();
  };

  return (
    <div className="min-h-screen bg-background">
      {showSpaceBackground && <RealisticSpaceBackground />}
      <Navigation onCreatePost={() => setIsCreateDialogOpen(true)} />
      <StoriesBar />
      
      <main className="container mx-auto px-4 pt-24 pb-8">
        <div className="max-w-2xl mx-auto">
          {currentUserId && (
            <div className="mb-6 p-4 border rounded-lg bg-muted/30">
              <h3 className="text-sm font-semibold mb-3">Quick Access Windows</h3>
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
                  <CarouselItem className="pl-2 md:pl-4 basis-auto">
                    <Button 
                      size="sm" 
                      variant="default"
                      className="bg-gradient-to-r from-purple-600 to-pink-600"
                      onClick={() => setShowInfinityScroll(true)}
                    >
                      <Play className="w-4 h-4 mr-2" />
                      Infinity Scroll
                    </Button>
                  </CarouselItem>
                </CarouselContent>
                <CarouselPrevious className="hidden md:flex" />
                <CarouselNext className="hidden md:flex" />
              </Carousel>
            </div>
          )}
          
          <div className="mb-8">
            <h2 className="text-3xl font-bold text-foreground mb-2">Feed</h2>
            <p className="text-muted-foreground">Stay connected with the cyber community</p>
          </div>

          <SocialFeed refreshKey={feedRefreshKey} />

        </div>
      </main>

      <CreatePostDialog
        open={isCreateDialogOpen}
        onOpenChange={setIsCreateDialogOpen}
        onPost={handleCreatePost}
      />

      {showInfinityScroll && (
        <InfinityScrollFeed 
          onClose={() => {
            setShowInfinityScroll(false);
            setInitialVideoId(undefined);
          }}
          initialVideoId={initialVideoId}
        />
      )}
    </div>
  );
};

export default Index;