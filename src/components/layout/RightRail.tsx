import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import FollowButton from "@/components/FollowButton";
import PresenceAvatar from "@/components/profile/PresenceAvatar";
import { useLivePresence } from "@/hooks/useLivePresence";
import { supabase } from "@/integrations/supabase/client";
import { SocialProfile, displayNameOf } from "@/lib/social";
import { Sparkles, TrendingUp } from "lucide-react";

const RightRail = () => {
  const [suggestions, setSuggestions] = useState<SocialProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const liveIds = useLivePresence(suggestions.map((profile) => profile.id));

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      let excluded: string[] = [];
      if (user) {
        const { data: following } = await supabase
          .from("followers")
          .select("following_id")
          .eq("follower_id", user.id);
        excluded = [user.id, ...(following ?? []).map((f) => f.following_id)];
      }
      const query = supabase
        .from("profiles")
        .select("id, username, display_name, avatar_url, is_verified")
        .limit(5);
      const { data } = excluded.length
        ? await query.not("id", "in", `(${excluded.join(",")})`)
        : await query;
      if (!cancelled) {
        const profiles = (data ?? []) as SocialProfile[];
        const ids = profiles.map((profile) => profile.id);
        const { data: live } = ids.length
          ? await supabase.from("live_streams").select("user_id").in("user_id", ids).eq("is_live", true)
          : { data: [] as { user_id: string }[] };
        const liveSet = new Set((live ?? []).map((row) => row.user_id));
        setSuggestions(profiles.sort((a, b) => Number(liveSet.has(b.id)) - Number(liveSet.has(a.id))));
        setLoading(false);
      }
    };
    load();
    return () => { cancelled = true; };
  }, []);

  return (
    <div className="space-y-4">
      <Card className="p-4 bg-card/70 backdrop-blur-sm border-border/60">
        <h3 className="text-sm font-semibold flex items-center gap-2 mb-3">
          <Sparkles className="w-4 h-4 text-primary" /> Who to follow
        </h3>
        {loading ? (
          <div className="space-y-3">
            {[0, 1, 2].map((i) => (
              <div key={i} className="flex items-center gap-3">
                <Skeleton className="h-9 w-9 rounded-full" />
                <div className="flex-1 space-y-1.5">
                  <Skeleton className="h-3 w-24" />
                  <Skeleton className="h-3 w-16" />
                </div>
              </div>
            ))}
          </div>
        ) : suggestions.length === 0 ? (
          <p className="text-xs text-muted-foreground">No new signals to follow right now.</p>
        ) : (
          <div className="space-y-3">
            {suggestions.map((profile) => (
              <div key={profile.id} className="flex items-center gap-3">
                <Link to={`/profile/${profile.id}`} className="shrink-0">
                  <PresenceAvatar src={profile.avatar_url} name={displayNameOf(profile)} size={36} isLive={liveIds.has(profile.id)} />
                </Link>
                <div className="min-w-0 flex-1">
                  <Link to={`/profile/${profile.id}`} className="block truncate text-sm font-medium hover:text-primary">
                    {displayNameOf(profile)}
                  </Link>
                  {profile.username && (
                    <span className="block truncate text-xs text-muted-foreground">@{profile.username}</span>
                  )}
                </div>
                <FollowButton targetUserId={profile.id} />
              </div>
            ))}
          </div>
        )}
      </Card>

      <Card className="p-4 bg-card/70 backdrop-blur-sm border-border/60">
        <h3 className="text-sm font-semibold flex items-center gap-2 mb-3">
          <TrendingUp className="w-4 h-4 text-primary" /> Network pulse
        </h3>
        <ul className="space-y-2 text-sm">
          <li className="text-muted-foreground">
            <Link to="/cyber-arena" className="hover:text-primary">CyberLink Arena · trading tabs</Link>
          </li>
          <li className="text-muted-foreground">
            <Link to="/voyage" className="hover:text-primary">Solar System Voyage · 360° flight</Link>
          </li>
          <li className="text-muted-foreground">
            <Link to="/monetization" className="hover:text-primary">Monetization · creator earnings</Link>
          </li>
          <li className="text-muted-foreground">
            <Link to="/subscription" className="hover:text-primary">Subscription tiers</Link>
          </li>
        </ul>
      </Card>
    </div>
  );
};

export default RightRail;
