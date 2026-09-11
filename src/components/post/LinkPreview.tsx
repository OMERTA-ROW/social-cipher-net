import { useEffect, useState } from "react";
import { ExternalLink } from "lucide-react";
import { getLinkPreview, LinkPreviewData } from "@/lib/links";

interface Props {
  url: string;
  compact?: boolean;
}

/**
 * Renders a pasted link: videos embed and play, images render inline,
 * anything else becomes a title/description/thumbnail card.
 */
const LinkPreview = ({ url, compact = false }: Props) => {
  const [preview, setPreview] = useState<LinkPreviewData | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let active = true;
    setPreview(null);
    setFailed(false);
    getLinkPreview(url)
      .then((p) => {
        if (!active) return;
        if (p) setPreview(p);
        else setFailed(true);
      })
      .catch(() => active && setFailed(true));
    return () => {
      active = false;
    };
  }, [url]);

  if (failed || !preview) return null;

  const stop = (e: React.MouseEvent) => e.stopPropagation();

  if (preview.media_kind === "image" && (preview.embed_url || preview.image_url)) {
    return (
      <a
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        onClick={stop}
        className="block mt-3 rounded-lg overflow-hidden border border-border/60 bg-secondary/40"
      >
        <img
          src={preview.embed_url ?? preview.image_url ?? ""}
          alt={preview.title ?? "Linked image"}
          loading="lazy"
          className="w-full max-h-[520px] object-contain"
        />
      </a>
    );
  }

  if (preview.media_kind === "video" && preview.embed_url) {
    const isFile = /\.(mp4|webm|ogg|mov)(\?.*)?$/i.test(preview.embed_url);
    return (
      <div
        onClick={stop}
        className="mt-3 rounded-lg overflow-hidden border border-border/60 bg-black/60"
      >
        {isFile ? (
          <video src={preview.embed_url} controls className="w-full max-h-[520px] object-contain" />
        ) : (
          <div className="relative w-full aspect-video">
            <iframe
              src={preview.embed_url}
              title={preview.title ?? "Embedded media"}
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; fullscreen"
              allowFullScreen
              loading="lazy"
              className="absolute inset-0 h-full w-full border-0"
            />
          </div>
        )}
      </div>
    );
  }

  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      onClick={stop}
      className="mt-3 flex gap-3 rounded-lg border border-border/60 bg-secondary/30 overflow-hidden hover:border-primary/50 transition-colors"
    >
      {preview.image_url && (
        <div className={compact ? "w-20 shrink-0" : "w-32 shrink-0"}>
          <img
            src={preview.image_url}
            alt=""
            loading="lazy"
            className="h-full w-full object-cover"
          />
        </div>
      )}
      <div className="min-w-0 flex-1 p-3">
        <div className="flex items-center gap-1 text-[11px] uppercase tracking-wider text-muted-foreground">
          <ExternalLink className="h-3 w-3" />
          <span className="truncate">{preview.site_name}</span>
        </div>
        <p className="mt-1 font-medium text-foreground line-clamp-2">{preview.title}</p>
        {preview.description && (
          <p className="mt-1 text-sm text-muted-foreground line-clamp-2">{preview.description}</p>
        )}
      </div>
    </a>
  );
};

export default LinkPreview;
