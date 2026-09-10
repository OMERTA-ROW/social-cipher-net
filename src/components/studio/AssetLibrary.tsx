import { useCallback, useEffect, useRef, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Upload, Music, Image as ImageIcon, Film, Trash2, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

interface StudioAsset {
  id: string;
  name: string;
  asset_type: string;
  url: string;
  source: string;
  created_at: string;
}

const typeIcon = (type: string) =>
  type === "audio" ? (
    <Music className="w-4 h-4 text-primary" />
  ) : type === "video" ? (
    <Film className="w-4 h-4 text-primary" />
  ) : (
    <ImageIcon className="w-4 h-4 text-primary" />
  );

const guessType = (mime: string) =>
  mime.startsWith("audio/") ? "audio" : mime.startsWith("video/") ? "video" : "image";

interface AssetLibraryProps {
  userId: string | null;
}

const AssetLibrary = ({ userId }: AssetLibraryProps) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const [assets, setAssets] = useState<StudioAsset[]>([]);
  const [previews, setPreviews] = useState<Record<string, string>>({});
  const [uploading, setUploading] = useState(false);
  const [filter, setFilter] = useState("");

  const load = useCallback(async () => {
    if (!userId) return;
    const { data } = await supabase
      .from("studio_assets")
      .select("id, name, asset_type, url, source, created_at")
      .order("created_at", { ascending: false })
      .limit(100);

    const rows = (data ?? []) as StudioAsset[];
    setAssets(rows);

    // Uploaded files live in a private bucket, so sign them for preview.
    const stored = rows.filter((a) => a.source === "upload");
    const signed: Record<string, string> = {};
    await Promise.all(
      stored.map(async (a) => {
        const { data: url } = await supabase.storage
          .from("studio-assets")
          .createSignedUrl(a.url, 3600);
        if (url?.signedUrl) signed[a.id] = url.signedUrl;
      }),
    );
    setPreviews(signed);
  }, [userId]);

  useEffect(() => {
    load();
  }, [load]);

  const upload = async (files: FileList | null) => {
    if (!files || !userId) return;
    setUploading(true);
    try {
      for (const file of Array.from(files).slice(0, 10)) {
        const path = `${userId}/${crypto.randomUUID()}-${file.name.replace(/[^\w.\-]/g, "_")}`;
        const { error: uploadError } = await supabase.storage
          .from("studio-assets")
          .upload(path, file);
        if (uploadError) throw uploadError;

        const { error } = await supabase.from("studio_assets").insert({
          user_id: userId,
          name: file.name.slice(0, 160),
          asset_type: guessType(file.type),
          url: path,
          source: "upload",
        });
        if (error) throw error;
      }
      toast.success("Added to your library");
      load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Upload failed");
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  const remove = async (asset: StudioAsset) => {
    if (asset.source === "upload") {
      await supabase.storage.from("studio-assets").remove([asset.url]);
    }
    await supabase.from("studio_assets").delete().eq("id", asset.id);
    toast.success("Removed");
    load();
  };

  const visible = assets.filter(
    (a) => filter.trim() === "" || a.name.toLowerCase().includes(filter.toLowerCase()),
  );

  return (
    <Card className="p-4 bg-card/50 backdrop-blur border-primary/20">
      <div className="flex flex-wrap items-center gap-2 mb-4">
        <h3 className="text-lg font-bold text-foreground mr-auto">Asset library</h3>
        <Input
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          placeholder="Search assets"
          className="max-w-[200px] h-9"
        />
        <input
          ref={inputRef}
          type="file"
          multiple
          accept="image/*,audio/*,video/*"
          className="hidden"
          onChange={(e) => upload(e.target.files)}
        />
        <Button
          size="sm"
          onClick={() => inputRef.current?.click()}
          disabled={uploading || !userId}
        >
          {uploading ? (
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
          ) : (
            <Upload className="w-4 h-4 mr-2" />
          )}
          Upload
        </Button>
      </div>

      {visible.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          Nothing here yet. Upload images, audio or video, or import from a connected
          creative account.
        </p>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
          {visible.map((asset) => {
            const src = previews[asset.id] ?? asset.url;
            return (
              <Card
                key={asset.id}
                className="p-2 bg-muted/20 border-primary/10 flex flex-col"
              >
                <div className="aspect-square rounded bg-black/40 mb-2 overflow-hidden flex items-center justify-center">
                  {asset.asset_type === "image" && src ? (
                    <img
                      src={src}
                      alt={asset.name}
                      loading="lazy"
                      className="w-full h-full object-cover"
                    />
                  ) : asset.asset_type === "video" && src ? (
                    <video src={src} className="w-full h-full object-cover" controls />
                  ) : (
                    typeIcon(asset.asset_type)
                  )}
                </div>
                {asset.asset_type === "audio" && src && (
                  <audio src={src} controls className="w-full mb-1 h-8" />
                )}
                <p className="text-xs text-foreground truncate">{asset.name}</p>
                <div className="flex items-center gap-1 mt-1">
                  <Badge variant="outline" className="text-[10px] capitalize">
                    {asset.source}
                  </Badge>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="ml-auto h-6 w-6"
                    onClick={() => remove(asset)}
                    aria-label={`Remove ${asset.name}`}
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </Card>
  );
};

export default AssetLibrary;
