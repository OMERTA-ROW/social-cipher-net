import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { UserMinus, UserPlus, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface FollowButtonProps {
  targetUserId: string;
  size?: "sm" | "default";
  onChange?: (following: boolean) => void;
}

const FollowButton = ({ targetUserId, size = "sm", onChange }: FollowButtonProps) => {
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [following, setFollowing] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    const load = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!active) return;
      setCurrentUserId(user?.id ?? null);
      if (user && user.id !== targetUserId) {
        const { data } = await supabase
          .from("followers")
          .select("id")
          .eq("follower_id", user.id)
          .eq("following_id", targetUserId)
          .maybeSingle();
        if (active) setFollowing(!!data);
      }
      if (active) setLoading(false);
    };
    load();
    return () => { active = false; };
  }, [targetUserId]);

  if (loading || !currentUserId || currentUserId === targetUserId) return null;

  const toggle = async (e: React.MouseEvent) => {
    e.stopPropagation();
    setLoading(true);
    const next = !following;
    const { error } = next
      ? await supabase.from("followers").insert({ follower_id: currentUserId, following_id: targetUserId })
      : await supabase.from("followers").delete().eq("follower_id", currentUserId).eq("following_id", targetUserId);
    setLoading(false);
    if (error) {
      toast.error("Could not update follow");
      return;
    }
    setFollowing(next);
    onChange?.(next);
    toast.success(next ? "Following" : "Unfollowed");
  };

  return (
    <Button
      size={size}
      variant={following ? "outline" : "default"}
      onClick={toggle}
      disabled={loading}
      className="gap-1"
    >
      {loading ? <Loader2 className="w-3 h-3 animate-spin" /> : following ? <UserMinus className="w-3 h-3" /> : <UserPlus className="w-3 h-3" />}
      {following ? "Following" : "Follow"}
    </Button>
  );
};

export default FollowButton;
