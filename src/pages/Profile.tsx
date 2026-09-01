import { useEffect, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import Navigation from "@/components/Navigation";
import RealisticSpaceBackground from "@/components/RealisticSpaceBackground";
import MatrixOverlay from "@/components/MatrixOverlay";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { CheckCircle2, Upload, LogOut, ExternalLink, Loader2 } from "lucide-react";

interface ProfileData {
  id: string;
  username: string | null;
  display_name: string | null;
  avatar_url: string | null;
  bio: string | null;
  is_verified: boolean;
}

const Profile = () => {
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
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
        setProfile(data as ProfileData);
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


  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !profile) return;
    setUploading(true);
    const ext = file.name.split(".").pop();
    const path = `${profile.id}/avatar-${Date.now()}.${ext}`;
    const { error: uploadError } = await supabase.storage
      .from("post-media")
      .upload(path, file, { upsert: true });
    if (uploadError) {
      toast.error(uploadError.message);
      setUploading(false);
      return;
    }
    const { data: { publicUrl } } = supabase.storage.from("post-media").getPublicUrl(path);
    const { error: updateError } = await supabase
      .from("profiles")
      .update({ avatar_url: publicUrl })
      .eq("id", profile.id);
    if (updateError) {
      toast.error(updateError.message);
    } else {
      setProfile({ ...profile, avatar_url: publicUrl });
      toast.success("Avatar updated");
    }
    setUploading(false);
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
    <div className="min-h-screen">
      <RealisticSpaceBackground />
      <MatrixOverlay />
      <Navigation />

      <div className="container mx-auto px-4 pt-20 pb-8 max-w-3xl">
        <Card className="p-6 bg-background/80 backdrop-blur-sm border-border/50 mb-6">
          <div className="flex items-start gap-6 flex-col sm:flex-row">
            <div className="relative">
              <Avatar className="h-28 w-28">
                <AvatarImage src={profile?.avatar_url || ""} />
                <AvatarFallback className="text-2xl">
                  {displayName?.[0] || username?.[0] || email[0]?.toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <Button
                size="icon"
                variant="secondary"
                className="absolute -bottom-1 -right-1 h-8 w-8 rounded-full"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
              >
                {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
              </Button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleAvatarUpload}
              />
            </div>

            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1 flex-wrap">
                <h1 className="text-2xl font-bold">
                  {displayName || username || "My Profile"}
                </h1>
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
                <Button size="sm" variant="ghost" onClick={handleSignOut} className="gap-1">
                  <LogOut className="w-3 h-3" /> Sign out
                </Button>
              </div>
            </div>
          </div>
        </Card>

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
    </div>
  );
};

export default Profile;
