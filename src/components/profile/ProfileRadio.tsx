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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface SavedPlaylist {
  id: string;
  provider: RadioSettings["provider"];
  playlist_url: string;
  embed_url: string;
  title: string | null;
}

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
  const [playlists, setPlaylists] = useState<SavedPlaylist[]>([]);
  const [selectedId, setSelectedId] = useState<string>("new");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [url, setUrl] = useState("");
  const [title, setTitle] = useState("");
  const [routeToStream, setRouteToStream] = useState(false);

  useEffect(() => {
    let active = true;
    (async () => {
      setLoading(true);
      const [{ data }, { data: saved }] = await Promise.all([
        supabase
          .from("profile_radio")
          .select("provider, playlist_url, embed_url, title, is_enabled, route_to_stream")
          .eq("user_id", userId)
          .maybeSingle(),
        // Saved playlists belong to the owner alone — the table is no longer
        // readable by visitors, so they are only fetched on your own profile.
        isOwner
          ? supabase
              .from("profile_radio_playlists")
              .select("id, provider, playlist_url, embed_url, title")
              .eq("user_id", userId)
              .order("created_at", { ascending: false })
          : Promise.resolve({ data: [] }),
      ]);
      if (!active) return;
      setPlaylists((saved ?? []) as SavedPlaylist[]);
      if (data) {
        setSettings(data as RadioSettings);
        setUrl(data.playlist_url ?? "");
        setTitle(data.title ?? "");
        setRouteToStream(!!data.route_to_stream);
        const match = (saved ?? []).find((p) => p.playlist_url === data.playlist_url);
        setSelectedId(match ? match.id : "new");
      } else {
        setSettings(null);
      }
      setLoading(false);
    })();
    return () => {
      active = false;
    };
  }, [userId, isOwner]);

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
    if (error) {
      setSaving(false);
      toast.error(error.message || "Could not save your radio");
      return;
    }

    // Keep the playlist in the owner's saved list so they can switch back to it.
    const existing = playlists.find((p) => p.playlist_url === payload.playlist_url);
    if (existing) {
      await supabase
        .from("profile_radio_playlists")
        .update({ title: payload.title, embed_url: payload.embed_url, provider: payload.provider })
        .eq("id", existing.id);
      setPlaylists((list) =>
        list.map((p) => (p.id === existing.id ? { ...p, title: payload.title, embed_url: payload.embed_url } : p)),
      );
      setSelectedId(existing.id);
    } else {
      const { data: inserted } = await supabase
        .from("profile_radio_playlists")
        .insert({
          user_id: userId,
          provider: payload.provider,
          playlist_url: payload.playlist_url,
          embed_url: payload.embed_url,
          title: payload.title,
        })
        .select("id, provider, playlist_url, embed_url, title")
        .maybeSingle();
      if (inserted) {
        setPlaylists((list) => [inserted as SavedPlaylist, ...list]);
        setSelectedId((inserted as SavedPlaylist).id);
      }
    }

    setSaving(false);
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
            <Label htmlFor="radio-playlist">Playlist</Label>
            <Select
              value={selectedId}
              onValueChange={(value) => {
                setSelectedId(value);
                if (value === "new") {
                  setUrl("");
                  setTitle("");
                  return;
                }
                const found = playlists.find((p) => p.id === value);
                if (found) {
                  setUrl(found.playlist_url);
                  setTitle(found.title ?? "");
                }
              }}
            >
              <SelectTrigger id="radio-playlist">
                <SelectValue placeholder="Choose a playlist" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="new">Add a new playlist…</SelectItem>
                {playlists.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.title || providerLabel[p.provider]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {playlists.length === 0 && (
              <p className="mt-1 text-xs text-muted-foreground">
                No saved playlists yet — add your first one below.
              </p>
            )}
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
