import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Crop, Loader2, PersonStanding, Upload, UserRound } from "lucide-react";
import AvatarEditor, { AvatarTransform, DEFAULT_TRANSFORM, headshotTransform, renderAvatar } from "@/components/profile/AvatarEditor";
import ProfileAvatar from "@/components/profile/ProfileAvatar";
import StandingAvatar, { DEFAULT_STANDING, StandingPosition } from "@/components/profile/StandingAvatar";
import { cutOutSubject } from "@/lib/cutout";

interface Props {
  userId: string;
  name?: string | null;
  /** Told when the saved picture changes so the page around it can refresh. */
  onChange?: (avatarUrl: string | null) => void;
}

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

/**
 * The one place a profile picture is changed: upload the original, frame it,
 * or step out of the circle as a standing character. Lives on the Dashboard.
 */
const ProfilePictureEditor = ({ userId, name, onChange }: Props) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [originalUrl, setOriginalUrl] = useState<string | null>(null);
  const [transform, setTransform] = useState<AvatarTransform>(DEFAULT_TRANSFORM);
  const [mode, setMode] = useState<"framed" | "standing">("framed");
  const [standingUrl, setStandingUrl] = useState<string | null>(null);
  const [standingPos, setStandingPos] = useState<StandingPosition>(DEFAULT_STANDING);
  const [editorOpen, setEditorOpen] = useState(false);
  const [editorSrc, setEditorSrc] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [cuttingOut, setCuttingOut] = useState(false);

  useEffect(() => {
    let active = true;
    (async () => {
      const { data } = await supabase
        .from("profiles")
        .select("avatar_url, avatar_original_url, avatar_transform, avatar_mode, avatar_standing_url, avatar_standing_position")
        .eq("id", userId)
        .maybeSingle();
      if (!active || !data) return;
      const row = data as any;
      setAvatarUrl(row.avatar_url ?? null);
      setOriginalUrl(row.avatar_original_url ?? null);
      setTransform(asTransform(row.avatar_transform));
      setMode(row.avatar_mode === "standing" ? "standing" : "framed");
      setStandingUrl(row.avatar_standing_url ?? null);
      setStandingPos(asStanding(row.avatar_standing_position));
    })();
    return () => { active = false; };
  }, [userId]);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast.error("Please choose an image file");
      return;
    }
    setUploading(true);
    const ext = (file.name.split(".").pop() || "png").toLowerCase();
    const path = `${userId}/avatar-original-${Date.now()}.${ext}`;
    const { error: uploadError } = await supabase.storage
      .from("post-media")
      .upload(path, file, { upsert: true, contentType: file.type, cacheControl: "31536000" });
    if (uploadError) {
      toast.error(uploadError.message);
      setUploading(false);
      return;
    }
    const { data: { publicUrl } } = supabase.storage.from("post-media").getPublicUrl(path);
    const { error } = await supabase.from("profiles").update({ avatar_original_url: publicUrl }).eq("id", userId);
    setUploading(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    setOriginalUrl(publicUrl);
    setTransform(await headshotTransform(publicUrl));
    setStandingUrl(null);
    setEditorSrc(publicUrl);
    setEditorOpen(true);
  };

  const handleCropSave = async (next: AvatarTransform) => {
    if (!editorSrc) return;
    setUploading(true);
    try {
      const blob = await renderAvatar(editorSrc, next);
      const path = `${userId}/avatar-${Date.now()}.png`;
      const { error: uploadError } = await supabase.storage
        .from("post-media")
        .upload(path, blob, { upsert: true, contentType: "image/png", cacheControl: "31536000" });
      if (uploadError) throw new Error(uploadError.message);
      const { data: { publicUrl } } = supabase.storage.from("post-media").getPublicUrl(path);
      const { error } = await supabase
        .from("profiles")
        .update({ avatar_url: publicUrl, avatar_original_url: editorSrc, avatar_transform: next })
        .eq("id", userId);
      if (error) throw new Error(error.message);
      setAvatarUrl(publicUrl);
      setOriginalUrl(editorSrc);
      setTransform(next);
      setEditorOpen(false);
      onChange?.(publicUrl);
      toast.success("Picture updated");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not save that picture");
    } finally {
      setUploading(false);
    }
  };

  const handleModeChange = async (next: "framed" | "standing") => {
    if (next === mode) return;
    const source = originalUrl || avatarUrl;
    if (next === "standing" && !source) {
      toast.error("Upload a picture first");
      return;
    }
    let cutUrl = standingUrl;
    if (next === "standing" && !cutUrl && source) {
      setCuttingOut(true);
      try {
        const blob = await cutOutSubject(source);
        const path = `${userId}/avatar-standing-${Date.now()}.png`;
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
      .eq("id", userId);
    if (error) toast.error(error.message);
  };

  const saveStandingPosition = async (pos: StandingPosition) => {
    setStandingPos(pos);
    await supabase.from("profiles").update({ avatar_standing_position: pos }).eq("id", userId);
  };

  return (
    <div className="flex flex-wrap items-center gap-5">
      <AvatarEditor
        open={editorOpen}
        src={editorSrc}
        initial={transform}
        saving={uploading}
        onCancel={() => setEditorOpen(false)}
        onSave={handleCropSave}
      />
      <div className="flex min-h-[7rem] items-end justify-center">
        {mode === "standing" && standingUrl ? (
          <StandingAvatar
            src={standingUrl}
            alt={name || "Your character"}
            position={standingPos}
            editable
            onCommit={saveStandingPosition}
          />
        ) : (
          <ProfileAvatar src={avatarUrl} name={name || "You"} size={112} />
        )}
      </div>

      <div className="space-y-2">
        <div className="flex flex-wrap items-center gap-1.5">
          <Button size="sm" variant="outline" className="h-8 gap-1 px-2 text-xs" disabled={uploading} onClick={() => fileInputRef.current?.click()}>
            {uploading ? <Loader2 className="h-3 w-3 animate-spin" /> : <Upload className="h-3 w-3" />} Upload
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="h-8 gap-1 px-2 text-xs"
            disabled={!originalUrl && !avatarUrl}
            onClick={() => { setEditorSrc(originalUrl || avatarUrl); setEditorOpen(true); }}
          >
            <Crop className="h-3 w-3" /> Adjust
          </Button>
          <Button
            size="sm"
            variant={mode === "framed" ? "default" : "ghost"}
            className="h-8 gap-1 px-2 text-xs"
            aria-pressed={mode === "framed"}
            onClick={() => handleModeChange("framed")}
          >
            <UserRound className="h-3 w-3" /> Framed
          </Button>
          <Button
            size="sm"
            variant={mode === "standing" ? "default" : "ghost"}
            className="h-8 gap-1 px-2 text-xs"
            aria-pressed={mode === "standing"}
            disabled={cuttingOut}
            onClick={() => handleModeChange("standing")}
          >
            {cuttingOut ? <Loader2 className="h-3 w-3 animate-spin" /> : <PersonStanding className="h-3 w-3" />} Standing
          </Button>
        </div>
        <p className="max-w-[22rem] text-[11px] text-muted-foreground">
          The whole picture is kept. Framing only changes what the circle shows, and you can adjust it again any time.
        </p>
        <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleUpload} />
      </div>
    </div>
  );
};

export default ProfilePictureEditor;
