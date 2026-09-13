import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  Facebook,
  Globe,
  Instagram,
  Linkedin,
  Music2,
  Twitch,
  Twitter,
  Youtube,
  type LucideIcon,
} from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface PublicConnection {
  service_id: string;
  account_handle: string | null;
  account_name: string | null;
  health: string | null;
}

/** Public profile page for a handle on each platform. */
const PLATFORMS: Record<string, { label: string; icon: LucideIcon; url: (handle: string) => string }> = {
  x: { label: "X", icon: Twitter, url: (h) => `https://x.com/${h}` },
  instagram: { label: "Instagram", icon: Instagram, url: (h) => `https://instagram.com/${h}` },
  facebook: { label: "Facebook", icon: Facebook, url: (h) => `https://facebook.com/${h}` },
  youtube: { label: "YouTube", icon: Youtube, url: (h) => `https://youtube.com/@${h}` },
  twitch: { label: "Twitch", icon: Twitch, url: (h) => `https://twitch.tv/${h}` },
  tiktok: { label: "TikTok", icon: Music2, url: (h) => `https://tiktok.com/@${h}` },
  linkedin: { label: "LinkedIn", icon: Linkedin, url: (h) => `https://linkedin.com/in/${h}` },
  reddit: { label: "Reddit", icon: Globe, url: (h) => `https://reddit.com/user/${h}` },
  bluesky: { label: "Bluesky", icon: Globe, url: (h) => `https://bsky.app/profile/${h}` },
  kick: { label: "Kick", icon: Globe, url: (h) => `https://kick.com/${h}` },
  snapchat: { label: "Snapchat", icon: Globe, url: (h) => `https://snapchat.com/add/${h}` },
  soundcloud: { label: "SoundCloud", icon: Music2, url: (h) => `https://soundcloud.com/${h}` },
  spotify: { label: "Spotify", icon: Music2, url: (h) => `https://open.spotify.com/user/${h}` },
  medium: { label: "Medium", icon: Globe, url: (h) => `https://medium.com/@${h}` },
  mastodon: { label: "Mastodon", icon: Globe, url: (h) => `https://mastodon.social/@${h}` },
};

const cleanHandle = (raw: string) => raw.trim().replace(/^@+/, "");

/**
 * Small row of icons for the platforms this person has connected. Each links to
 * their profile there. Nothing is shown for platforms without a public handle,
 * so the row is a live picture of what is actually connected.
 */
const ConnectedPlatforms = ({ userId, className = "" }: { userId: string; className?: string }) => {
  const [links, setLinks] = useState<{ id: string; label: string; icon: LucideIcon; url: string; live: boolean }[]>([]);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      const { data, error } = await supabase.rpc("profile_connections", { _user: userId });
      if (cancelled || error || !data) return;
      const rows = data as PublicConnection[];
      setLinks(
        rows.flatMap((row) => {
          const platform = PLATFORMS[row.service_id];
          const handle = row.account_handle ? cleanHandle(row.account_handle) : "";
          if (!platform || !handle) return [];
          return [{
            id: row.service_id,
            label: platform.label,
            icon: platform.icon,
            url: platform.url(handle),
            live: (row.health ?? "healthy") === "healthy",
          }];
        }),
      );
    };
    load();
    return () => { cancelled = true; };
  }, [userId]);

  if (links.length === 0) return null;

  return (
    <TooltipProvider delayDuration={150}>
      <div className={`flex flex-wrap items-center gap-2 ${className}`}>
        {links.map(({ id, label, icon: Icon, url, live }) => (
          <Tooltip key={id}>
            <TooltipTrigger asChild>
              <a
                href={url}
                target="_blank"
                rel="noopener noreferrer me"
                aria-label={`${label} profile`}
                className="group relative inline-flex h-8 w-8 items-center justify-center rounded-full border border-border/60 bg-card/60 text-muted-foreground transition-all hover:border-primary hover:text-primary hover:shadow-[0_0_14px_hsl(var(--glow-primary)/0.45)]"
              >
                <Icon className="h-4 w-4" />
                {live && (
                  <span className="absolute -bottom-0.5 -right-0.5 h-2 w-2 rounded-full bg-primary shadow-[0_0_8px_hsl(var(--glow-primary)/0.8)]" />
                )}
              </a>
            </TooltipTrigger>
            <TooltipContent>{label}</TooltipContent>
          </Tooltip>
        ))}
      </div>
    </TooltipProvider>
  );
};

export default ConnectedPlatforms;
