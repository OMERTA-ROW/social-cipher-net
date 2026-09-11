import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Loader2, Music, Radio as RadioIcon } from "lucide-react";
import { providerLabel, RadioSettings, toEmbedUrl } from "@/lib/radio";

interface Props {
  userId: string;
  isOwner?: boolean;
}

/**
 * Profile radio: the owner connects Spotify / Apple Music / SoundCloud / YouTube
 * (or pastes any playlist link) and it plays for visitors. Optionally routed
 * into their live stream so listeners follow along.
 */
const ProfileRadio = ({ userId, isOwner = false }: Props) => {
  const [settings, setSettings] = useState<RadioSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [url, setUrl] = useState("");
  const [title, setTitle] = useState("");
  const [routeToStream, setRouteToStream] = useState(false);

  useEffect(() => {
    let active = true;
    (async () => {
      setLoading(true);
      const { data } = await supabase
        .from("profile_radio")
        .select("provider, playlist_url, embed_url, title, is_enabled, route_to_stream")
        .eq("user_id", userId)
        .maybeSingle();
      if (!active) return;
      if (data) {
        setSettings(data as RadioSettings);
        setUrl(data.playlist_url ?? "");
        setTitle(data.title ?? "");
        setRouteToStream(!!data.route_to_stream);
      } else {
        setSettings(null);
      }
      setLoading(false);
    })();
    return () => {
      active = false;
    };
  }, [userId]);

  const save = async () => {
    const resolved = toEmbedUrl(url);
    if (!resolved) {
      toast.error("Paste a Spotify, Apple Music, SoundCloud or YouTube playlist link");
      return;
    }
    setSaving(true);
    const payload = {
      user_id: userId,
      provider: resolved.provider,
      playlist_url: url.trim(),
      embed_url: resolved.embed,
      title: title.trim() || null,
      is_enabled: true,
      route_to_stream: routeToStream,
    };
    const { error } = await supabase.from("profile_radio").upsert(payload, { onConflict: "user_id" });
    setSaving(false);
    if (error) {
      toast.error(error.message || "Could not save your radio");
      return;
    }
    setSettings(payload as RadioSettings);
    toast.success("Radio updated");
  };

  const clear = async () => {
    const { error } = await supabase.from("profile_radio").delete().eq("user_id", userId);
    if (error) {
      toast.error("Could not remove your radio");
      return;
    }
    setSettings(null);
    setUrl("");
    setTitle("");
    toast.success("Radio removed");
  };

  if (loading) {
    return (
      <Card className="p-6 bg-background/80 backdrop-blur-sm border-border/50 flex items-center gap-2 text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" /> Loading radio…
      </Card>
    );
  }

  if (!isOwner && (!settings || !settings.is_enabled || !settings.embed_url)) return null;

  const isAudioFile = settings?.embed_url && /\.(mp3|m4a|ogg|wav)(\?.*)?$/i.test(settings.embed_url);

  return (
    <Card className="p-6 bg-background/80 backdrop-blur-sm border-border/50 space-y-4">
      <div className="flex items-center gap-2">
        <RadioIcon className="h-5 w-5 text-primary" />
        <h2 className="text-lg font-semibold">
          {settings?.title || "Profile radio"}
        </h2>
        {settings && (
          <span className="text-xs text-muted-foreground">
            · {providerLabel[settings.provider]}
          </span>
        )}
      </div>

      {settings?.embed_url ? (
        isAudioFile ? (
          <audio src={settings.embed_url} controls className="w-full" />
        ) : (
          <iframe
            src={settings.embed_url}
            title="Profile radio"
            loading="lazy"
            allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
            className="w-full h-[152px] rounded-lg border-0 bg-black/40"
          />
        )
      ) : (
        isOwner && (
          <p className="text-sm text-muted-foreground flex items-center gap-2">
            <Music className="h-4 w-4" /> Connect your music and it plays right here on your profile.
          </p>
        )
      )}

      {settings?.route_to_stream && (
        <p className="text-xs text-primary/90">
          Routed into your live stream — listeners hear what you're playing.
        </p>
      )}

      {isOwner && (
        <div className="space-y-3 border-t border-border/40 pt-4">
          <div>
            <Label htmlFor="radio-url">Playlist link</Label>
            <Input
              id="radio-url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://open.spotify.com/playlist/…"
            />
          </div>
          <div>
            <Label htmlFor="radio-title">Station name (optional)</Label>
            <Input
              id="radio-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Late night signals"
            />
          </div>
          <div className="flex items-center justify-between">
            <div>
              <Label htmlFor="radio-stream">Route into my live stream</Label>
              <p className="text-xs text-muted-foreground">
                Sends this audio to your stream so listeners follow along.
              </p>
            </div>
            <Switch id="radio-stream" checked={routeToStream} onCheckedChange={setRouteToStream} />
          </div>
          <div className="flex gap-2">
            <Button onClick={save} disabled={saving} className="gap-2">
              {saving && <Loader2 className="h-4 w-4 animate-spin" />} Save radio
            </Button>
            {settings && (
              <Button variant="ghost" onClick={clear}>
                Remove
              </Button>
            )}
          </div>
        </div>
      )}
    </Card>
  );
};

export default ProfileRadio;
