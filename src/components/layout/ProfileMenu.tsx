import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { LogOut, Settings, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useEngagementStats } from "@/hooks/useEngagementStats";
import { supabase } from "@/integrations/supabase/client";
import { signInPath } from "@/lib/authRedirect";

interface AccountProfile {
  display_name: string | null;
  username: string | null;
}

const ProfileMenu = () => {
  const navigate = useNavigate();
  const { stats, userId } = useEngagementStats();
  const [profile, setProfile] = useState<AccountProfile | null>(null);

  useEffect(() => {
    if (!userId) {
      setProfile(null);
      return;
    }
    let active = true;
    supabase
      .from("profiles")
      .select("display_name, username")
      .eq("id", userId)
      .maybeSingle()
      .then(({ data }) => {
        if (active) setProfile((data as AccountProfile | null) ?? null);
      });
    return () => {
      active = false;
    };
  }, [userId]);

  if (!userId) {
    return (
      <Button variant="ghost" size="icon" title="Log in" onClick={() => navigate(signInPath())}>
        <User className="h-5 w-5" />
      </Button>
    );
  }

  const items = stats
    ? [
        { label: "Posts", value: stats.posts },
        { label: "Likes", value: stats.likes },
        { label: "Replies", value: stats.replies },
        { label: "Followers", value: stats.followers },
        { label: "Following", value: stats.following },
        { label: "Engagement", value: stats.engagement },
      ]
    : [];
  const displayName = profile?.display_name || profile?.username || "My account";

  const signOut = async () => {
    await supabase.auth.signOut();
    navigate(signInPath());
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" title="Account menu" aria-label="Account menu">
          <User className="h-5 w-5" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-[min(22rem,calc(100vw-1rem))] p-2">
        <div className="px-2 py-2">
          <p className="truncate font-semibold">{displayName}</p>
          {profile?.username && <p className="truncate text-sm text-muted-foreground">@{profile.username}</p>}
        </div>
        {items.length > 0 && (
          <div className="grid grid-cols-3 gap-x-2 gap-y-3 border-y border-border/60 px-2 py-3">
            {items.map((item) => (
              <div key={item.label} className="min-w-0 text-center leading-tight">
                <div className="text-xs font-semibold tabular-nums text-foreground">{item.value.toLocaleString()}</div>
                <div className="truncate text-[10px] uppercase text-muted-foreground">{item.label}</div>
              </div>
            ))}
          </div>
        )}
        <DropdownMenuItem onSelect={() => navigate(`/profile/${userId}`)} className="mt-1 gap-2">
          <User className="h-4 w-4" /> View profile
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={() => navigate("/dashboard?tab=settings")} className="gap-2">
          <Settings className="h-4 w-4" /> Account settings
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onSelect={signOut} className="gap-2">
          <LogOut className="h-4 w-4" /> Sign out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export default ProfileMenu;