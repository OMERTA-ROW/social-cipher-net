import { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import Navigation from "@/components/Navigation";
import PostCard from "@/components/PostCard";
import { PostCardSkeleton } from "@/components/PostCardSkeleton";
import CreatePostDialog from "@/components/CreatePostDialog";
import MatrixOverlay from "@/components/MatrixOverlay";
import { SnipeLayer } from "@/components/sniper/SnipeLayer";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { CheckCircle2, UserPlus, UserMinus } from "lucide-react";
import ProfileMedia from "@/components/profile/ProfileMedia";

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
    media_type: string;
  }>;
  has_paid?: boolean;
}

interface Friend {
  id: string;
  display_name: string | null;
  username: string | null;
  avatar_url: string | null;
  is_verified: boolean;
}

interface UserProfile {
  id: string;
  display_name: string | null;
  username: string | null;
  avatar_url: string | null;
  bio: string | null;
  is_verified: boolean;
}

const UserProfile = () => {
  const { userId } = useParams();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [posts, setPosts] = useState<Post[]>([]);
  const [friends, setFriends] = useState<Friend[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [isFollowing, setIsFollowing] = useState(false);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);

  useEffect(() => {
    checkUser();
    if (userId) {
      fetchUserProfile();
      fetchUserPosts();
      fetchFriends();
    }
  }, [userId]);

  const checkUser = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    setCurrentUserId(user?.id || null);
    if (user && userId) {
      checkFollowingStatus(user.id);
    }
  };

  const checkFollowingStatus = async (currentId: string) => {
    const { data } = await supabase
      .from('followers')
      .select('id')
      .eq('follower_id', currentId)
      .eq('following_id', userId)
      .single();
    
    setIsFollowing(!!data);
  };

  const fetchUserProfile = async () => {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();

    if (error) {
      console.error('Error fetching profile:', error);
      toast.error('Failed to load profile');
      return;
    }

    setProfile(data);
  };

  const fetchUserPosts = async () => {
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
        .eq('user_id', userId)
        .is('parent_post_id', null)
        .order("created_at", { ascending: false });

      if (error) throw error;

      if (user) {
        const postsWithPaymentStatus = await Promise.all(
          (data || []).map(async (post) => {
            if (post.monetization_type === 'free' || post.user_id === user.id) {
              return { ...post, has_paid: true };
            }

            const { data: paymentData } = await supabase
              .from('post_payments')
              .select('id')
              .eq('post_id', post.id)
              .eq('payer_id', user.id)
              .single();

            return { ...post, has_paid: !!paymentData };
          })
        );

        setPosts(postsWithPaymentStatus);
      } else {
        setPosts(data || []);
      }
    } catch (error) {
      console.error('Error fetching posts:', error);
      toast.error('Failed to load posts');
    } finally {
      setIsLoading(false);
    }
  };

  const fetchFriends = async () => {
    const { data, error } = await supabase
      .from('followers')
      .select('following_id')
      .eq('follower_id', userId);

    if (error) {
      console.error('Error fetching friends:', error);
      return;
    }

    if (!data || data.length === 0) {
      setFriends([]);
      return;
    }

    const followingIds = data.map(f => f.following_id);
    const { data: profilesData, error: profilesError } = await supabase
      .from('profiles')
      .select('id, display_name, username, avatar_url, is_verified')
      .in('id', followingIds);

    if (profilesError) {
      console.error('Error fetching friend profiles:', error);
      return;
    }

    setFriends(profilesData || []);
  };

  const handleFollowToggle = async () => {
    if (!currentUserId) {
      toast.error('Please sign in to follow users');
      return;
    }

    try {
      if (isFollowing) {
        const { error } = await supabase
          .from('followers')
          .delete()
          .eq('follower_id', currentUserId)
          .eq('following_id', userId);

        if (error) throw error;
        setIsFollowing(false);
        toast.success('Unfollowed successfully');
      } else {
        const { error } = await supabase
          .from('followers')
          .insert({
            follower_id: currentUserId,
            following_id: userId
          });

        if (error) throw error;
        setIsFollowing(true);
        toast.success('Following successfully');
      }
      fetchFriends();
    } catch (error) {
      console.error('Error toggling follow:', error);
      toast.error('Failed to update follow status');
    }
  };

  const handlePaymentRequired = async (postId: string, price: number) => {
    toast.error('Payment required to view this content');
  };

  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    
    if (diffMins < 1) return 'just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    
    const diffDays = Math.floor(diffHours / 24);
    return `${diffDays}d ago`;
  };

  return (
    <div className="min-h-screen">
      <MatrixOverlay />
      <SnipeLayer targetUserId={profile?.id} />
      <Navigation />
      
      <div className="container mx-auto px-4 pt-20 pb-8">
        <div className="flex gap-6">
          {/* Friends Sidebar */}
          <aside className="hidden lg:block w-64 space-y-4">
            <Card className="p-4 bg-background/80 backdrop-blur-sm border-border/50">
              <h3 className="font-semibold text-lg mb-4">Friends</h3>
              <div className="space-y-3">
                {friends.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No friends yet</p>
                ) : (
                  friends.slice(0, 10).map((friend) => (
                    <Link
                      key={friend.id}
                      to={`/profile/${friend.id}`}
                      className="flex items-center gap-2 p-2 rounded-lg hover:bg-muted/50 transition-colors"
                    >
                      <Avatar className="h-8 w-8">
                        <AvatarImage src={friend.avatar_url || ''} />
                        <AvatarFallback>
                          {friend.display_name?.charAt(0) || friend.username?.charAt(0) || '?'}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate flex items-center gap-1">
                          {friend.display_name || friend.username || 'Anonymous'}
                          {friend.is_verified && (
                            <CheckCircle2 className="h-3 w-3 text-primary" />
                          )}
                        </p>
                      </div>
                    </Link>
                  ))
                )}
              </div>
            </Card>
          </aside>

          {/* Main Content */}
          <main className="flex-1 max-w-3xl mx-auto">
            {/* Profile Header */}
            {profile && (
              <Card className="p-6 mb-6 bg-background/80 backdrop-blur-sm border-border/50">
                <div className="flex items-start gap-4">
                  <Avatar className="h-24 w-24">
                    <AvatarImage src={profile.avatar_url || ''} />
                    <AvatarFallback className="text-2xl">
                      {profile.display_name?.charAt(0) || profile.username?.charAt(0) || '?'}
                    </AvatarFallback>
                  </Avatar>
                  
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <h1 className="text-2xl font-bold">
                        {profile.display_name || profile.username || 'Anonymous'}
                      </h1>
                      {profile.is_verified && (
                        <Badge variant="secondary" className="gap-1">
                          <CheckCircle2 className="h-3 w-3" />
                          Verified
                        </Badge>
                      )}
                    </div>
                    
                    {profile.username && (
                      <p className="text-muted-foreground mb-2">@{profile.username}</p>
                    )}
                    
                    {profile.bio && (
                      <p className="text-sm mb-4">{profile.bio}</p>
                    )}
                    
                    {currentUserId && currentUserId !== userId && (
                      <Button
                        onClick={handleFollowToggle}
                        variant={isFollowing ? "outline" : "default"}
                        size="sm"
                        className="gap-2"
                      >
                        {isFollowing ? (
                          <>
                            <UserMinus className="h-4 w-4" />
                            Unfollow
                          </>
                        ) : (
                          <>
                            <UserPlus className="h-4 w-4" />
                            Follow
                          </>
                        )}
                      </Button>
                    )}
                  </div>
                </div>
              </Card>
            )}

            {/* Media */}
            {userId && (
              <div className="mb-6">
                <ProfileMedia userId={userId} isOwner={currentUserId === userId} />
              </div>
            )}

            {/* Posts */}
            <div className="space-y-4">
              {isLoading ? (
                Array(3).fill(0).map((_, i) => (
                  <PostCardSkeleton key={i} />
                ))
              ) : posts.length === 0 ? (
                <Card className="p-8 text-center bg-background/80 backdrop-blur-sm border-border/50">
                  <p className="text-muted-foreground">No posts yet</p>
                </Card>
              ) : (
                posts.map((post) => (
                  <PostCard
                    key={post.id}
                    postId={post.id}
                    author={post.profiles?.display_name || post.profiles?.username || "Anonymous"}
                    avatar={profile?.avatar_url || undefined}
                    content={post.content}
                    timestamp={formatTimestamp(post.created_at)}
                    likes={0}
                    comments={post.reply_count}
                    isVerified={post.profiles?.is_verified || false}
                    media={post.post_media.map(m => ({ url: m.media_url, type: m.media_type as 'image' | 'video' }))}
                    monetizationType={post.monetization_type}
                    price={post.price}
                    isPaid={post.has_paid}
                    replyCount={post.reply_count}
                    onPaymentRequired={() => handlePaymentRequired(post.id, post.price)}
                  />
                ))
              )}
            </div>
          </main>
        </div>
      </div>

      <CreatePostDialog
        open={isCreateDialogOpen}
        onOpenChange={setIsCreateDialogOpen}
        onPost={() => {
          setIsCreateDialogOpen(false);
          fetchUserPosts();
        }}
      />
    </div>
  );
};

export default UserProfile;
