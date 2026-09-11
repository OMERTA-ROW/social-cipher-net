import { supabase } from "@/integrations/supabase/client";

export interface LinkPreviewData {
  url: string;
  title: string | null;
  description: string | null;
  image_url: string | null;
  site_name: string | null;
  /** "video" embeds and plays, "image" renders inline, "link" shows a card. */
  media_kind: "video" | "image" | "link";
  embed_url: string | null;
}

const URL_RE = /https?:\/\/[^\s<>"')]+/gi;

export const extractUrls = (text: string): string[] => {
  const found = text.match(URL_RE) ?? [];
  const cleaned = found.map((u) => u.replace(/[.,;:!?]+$/, ""));
  return Array.from(new Set(cleaned));
};

const IMAGE_EXT = /\.(png|jpe?g|gif|webp|avif|svg)(\?.*)?$/i;
const VIDEO_EXT = /\.(mp4|webm|ogg|mov)(\?.*)?$/i;

/** Client-side embed resolution for the well-known players (no network needed). */
export function resolveEmbed(rawUrl: string): LinkPreviewData | null {
  let u: URL;
  try {
    u = new URL(rawUrl);
  } catch {
    return null;
  }
  const host = u.hostname.replace(/^www\./, "");
  const base = {
    url: rawUrl,
    title: null,
    description: null,
    image_url: null,
    site_name: host,
  };

  if (IMAGE_EXT.test(u.pathname)) {
    return { ...base, media_kind: "image", embed_url: rawUrl, image_url: rawUrl };
  }
  if (VIDEO_EXT.test(u.pathname)) {
    return { ...base, media_kind: "video", embed_url: rawUrl };
  }

  if (host === "youtube.com" || host === "m.youtube.com") {
    const id = u.searchParams.get("v") || (u.pathname.startsWith("/shorts/") ? u.pathname.split("/")[2] : null);
    if (id) return { ...base, media_kind: "video", embed_url: `https://www.youtube.com/embed/${id}` };
  }
  if (host === "youtu.be") {
    const id = u.pathname.slice(1);
    if (id) return { ...base, media_kind: "video", embed_url: `https://www.youtube.com/embed/${id}` };
  }
  if (host === "vimeo.com") {
    const id = u.pathname.split("/").filter(Boolean)[0];
    if (id && /^\d+$/.test(id)) {
      return { ...base, media_kind: "video", embed_url: `https://player.vimeo.com/video/${id}` };
    }
  }
  if (host === "open.spotify.com") {
    return { ...base, media_kind: "video", embed_url: `https://open.spotify.com/embed${u.pathname}` };
  }
  if (host === "soundcloud.com") {
    return {
      ...base,
      media_kind: "video",
      embed_url: `https://w.soundcloud.com/player/?url=${encodeURIComponent(rawUrl)}&visual=false`,
    };
  }
  if (host === "twitch.tv" || host === "player.twitch.tv") {
    const channel = u.pathname.split("/").filter(Boolean)[0];
    if (channel) {
      return {
        ...base,
        media_kind: "video",
        embed_url: `https://player.twitch.tv/?channel=${channel}&parent=${window.location.hostname}`,
      };
    }
  }
  return null;
}

const memory = new Map<string, Promise<LinkPreviewData | null>>();

/** Resolves a preview: local embed rules first, then the cached server unfurler. */
export function getLinkPreview(url: string): Promise<LinkPreviewData | null> {
  const local = resolveEmbed(url);
  if (local) return Promise.resolve(local);

  const cached = memory.get(url);
  if (cached) return cached;

  const request = (async (): Promise<LinkPreviewData | null> => {
    try {
      const { data: row } = await supabase
        .from("link_previews")
        .select("url, title, description, image_url, site_name, media_kind, embed_url")
        .eq("url", url)
        .maybeSingle();
      if (row) return row as LinkPreviewData;

      const { data, error } = await supabase.functions.invoke("link-preview", { body: { url } });
      if (error || !data?.preview) return null;
      return data.preview as LinkPreviewData;
    } catch {
      return null;
    }
  })();

  memory.set(url, request);
  return request;
}
