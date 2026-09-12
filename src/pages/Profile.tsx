import { useEffect, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import AppShell from "@/components/layout/AppShell";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { CheckCircle2, Upload, ExternalLink, Loader2, Crop, UserRound, PersonStanding, Pencil } from "lucide-react";
import AvatarEditor, { AvatarTransform, DEFAULT_TRANSFORM, renderAvatar } from "@/components/profile/AvatarEditor";
import ProfileAvatar from "@/components/profile/ProfileAvatar";
import StandingAvatar, { DEFAULT_STANDING, StandingPosition } from "@/components/profile/StandingAvatar";
import { cutOutSubject } from "@/lib/cutout";
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

/** Storage values arrive as loose JSON; fall back to sane defaults. */
const asTransform = (v: unknown): AvatarTransform => {
  const t = (v ?? {}) as Partial<AvatarTransform>;
  return {
    zoom: typeof t.zoom === "number" ? t.zoom : 1,
    x: typeof t.x === "number" ? t.x : 0,
    y: typeof t.y === "number" ? t.y : 0,
  };
};

const asStanding = (v: unknown): StandingPosition => {
  const p = (v ?? {}) as Partial<StandingPosition>;
  return {
    x: typeof p.x === "number" ? p.x : 0,
    y: typeof p.y === "number" ? p.y : 0,
    scale: typeof p.scale === "number" ? p.scale : 1,
  };
};

const Profile = () => {
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [postsKey, setPostsKey] = useState(0);
  const [uploading, setUploading] = useState(false);
  const [editorOpen, setEditorOpen] = useState(false);
  const [editorSrc, setEditorSrc] = useState<string | null>(null);
  const [transform, setTransform] = useState<AvatarTransform>(DEFAULT_TRANSFORM);
  const [mode, setMode] = useState<"framed" | "standing">("framed");
  const [standingUrl, setStandingUrl] = useState<string | null>(null);
  const [standingPos, setStandingPos] = useState<StandingPosition>(DEFAULT_STANDING);
  const [cuttingOut, setCuttingOut] = useState(false);
  const [showAvatarControls, setShowAvatarControls] = useState(false);
  const [email, setEmail] = useState<string>("");
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [username, setUsername] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [bio, setBio] = useState("");

  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        navigate("/auth");
        return;
      }
      setEmail(user.email || "");
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .single();
      if (error) {
        toast.error("Failed to load profile");
      } else if (data) {
        const row = data as unknown as ProfileData;
        setProfile(row);
        setTransform(asTransform(row.avatar_transform));
        setMode(row.avatar_mode === "standing" ? "standing" : "framed");
        setStandingUrl(row.avatar_standing_url);
        setStandingPos(asStanding(row.avatar_standing_position));
        setUsername(data.username || "");
        setDisplayName(data.display_name || "");
        setBio(data.bio || "");
      }
      setLoading(false);
    };
    init();
  }, [navigate]);

  const handleSave = async () => {
    if (!profile) return;
    const handle = username.trim().toLowerCase();
    if (handle && !/^[a-z0-9_]{3,20}$/.test(handle)) {
      toast.error("Handle must be 3-20 characters: letters, numbers or underscores");
      return;
    }
    if (displayName.length > 50) {
      toast.error("Display name must be 50 characters or less");
      return;
    }
    if (bio.length > 300) {
      toast.error("Bio must be 300 characters or less");
      return;
    }
    setSaving(true);
    const { error } = await supabase
      .from("profiles")
      .update({ username: handle || null, display_name: displayName.trim() || null, bio: bio.trim() || null })
      .eq("id", profile.id);
    setSaving(false);
    if (error) {
      toast.error(error.code === "23505" ? "That handle is already taken" : error.message);
    } else {
      setUsername(handle);
      toast.success("Profile updated");
      setProfile({ ...profile, username: handle, display_name: displayName, bio });
    }
  };


  /** Upload the untouched original, then open the editor to frame it. */
  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file || !profile) return;
    if (!file.type.startsWith("image/")) {
      toast.error("Please choose an image file");
      return;
    }
    setUploading(true);
    const ext = (file.name.split(".").pop() || "png").toLowerCase();
    const path = `${profile.id}/avatar-original-${Date.now()}.${ext}`;
    const { error: uploadError } = await supabase.storage
      .from("post-media")
      .upload(path, file, { upsert: true, contentType: file.type, cacheControl: "31536000" });
    if (uploadError) {
      toast.error(uploadError.message);
      setUploading(false);
      return;
    }
    const { data: { publicUrl } } = supabase.storage.from("post-media").getPublicUrl(path);
    const { error: saveOriginal } = await supabase
      .from("profiles")
      .update({ avatar_original_url: publicUrl })
      .eq("id", profile.id);
    setUploading(false);
    if (saveOriginal) {
      toast.error(saveOriginal.message);
      return;
    }
    setProfile({ ...profile, avatar_original_url: publicUrl });
    // A new photo starts from a clean frame, and the cut-out is now stale.
    setTransform(DEFAULT_TRANSFORM);
    setStandingUrl(null);
    setEditorSrc(publicUrl);
    setEditorOpen(true);
  };

  /** Render the framed square from the original and store it plus the crop. */
  const handleCropSave = async (next: AvatarTransform) => {
    if (!profile || !editorSrc) return;
    setUploading(true);
    try {
      const blob = await renderAvatar(editorSrc, next);
      const path = `${profile.id}/avatar-${Date.now()}.png`;
      const { error: uploadError } = await supabase.storage
        .from("post-media")
        .upload(path, blob, { upsert: true, contentType: "image/png", cacheControl: "31536000" });
      if (uploadError) throw new Error(uploadError.message);
      const { data: { publicUrl } } = supabase.storage.from("post-media").getPublicUrl(path);
      const { error } = await supabase
        .from("profiles")
        .update({ avatar_url: publicUrl, avatar_original_url: editorSrc, avatar_transform: next })
        .eq("id", profile.id);
      if (error) throw new Error(error.message);
      setProfile({ ...profile, avatar_url: publicUrl, avatar_original_url: editorSrc });
      setTransform(next);
      setEditorOpen(false);
      toast.success("Picture updated");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not save that picture");
    } finally {
      setUploading(false);
    }
  };

  /** Switch between the round frame and the free-standing character. */
  const handleModeChange = async (next: "framed" | "standing") => {
    if (!profile || next === mode) return;
    const source = profile.avatar_original_url || profile.avatar_url;
    if (next === "standing" && !source) {
      toast.error("Upload a picture first");
      return;
    }

    let cutUrl = standingUrl;
    if (next === "standing" && !cutUrl && source) {
      setCuttingOut(true);
      try {
        const blob = await cutOutSubject(source);
        const path = `${profile.id}/avatar-standing-${Date.now()}.png`;
        const { error: uploadError } = await supabase.storage
          .from("post-media")
          .upload(path, blob, { upsert: true, contentType: "image/png", cacheControl: "31536000" });
        if (uploadError) throw new Error(uploadError.message);
        cutUrl = supabase.storage.from("post-media").getPublicUrl(path).data.publicUrl;
        setStandingUrl(cutUrl);
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Could not cut out the picture");
        setCuttingOut(false);
        return;
      }
      setCuttingOut(false);
    }

    setMode(next);
    const { error } = await supabase
      .from("profiles")
      .update({ avatar_mode: next, avatar_standing_url: cutUrl })
      .eq("id", profile.id);
    if (error) toast.error(error.message);
  };

  /** Remember where the standing character was dragged to. */
  const saveStandingPosition = async (pos: StandingPosition) => {
    setStandingPos(pos);
    if (!profile) return;
    await supabase
      .from("profiles")
      .update({ avatar_standing_position: pos })
      .eq("id", profile.id);
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    navigate("/auth");
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <AppShell>
      <AvatarEditor
        open={editorOpen}
        src={editorSrc}
        initial={transform}
        saving={uploading}
        onCancel={() => setEditorOpen(false)}
        onSave={handleCropSave}
      />
      <div>
        <Card className="p-6 bg-background/80 backdrop-blur-sm border-border/50 mb-6">
          <div className="flex items-start gap-6 flex-col sm:flex-row">
            <div className="flex flex-col items-center gap-3">
              <div className="relative flex min-h-[7rem] items-end justify-center">
                {mode === "standing" && standingUrl ? (
                  <StandingAvatar
                    src={standingUrl}
                    alt={displayName || username || "Your character"}
                    position={standingPos}
                    editable
                    onCommit={saveStandingPosition}
                  />
                ) : (
                  <ProfileAvatar src={profile?.avatar_url} name={displayName || username || email} size={112} />
                )}
                <Button
                  size="icon"
                  variant="secondary"
                  className="absolute -bottom-1 -right-1 h-7 w-7 rounded-full"
                  onClick={() => setShowAvatarControls((v) => !v)}
                  aria-expanded={showAvatarControls}
                  aria-label={showAvatarControls ? "Hide picture options" : "Edit picture"}
                  title={showAvatarControls ? "Hide picture options" : "Edit picture"}
                >
                  {uploading || cuttingOut ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Pencil className="w-3.5 h-3.5" />
                  )}
                </Button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleAvatarUpload}
                />
              </div>

              {showAvatarControls && (
                <div className="rounded-lg border border-border/60 bg-card/70 p-2">
                  <div className="flex flex-wrap items-center justify-center gap-1.5">
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-7 gap-1 px-2 text-xs"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={uploading}
                    >
                      <Upload className="h-3 w-3" /> Upload
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-7 gap-1 px-2 text-xs"
                      disabled={!profile?.avatar_original_url && !profile?.avatar_url}
                      onClick={() => {
                        setEditorSrc(profile?.avatar_original_url || profile?.avatar_url || null);
                        setEditorOpen(true);
                      }}
                    >
                      <Crop className="h-3 w-3" /> Adjust
                    </Button>
                    <Button
                      size="sm"
                      variant={mode === "framed" ? "default" : "ghost"}
                      className="h-7 gap-1 px-2 text-xs"
                      onClick={() => handleModeChange("framed")}
                      aria-pressed={mode === "framed"}
                    >
                      <UserRound className="h-3 w-3" /> Framed
                    </Button>
                    <Button
                      size="sm"
                      variant={mode === "standing" ? "default" : "ghost"}
                      className="h-7 gap-1 px-2 text-xs"
                      onClick={() => handleModeChange("standing")}
                      aria-pressed={mode === "standing"}
                      disabled={cuttingOut}
                    >
                      {cuttingOut ? (
                        <Loader2 className="h-3 w-3 animate-spin" />
                      ) : (
                        <PersonStanding className="h-3 w-3" />
                      )}
                      Standing
                    </Button>
                  </div>
                  {mode === "standing" && standingUrl && (
                    <p className="mt-1.5 max-w-[14rem] text-center text-[11px] text-muted-foreground">
                      Drag your character to place it, or use the arrow keys.
                    </p>
                  )}
                </div>
              )}
            </div>

            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1 flex-wrap">
                <h1 className="text-2xl font-bold">
                  {displayName || username || "My Profile"}
                </h1>
                {username && <span className="text-sm text-muted-foreground">@{username}</span>}
                {profile?.is_verified && (
                  <Badge variant="secondary" className="gap-1">
                    <CheckCircle2 className="h-3 w-3" /> Verified
                  </Badge>
                )}
              </div>
              <p className="text-muted-foreground text-sm mb-3">{email}</p>
              <div className="flex gap-2 flex-wrap">
                {profile && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => navigate(`/profile/${profile.id}`)}
                    className="gap-1"
                  >
                    <ExternalLink className="w-3 h-3" /> View public profile
                  </Button>
                )}
              </div>
            </div>
          </div>
        </Card>

        {profile && (
          <div className="mb-6">
            <PostComposer
              avatarUrl={profile.avatar_url}
              displayName={displayName || username}
              onPublished={() => setPostsKey((k) => k + 1)}
            />
          </div>
        )}

        {profile && (
          <div className="mb-6">
            <ProfileRadio userId={profile.id} isOwner />
          </div>
        )}

        {profile && (
          <div className="mb-6">
            <ProfileMedia userId={profile.id} isOwner />
          </div>
        )}

        {profile && (
          <div className="mb-6 space-y-4">
            <h2 className="text-lg font-semibold">Posts</h2>
            <ProfilePosts userId={profile.id} refreshKey={postsKey} />
          </div>
        )}

        <Card className="p-6 bg-background/80 backdrop-blur-sm border-border/50">
          <h2 className="text-lg font-semibold mb-4">Edit profile</h2>
          <div className="space-y-4">
            <div>
              <Label htmlFor="username">Handle</Label>
              <Input
                id="username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="cyber_handle"
                maxLength={20}
              />
            </div>
            <div>
              <Label htmlFor="displayName">Display name</Label>
              <Input
                id="displayName"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="Your name"
              />
            </div>
            <div>
              <Label htmlFor="bio">Bio</Label>
              <Textarea
                id="bio"
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                placeholder="Tell the multiverse about yourself..."
                rows={4}
              />
            </div>
            <Button onClick={handleSave} disabled={saving} className="w-full sm:w-auto">
              {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Save changes
            </Button>
          </div>
        </Card>
      </div>
    </AppShell>
  );
};

export default Profile;
