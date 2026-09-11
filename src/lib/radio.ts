export type RadioProvider = "spotify" | "apple" | "soundcloud" | "youtube" | "link";

export interface RadioSettings {
  provider: RadioProvider;
  playlist_url: string | null;
  embed_url: string | null;
  title: string | null;
  is_enabled: boolean;
  route_to_stream: boolean;
}

/** Turns a pasted playlist/album/track link into an embeddable player URL. */
export function toEmbedUrl(raw: string): { provider: RadioProvider; embed: string } | null {
  let u: URL;
  try {
    u = new URL(raw.trim());
  } catch {
    return null;
  }
  const host = u.hostname.replace(/^www\./, "").toLowerCase();

  if (host === "open.spotify.com") {
    return { provider: "spotify", embed: `https://open.spotify.com/embed${u.pathname}?theme=0` };
  }
  if (host === "music.apple.com") {
    return {
      provider: "apple",
      embed: `https://embed.music.apple.com${u.pathname}${u.search}`,
    };
  }
  if (host === "soundcloud.com") {
    return {
      provider: "soundcloud",
      embed: `https://w.soundcloud.com/player/?url=${encodeURIComponent(raw)}&visual=false&color=%230ea5e9`,
    };
  }
  if (host === "youtube.com" || host === "m.youtube.com") {
    const list = u.searchParams.get("list");
    const v = u.searchParams.get("v");
    if (list) return { provider: "youtube", embed: `https://www.youtube.com/embed/videoseries?list=${list}` };
    if (v) return { provider: "youtube", embed: `https://www.youtube.com/embed/${v}` };
  }
  if (host === "youtu.be") {
    const id = u.pathname.slice(1);
    if (id) return { provider: "youtube", embed: `https://www.youtube.com/embed/${id}` };
  }
  if (/\.(mp3|m4a|ogg|wav)(\?.*)?$/i.test(u.pathname)) {
    return { provider: "link", embed: raw };
  }
  return null;
}

export const providerLabel: Record<RadioProvider, string> = {
  spotify: "Spotify",
  apple: "Apple Music",
  soundcloud: "SoundCloud",
  youtube: "YouTube Music",
  link: "Direct link",
};
