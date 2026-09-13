import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import AppShell from "@/components/layout/AppShell";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { CheckCircle2, ExternalLink, Loader2, Settings } from "lucide-react";
import { AvatarTransform } from "@/components/profile/AvatarEditor";
import ProfileAvatar from "@/components/profile/ProfileAvatar";
import StandingAvatar, { DEFAULT_STANDING, StandingPosition } from "@/components/profile/StandingAvatar";
import ProfileMedia from "@/components/profile/ProfileMedia";
import ProfileRadio from "@/components/profile/ProfileRadio";
import ProfilePosts from "@/components/profile/ProfilePosts";
import PostComposer from "@/components/post/PostComposer";

interface ProfileData {
  id: string;
  username: string | null;
  display_name: string | null;
  avatar_url: string | null;
  avatar_original_url: string | null;
  avatar_transform: AvatarTransform;
  avatar_mode: string;
  avatar_standing_url: string | null;
  avatar_standing_position: StandingPosition;
  bio: string | null;
  is_verified: boolean;
}

const asStanding = (v: unknown): StandingPosition => {
  const p = (v ?? {}) as Partial<StandingPosition>;
  return {
    x: typeof p.x === "number" ? p.x : DEFAULT_STANDING.x,
    y: typeof p.y === "number" ? p.y : DEFAULT_STANDING.y,
    scale: typeof p.scale === "number" ? p.scale : DEFAULT_STANDING.scale,
  };
};

/**
 * Your own space as visitors see it: picture, posts, media and radio.
 * Nothing is edited here — everything is changed from the Dashboard.
 */
const Profile = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [postsKey, setPostsKey] = useState(0);
  const [profile, setProfile] = useState<ProfileData | null>(null);

  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        navigate("/auth");
        return;
      }
      const { data, error } = await supabase.from("profiles").select("*").eq("id", user.id).maybeSingle();
      if (error) toast.error("Failed to load profile");
      else if (data) setProfile(data as unknown as ProfileData);
      setLoading(false);
    };
    init();
  }, [navigate]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  const name = profile?.display_name || profile?.username || "My Profile";
  const standing = profile?.avatar_mode === "standing" && profile?.avatar_standing_url;

  return (
    <AppShell>
      <div>
        <Card className="p-6 bg-background/80 backdrop-blur-sm border-border/50 mb-6">
          <div className="flex items-start gap-6 flex-col sm:flex-row">
            <div className="flex min-h-[7rem] items-end justify-center">
              {standing ? (
                <StandingAvatar
                  src={profile!.avatar_standing_url as string}
                  alt={name}
                  position={asStanding(profile?.avatar_standing_position)}
                />
              ) : (
                <ProfileAvatar src={profile?.avatar_url} name={name} size={112} />
              )}
            </div>

            <div className="flex-1">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <h1 className="text-2xl font-bold">{name}</h1>
                    {profile?.is_verified && (
                      <Badge variant="secondary" className="gap-1">
                        <CheckCircle2 className="h-3 w-3" /> Verified
                      </Badge>
                    )}
                  </div>
                  {profile?.username && (
                    <p className="text-sm text-muted-foreground">@{profile.username}</p>
                  )}
                </div>
                <Button size="sm" asChild className="gap-1 shrink-0">
                  <Link to="/dashboard?tab=settings"><Pencil className="w-3 h-3" /> Edit</Link>
                </Button>
              </div>
              {profile && <ConnectedPlatforms userId={profile.id} className="mt-3" />}
              {profile?.bio && <p className="text-sm text-muted-foreground mt-3 mb-3 max-w-prose">{profile.bio}</p>}
              <div className="flex gap-2 flex-wrap mt-3">
                {profile && (
                  <Button size="sm" variant="outline" onClick={() => navigate(`/profile/${profile.id}`)} className="gap-1">
                    <ExternalLink className="w-3 h-3" /> View as a visitor
                  </Button>
                )}
              </div>
            </div>
          </div>
        </Card>

        {profile && (
          <>
            <div className="mb-6">
              <PostComposer
                avatarUrl={profile.avatar_url}
                displayName={profile.display_name || profile.username || ""}
                onPublished={() => setPostsKey((k) => k + 1)}
              />
            </div>
            <div className="mb-6">
              <ProfileRadio userId={profile.id} isOwner />
            </div>
            <div className="mb-6">
              <ProfileMedia userId={profile.id} isOwner />
            </div>
            <div className="mb-6 space-y-4">
              <h2 className="text-lg font-semibold">Posts</h2>
              <ProfilePosts userId={profile.id} refreshKey={postsKey} />
            </div>
          </>
        )}
      </div>
    </AppShell>
  );
};

export default Profile;
