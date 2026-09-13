import { useCallback, useEffect, useState } from "react";
import { resolvePostsMedia } from "@/lib/media";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import AppShell from "@/components/layout/AppShell";
import PostCard from "@/components/PostCard";
import { PostCardSkeleton } from "@/components/PostCardSkeleton";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  SocialPost,
  SocialProfile,
  displayNameOf,
  formatTimestamp,
} from "@/lib/social";
import { DollarSign, Home, Loader2 } from "lucide-react";

interface NotificationPrefs {
  notify_likes: boolean;
  notify_replies: boolean;
  notify_follows: boolean;
  notify_mentions: boolean;
  email_updates: boolean;
}

const defaultPrefs: NotificationPrefs = {
  notify_likes: true,
  notify_replies: true,
  notify_follows: true,
  notify_mentions: true,
  email_updates: false,
};

const Dashboard = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [userId, setUserId] = useState<string | null>(null);
  const [profile, setProfile] = useState<SocialProfile & { bio?: string | null } | null>(null);
  const [posts, setPosts] = useState<SocialPost[]>([]);
  const [loading, setLoading] = useState(true);

  // settings state
  const [username, setUsername] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [bio, setBio] = useState("");
  const [savingProfile, setSavingProfile] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [changingPassword, setChangingPassword] = useState(false);
  const [prefs, setPrefs] = useState<NotificationPrefs>(defaultPrefs);
  const [savingPrefs, setSavingPrefs] = useState(false);
  const [showMonetization, setShowMonetization] = useState(() => {
    try { return localStorage.getItem("cyberlink:dashboard-monetization-hidden") !== "1"; } catch { return true; }
  });

  const load = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      navigate("/auth");
      return;
    }
    setUserId(user.id);
    const [profileRes, postsRes, prefsRes] = await Promise.all([
      supabase.from("profiles").select("id, username, display_name, avatar_url, is_verified, bio").eq("id", user.id).maybeSingle(),
      supabase
        .from("posts")
        .select("id, user_id, content, created_at, parent_post_id, like_count, reply_count, monetization_type, price, post_media(media_url, media_type, display_order)")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(50),
      supabase.from("notification_preferences").select("*").eq("user_id", user.id).maybeSingle(),
    ]);

    if (profileRes.data) {
      setProfile(profileRes.data as any);
      setUsername(profileRes.data.username ?? "");
      setDisplayName(profileRes.data.display_name ?? "");
      setBio((profileRes.data as any).bio ?? "");
    }

    const rows = postsRes.data ?? [];
    const mapped: SocialPost[] = rows.map((row: any) => ({
      id: row.id,
      user_id: row.user_id,
      content: row.content,
      created_at: row.created_at,
      parent_post_id: row.parent_post_id,
      like_count: row.like_count ?? 0,
      reply_count: row.reply_count ?? 0,
      repost_count: row.repost_count ?? 0,
      monetization_type: row.monetization_type ?? "free",
      price: Number(row.price ?? 0),
      is_demo: !!row.is_demo,
      is_sponsored: !!row.is_sponsored,
      sponsor_name: row.sponsor_name ?? null,
      affiliate_link_id: row.affiliate_link_id ?? null,
      profile: (profileRes.data as any) ?? null,
      media: (row.post_media ?? [])
        .sort((a: any, b: any) => (a.display_order ?? 0) - (b.display_order ?? 0))
        .map((m: any) => ({ url: m.media_url, type: (m.media_type === "video" ? "video" : "image") as "image" | "video" })),
    }));

    const roots = await resolvePostsMedia(mapped.filter((p) => !p.parent_post_id));
    setPosts(roots);

    if (prefsRes.data) {
      const d = prefsRes.data as any;
      setPrefs({
        notify_likes: d.notify_likes,
        notify_replies: d.notify_replies,
        notify_follows: d.notify_follows,
        notify_mentions: d.notify_mentions,
        email_updates: d.email_updates,
      });
    }
    setLoading(false);
  }, [navigate]);

  useEffect(() => { load(); }, [load]);

  const saveProfile = async () => {
    if (!userId) return;
    const handle = username.trim().toLowerCase();
    if (handle && !/^[a-z0-9_]{3,20}$/.test(handle)) {
      toast.error("Handle must be 3-20 characters: letters, numbers or underscores");
      return;
    }
    if (displayName.length > 50) return toast.error("Display name must be 50 characters or less");
    if (bio.length > 300) return toast.error("Bio must be 300 characters or less");
    setSavingProfile(true);
    const { error } = await supabase
      .from("profiles")
      .update({ username: handle || null, display_name: displayName.trim() || null, bio: bio.trim() || null })
      .eq("id", userId);
    setSavingProfile(false);
    if (error) {
      toast.error(error.code === "23505" ? "That handle is already taken" : error.message);
      return;
    }
    setUsername(handle);
    setProfile((p) => (p ? { ...p, username: handle || null, display_name: displayName || null } : p));
    toast.success("Profile updated");
  };

  const changePassword = async () => {
    if (newPassword.length < 8) {
      toast.error("New password must be at least 8 characters");
      return;
    }
    setChangingPassword(true);
    const { error } = await supabase.auth.updateUser({
      password: newPassword,
      ...(currentPassword ? ({ current_password: currentPassword } as any) : {}),
    } as any);
    setChangingPassword(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    setCurrentPassword("");
    setNewPassword("");
    toast.success("Password updated");
  };

  const savePrefs = async (next: NotificationPrefs) => {
    if (!userId) return;
    setPrefs(next);
    setSavingPrefs(true);
    const { error } = await supabase
      .from("notification_preferences")
      .upsert({ user_id: userId, ...next }, { onConflict: "user_id" });
    setSavingPrefs(false);
    if (error) toast.error(error.message);
  };

  const toggleMonetization = (visible: boolean) => {
    setShowMonetization(visible);
    try { localStorage.setItem("cyberlink:dashboard-monetization-hidden", visible ? "0" : "1"); } catch { /* ignore */ }
  };

  return (
    <AppShell>
      <h1 className="text-2xl font-bold mb-4">Dashboard</h1>

      <div className="mb-5 flex flex-wrap items-center justify-between gap-3 border-b border-border/60 pb-4">
        <p className="text-sm text-muted-foreground">Your creative programs and site activity in one place.</p>
        <div className="flex flex-wrap items-center gap-2">
          <Button size="sm" variant="outline" asChild><Link to="/"><Home className="h-4 w-4" /> Home</Link></Button>
          {showMonetization && <Button size="sm" variant="outline" asChild><Link to="/monetization"><DollarSign className="h-4 w-4" /> Monetization</Link></Button>}
          <div className="flex items-center gap-2 pl-1">
            <Label htmlFor="show-monetization" className="text-xs text-muted-foreground">Show Monetization</Label>
            <Switch id="show-monetization" checked={showMonetization} onCheckedChange={toggleMonetization} />
          </div>
        </div>
      </div>

      <Tabs defaultValue={searchParams.get("tab") === "settings" ? "settings" : "posts"}>
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="posts">My posts</TabsTrigger>
          <TabsTrigger value="settings">Account settings</TabsTrigger>
        </TabsList>

        <TabsContent value="posts" className="mt-4 space-y-4 min-h-[320px]">
          {loading ? (
            <>
              <PostCardSkeleton />
              <PostCardSkeleton />
            </>
          ) : posts.length === 0 ? (
            <Card className="p-8 text-center text-muted-foreground">
              You haven't transmitted anything yet.
            </Card>
          ) : (
            posts.map((post) => (
              <PostCard
                key={post.id}
                postId={post.id}
                authorId={post.user_id}
                author={displayNameOf(post.profile)}
                handle={post.profile?.username}
                avatar={post.profile?.avatar_url || undefined}
                content={post.content}
                timestamp={formatTimestamp(post.created_at)}
                likes={post.like_count}
                comments={post.reply_count}
                replyCount={post.reply_count}
                isVerified={!!post.profile?.is_verified}
                monetizationType={post.monetization_type}
                price={post.price}
                isPaid
                media={post.media}
                linkToThread
              />
            ))
          )}
        </TabsContent>

        <TabsContent value="settings" className="mt-4 space-y-4">
          <Card className="p-5 bg-card/70 backdrop-blur-sm border-border/60">
            <h3 className="font-semibold mb-4">Profile picture</h3>
            {userId && (
              <ProfilePictureEditor
                userId={userId}
                name={displayName || username}
                onChange={(url) => setProfile((p) => (p ? { ...p, avatar_url: url } : p))}
              />
            )}
          </Card>

          <Card className="p-5 bg-card/70 backdrop-blur-sm border-border/60">
            <h3 className="font-semibold mb-4">Edit profile</h3>
            <div className="space-y-3">
              <div>
                <Label htmlFor="dash-handle">Handle</Label>
                <Input id="dash-handle" value={username} maxLength={20} onChange={(e) => setUsername(e.target.value)} placeholder="cyber_handle" />
              </div>
              <div>
                <Label htmlFor="dash-name">Display name</Label>
                <Input id="dash-name" value={displayName} maxLength={50} onChange={(e) => setDisplayName(e.target.value)} placeholder="Your name" />
              </div>
              <div>
                <Label htmlFor="dash-bio">Bio</Label>
                <Textarea id="dash-bio" value={bio} maxLength={300} rows={3} onChange={(e) => setBio(e.target.value)} placeholder="Tell the multiverse about yourself..." />
              </div>
              <Button onClick={saveProfile} disabled={savingProfile}>
                {savingProfile && <Loader2 className="w-4 h-4 mr-2 animate-spin" />} Save profile
              </Button>
            </div>
          </Card>

          <Card className="p-5 bg-card/70 backdrop-blur-sm border-border/60">
            <h3 className="font-semibold mb-4">Change password</h3>
            <div className="space-y-3">
              <div>
                <Label htmlFor="dash-current">Current password</Label>
                <Input id="dash-current" type="password" value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} autoComplete="current-password" />
              </div>
              <div>
                <Label htmlFor="dash-new">New password</Label>
                <Input id="dash-new" type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} autoComplete="new-password" />
              </div>
              <Button onClick={changePassword} disabled={changingPassword || !newPassword}>
                {changingPassword && <Loader2 className="w-4 h-4 mr-2 animate-spin" />} Update password
              </Button>
            </div>
          </Card>

          <Card className="p-5 bg-card/70 backdrop-blur-sm border-border/60">
            <h3 className="font-semibold mb-4">
              Notification preferences {savingPrefs && <Loader2 className="inline w-3 h-3 ml-1 animate-spin" />}
            </h3>
            <div className="space-y-3">
              {([
                ["notify_likes", "Likes on my posts"],
                ["notify_replies", "Replies to my posts"],
                ["notify_follows", "New followers"],
                ["notify_mentions", "Mentions"],
                ["email_updates", "Email updates"],
              ] as Array<[keyof NotificationPrefs, string]>).map(([key, label]) => (
                <div key={key} className="flex items-center justify-between">
                  <Label htmlFor={`pref-${key}`} className="text-sm font-normal">{label}</Label>
                  <Switch
                    id={`pref-${key}`}
                    checked={prefs[key]}
                    onCheckedChange={(checked) => savePrefs({ ...prefs, [key]: checked })}
                  />
                </div>
              ))}
            </div>
          </Card>

        </TabsContent>
      </Tabs>
    </AppShell>
  );
};

export default Dashboard;
