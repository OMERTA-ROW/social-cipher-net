import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import Navigation from "@/components/Navigation";
import PostCard from "@/components/PostCard";
import CreatePostDialog from "@/components/CreatePostDialog";
import CyberSpaceBackground from "@/components/CyberSpaceBackground";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface Post {
  id: string;
  user_id: string;
  content: string;
  created_at: string;
  monetization_type: string;
  price: number;
  profiles: {
    display_name: string | null;
    username: string | null;
    is_verified: boolean;
  };
  has_paid?: boolean;
}

const Index = () => {
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [posts, setPosts] = useState<Post[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [searchParams] = useSearchParams();

  useEffect(() => {
    fetchPosts();
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

  const fetchPosts = async () => {
    setIsLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      const { data, error } = await supabase
        .from("posts")
        .select(`
          *,
          profiles!posts_user_id_fkey(display_name, username, is_verified)
        `)
        .order("created_at", { ascending: false });

      if (error) throw error;

      if (user) {
        const postsWithPaymentStatus = await Promise.all(
          (data || []).map(async (post) => {
            if (post.monetization_type === "free" || post.user_id === user.id) {
              return { ...post, has_paid: true };
            }

            const { data: payment } = await supabase
              .from("post_payments")
              .select("id")
              .eq("post_id", post.id)
              .eq("payer_id", user.id)
              .maybeSingle();

            return { ...post, has_paid: !!payment };
          })
        );
        setPosts(postsWithPaymentStatus);
      } else {
        setPosts((data || []).map(post => ({ ...post, has_paid: post.monetization_type === "free" })));
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
      <CyberSpaceBackground />
      <Navigation onCreatePost={() => setIsCreateDialogOpen(true)} />
      
      <main className="container mx-auto px-4 pt-24 pb-8">
        <div className="max-w-2xl mx-auto">
          <div className="mb-8">
            <h2 className="text-3xl font-bold text-foreground mb-2">Feed</h2>
            <p className="text-muted-foreground">Stay connected with the cyber community</p>
          </div>
          
          <div className="space-y-4">
            {isLoading ? (
              <div className="text-center py-8 text-muted-foreground">Loading posts...</div>
            ) : posts.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No posts yet. Be the first to create one!
              </div>
            ) : (
              posts.map((post) => (
                <PostCard
                  key={post.id}
                  postId={post.id}
                  author={post.profiles.display_name || post.profiles.username || "Anonymous"}
                  content={post.content}
                  timestamp={formatTimestamp(post.created_at)}
                  likes={0}
                  comments={0}
                  isVerified={post.profiles.is_verified}
                  monetizationType={post.monetization_type}
                  price={post.price}
                  isPaid={post.has_paid}
                  onPaymentRequired={() => handlePaymentRequired(post.id, post.monetization_type)}
                />
              ))
            )}
          </div>
        </div>
      </main>

      <CreatePostDialog
        open={isCreateDialogOpen}
        onOpenChange={setIsCreateDialogOpen}
        onPost={handleCreatePost}
      />
    </div>
  );
};

export default Index;