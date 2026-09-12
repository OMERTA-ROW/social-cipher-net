import { useCallback, useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { ArrowLeft, FolderPlus, Images, Loader2, Play, Upload } from "lucide-react";

interface MediaRow {
  id: string;
  media_url: string;
  media_type: string;
  caption: string | null;
  album_id: string | null;
  created_at: string;
}

interface AlbumRow {
  id: string;
  title: string;
  description: string | null;
  cover_url: string | null;
}

interface ProfileMediaProps {
  /** The profile being viewed. */
  userId: string;
  /** True when the viewer owns this profile (enables uploads/albums). */
  isOwner: boolean;
}

const PAGE_SIZE = 24;

const ProfileMedia = ({ userId, isOwner }: ProfileMediaProps) => {
  const [media, setMedia] = useState<MediaRow[]>([]);
  const [albums, setAlbums] = useState<AlbumRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [openAlbum, setOpenAlbum] = useState<AlbumRow | null>(null);
  const [lightbox, setLightbox] = useState<MediaRow | null>(null);
  const [uploading, setUploading] = useState(false);
  const [albumTitle, setAlbumTitle] = useState("");
  const [albumDescription, setAlbumDescription] = useState("");
  const [albumDialogOpen, setAlbumDialogOpen] = useState(false);
  const [uploadAlbumId, setUploadAlbumId] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const sentinelRef = useRef<HTMLDivElement>(null);

  const load = useCallback(
    async (offset: number) => {
      const { data, error } = await supabase
        .from("profile_media")
        .select("id, media_url, media_type, caption, album_id, created_at")
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .range(offset, offset + PAGE_SIZE - 1);
      if (error) {
        toast.error("Could not load media");
        return [];
      }
      return (data ?? []) as MediaRow[];
    },
    [userId],
  );

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    (async () => {
      const [rows, albumRes] = await Promise.all([
        load(0),
        supabase
          .from("profile_albums")
          .select("id, title, description, cover_url")
          .eq("user_id", userId)
          .order("created_at", { ascending: false }),
      ]);
      if (cancelled) return;
      setMedia(rows);
      setHasMore(rows.length === PAGE_SIZE);
      setAlbums((albumRes.data ?? []) as AlbumRow[]);
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [userId, load]);

  // Infinite scroll within the media tab.
  useEffect(() => {
    const el = sentinelRef.current;
    if (!el || loading || !hasMore) return;
    const observer = new IntersectionObserver(
      async (entries) => {
        if (!entries[0].isIntersecting || loadingMore) return;
        setLoadingMore(true);
        const rows = await load(media.length);
        setMedia((prev) => [...prev, ...rows]);
        setHasMore(rows.length === PAGE_SIZE);
        setLoadingMore(false);
      },
      { rootMargin: "600px" },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [load, media.length, loading, loadingMore, hasMore]);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    if (!files.length) return;
    setUploading(true);
    const inserted: MediaRow[] = [];
    for (const file of files) {
      const isVideo = file.type.startsWith("video/");
      const ext = file.name.split(".").pop() ?? "bin";
      const path = `${userId}/media-${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
      const { error: upErr } = await supabase.storage.from("post-media").upload(path, file);
      if (upErr) {
        toast.error(upErr.message);
        continue;
      }
      const {
        data: { publicUrl },
      } = supabase.storage.from("post-media").getPublicUrl(path);
      const { data, error } = await supabase
        .from("profile_media")
        .insert({
          user_id: userId,
          media_url: publicUrl,
          media_type: isVideo ? "video" : "image",
          album_id: uploadAlbumId,
        })
        .select("id, media_url, media_type, caption, album_id, created_at")
        .single();
      if (error) {
        toast.error(error.message);
        continue;
      }
      inserted.push(data as MediaRow);
    }
    if (inserted.length) {
      setMedia((prev) => [...inserted, ...prev]);
      toast.success(`${inserted.length} item${inserted.length > 1 ? "s" : ""} published`);
    }
    setUploading(false);
    if (fileRef.current) fileRef.current.value = "";
  };

  const createAlbum = async () => {
    if (!albumTitle.trim()) return;
    const { data, error } = await supabase
      .from("profile_albums")
      .insert({ user_id: userId, title: albumTitle.trim(), description: albumDescription.trim() || null })
      .select("id, title, description, cover_url")
      .single();
    if (error) {
      toast.error(error.message);
      return;
    }
    setAlbums((prev) => [data as AlbumRow, ...prev]);
    setAlbumTitle("");
    setAlbumDescription("");
    setAlbumDialogOpen(false);
    toast.success("Album created");
  };

  const photos = media.filter((m) => m.media_type !== "video");
  const videos = media.filter((m) => m.media_type === "video");

  const Tile = ({ item }: { item: MediaRow }) => (
    <button
      type="button"
      onClick={() => setLightbox(item)}
      className="relative aspect-square overflow-hidden rounded-lg border border-border/40 bg-muted/20 group"
    >
      {item.media_type === "video" ? (
        <>
          <video src={item.media_url} className="h-full w-full object-contain" muted preload="metadata" />
          <span className="absolute inset-0 flex items-center justify-center bg-background/30">
            <Play className="w-6 h-6 text-primary" />
          </span>
        </>
      ) : (
        <img
          src={item.media_url}
          alt={item.caption ?? "Profile media"}
          loading="lazy"
          className="h-full w-full object-contain transition-transform duration-200"
        />
      )}
    </button>
  );

  const Grid = ({ items, empty }: { items: MediaRow[]; empty: string }) =>
    items.length === 0 ? (
      <p className="text-sm text-muted-foreground py-8 text-center">{empty}</p>
    ) : (
      <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
        {items.map((item) => (
          <Tile key={item.id} item={item} />
        ))}
      </div>
    );

  if (openAlbum) {
    const albumItems = media.filter((m) => m.album_id === openAlbum.id);
    return (
      <Card className="p-6 bg-background/80 backdrop-blur-sm border-border/50">
        <div className="flex items-center gap-2 mb-4">
          <Button size="sm" variant="ghost" onClick={() => setOpenAlbum(null)} className="gap-1">
            <ArrowLeft className="w-4 h-4" /> Back
          </Button>
          <h3 className="font-semibold">{openAlbum.title}</h3>
        </div>
        {openAlbum.description && (
          <p className="text-sm text-muted-foreground mb-4">{openAlbum.description}</p>
        )}
        <Grid items={albumItems} empty="This album is empty." />
        {isOwner && (
          <Button
            size="sm"
            variant="outline"
            className="mt-4 gap-1"
            disabled={uploading}
            onClick={() => {
              setUploadAlbumId(openAlbum.id);
              fileRef.current?.click();
            }}
          >
            {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
            Add to album
          </Button>
        )}
        <input
          ref={fileRef}
          type="file"
          accept="image/*,video/*"
          multiple
          className="hidden"
          onChange={handleUpload}
        />
      </Card>
    );
  }

  return (
    <Card className="p-6 bg-background/80 backdrop-blur-sm border-border/50">
      <div className="flex items-center justify-between gap-2 mb-4 flex-wrap">
        <h2 className="text-lg font-semibold flex items-center gap-2">
          <Images className="w-4 h-4 text-primary" /> Media
        </h2>
        {isOwner && (
          <div className="flex gap-2">
            <Dialog open={albumDialogOpen} onOpenChange={setAlbumDialogOpen}>
              <DialogTrigger asChild>
                <Button size="sm" variant="outline" className="gap-1">
                  <FolderPlus className="w-4 h-4" /> New album
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Create album</DialogTitle>
                </DialogHeader>
                <div className="space-y-3">
                  <div>
                    <Label htmlFor="album-title">Title</Label>
                    <Input
                      id="album-title"
                      value={albumTitle}
                      onChange={(e) => setAlbumTitle(e.target.value)}
                      placeholder="Album name"
                    />
                  </div>
                  <div>
                    <Label htmlFor="album-desc">Description</Label>
                    <Textarea
                      id="album-desc"
                      value={albumDescription}
                      onChange={(e) => setAlbumDescription(e.target.value)}
                      rows={3}
                    />
                  </div>
                  <Button onClick={createAlbum} className="w-full">
                    Create
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
            <Button
              size="sm"
              className="gap-1"
              disabled={uploading}
              onClick={() => {
                setUploadAlbumId(null);
                fileRef.current?.click();
              }}
            >
              {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
              Upload
            </Button>
          </div>
        )}
      </div>

      <input
        ref={fileRef}
        type="file"
        accept="image/*,video/*"
        multiple
        className="hidden"
        onChange={handleUpload}
      />

      {loading ? (
        <div className="py-10 flex justify-center">
          <Loader2 className="w-5 h-5 animate-spin text-primary" />
        </div>
      ) : (
        <Tabs defaultValue="all">
          <TabsList className="mb-4">
            <TabsTrigger value="all">All</TabsTrigger>
            <TabsTrigger value="photos">Photos</TabsTrigger>
            <TabsTrigger value="albums">Albums</TabsTrigger>
            <TabsTrigger value="videos">Videos</TabsTrigger>
          </TabsList>
          <TabsContent value="all">
            <Grid items={media} empty="No photos or videos yet." />
          </TabsContent>
          <TabsContent value="photos">
            <Grid items={photos} empty="No photos yet." />
          </TabsContent>
          <TabsContent value="videos">
            <Grid items={videos} empty="No videos yet." />
          </TabsContent>
          <TabsContent value="albums">
            {albums.length === 0 ? (
              <p className="text-sm text-muted-foreground py-8 text-center">No albums yet.</p>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {albums.map((album) => {
                  const items = media.filter((m) => m.album_id === album.id);
                  const cover = album.cover_url ?? items.find((i) => i.media_type !== "video")?.media_url;
                  return (
                    <button
                      key={album.id}
                      type="button"
                      onClick={() => setOpenAlbum(album)}
                      className="text-left rounded-lg overflow-hidden border border-border/40 bg-muted/10 hover:border-primary/50 transition-colors"
                    >
                      <div className="aspect-video bg-muted/20">
                        {cover ? (
                           <img src={cover} alt={album.title} loading="lazy" className="h-full w-full object-contain" />
                        ) : (
                          <div className="h-full w-full flex items-center justify-center">
                            <Images className="w-5 h-5 text-muted-foreground" />
                          </div>
                        )}
                      </div>
                      <div className="p-2">
                        <p className="text-sm font-medium truncate">{album.title}</p>
                        <p className="text-xs text-muted-foreground">{items.length} items</p>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </TabsContent>
        </Tabs>
      )}

      <div ref={sentinelRef} className="h-4" />
      {loadingMore && (
        <div className="py-3 flex justify-center">
          <Loader2 className="w-4 h-4 animate-spin text-primary" />
        </div>
      )}

      <Dialog open={!!lightbox} onOpenChange={(open) => !open && setLightbox(null)}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle className="text-sm font-normal text-muted-foreground">
              {lightbox?.caption ?? "Media"}
            </DialogTitle>
          </DialogHeader>
          {lightbox &&
            (lightbox.media_type === "video" ? (
              <video src={lightbox.media_url} controls className="w-full rounded-lg" />
            ) : (
              <img src={lightbox.media_url} alt={lightbox.caption ?? "Media"} className="w-full rounded-lg" />
            ))}
        </DialogContent>
      </Dialog>
    </Card>
  );
};

export default ProfileMedia;
