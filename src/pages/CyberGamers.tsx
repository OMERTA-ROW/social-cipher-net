import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import PresenceAvatar from "@/components/profile/PresenceAvatar";
import { Input } from "@/components/ui/input";
import { Gamepad2, Users, Radio, Trophy, Zap, Search, Save } from "lucide-react";
import FloatingWindow from "@/components/FloatingWindow";
import { useFloatingWindowsContext } from "@/providers/FloatingWindowsProvider";
import { useNavigate } from "react-router-dom";
import { TokenPoolManager } from "@/components/TokenPoolManager";
import { PageTabManager } from "@/components/PageTabManager";
import { useSavedTabs } from "@/hooks/useSavedTabs";
import { SavedTabsManager } from "@/components/SavedTabsManager";
import { supabase } from "@/integrations/supabase/client";
import { ArenaAccountLinks } from "@/components/arena/ArenaAccount";
import ArenaShell, { ArenaStatusChip } from "@/components/arena/ArenaShell";

interface GangMember {
  id: string;
  name: string;
  avatarUrl: string | null;
  isLive: boolean;
  streamId: string | null;
}

const TRADING_PLATFORMS = [
  { name: "TradingView", url: "https://www.tradingview.com/chart/" },
  { name: "Binance", url: "https://www.binance.com/en/trade/" },
  { name: "Coinbase Pro", url: "https://pro.coinbase.com/trade/" },
  { name: "Kraken", url: "https://www.kraken.com/charts" },
  { name: "KuCoin", url: "https://www.kucoin.com/trade/" },
  { name: "Yahoo Finance", url: "https://finance.yahoo.com/chart/" },
  { name: "Robinhood", url: "https://robinhood.com/" },
  { name: "Interactive Brokers", url: "https://www.interactivebrokers.com/" },
];

const SECTIONS = [
  { id: "saved-tabs", label: "My Tabs", icon: <Save className="w-5 h-5" /> },
  { id: "pools", label: "Token Pools", icon: <Trophy className="w-5 h-5" /> },
  { id: "gang", label: "Gang", icon: <Users className="w-5 h-5" /> },
  { id: "games", label: "Games", icon: <Gamepad2 className="w-5 h-5" /> },
  { id: "tournaments", label: "Tournaments", icon: <Trophy className="w-5 h-5" /> },
];

const CyberGamers = () => {
  const navigate = useNavigate();
  const { openWindow } = useFloatingWindowsContext();
  const { saveTab } = useSavedTabs();
  const [searchQuery, setSearchQuery] = useState("");
  const [section, setSection] = useState("saved-tabs");
  // Gang members are the accounts this user actually follows. Nothing is
  // pre-populated: with no follows the section shows a genuine empty state.
  const [gangMembers, setGangMembers] = useState<GangMember[]>([]);

  useEffect(() => {
    let cancelled = false;
    const loadGang = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: follows } = await supabase
        .from("followers")
        .select("following_id")
        .eq("follower_id", user.id);
      const ids = (follows ?? []).map((f: { following_id: string }) => f.following_id);
      if (ids.length === 0) {
        if (!cancelled) setGangMembers([]);
        return;
      }

      const [{ data: profiles }, { data: live }] = await Promise.all([
        supabase.from("profiles").select("id, username, display_name, avatar_url").in("id", ids),
        supabase.from("live_streams").select("id, user_id").in("user_id", ids).eq("is_live", true),
      ]);
      const liveByUser = new Map((live ?? []).map((l: { id: string; user_id: string }) => [l.user_id, l.id]));
      if (!cancelled) {
        setGangMembers(
          (profiles ?? []).map((p: any) => ({
            id: p.id,
            name: p.display_name || p.username || "Member",
            avatarUrl: p.avatar_url ?? null,
            isLive: liveByUser.has(p.id),
            streamId: liveByUser.get(p.id) ?? null,
          })),
        );
      }
    };
    loadGang();
    return () => {
      cancelled = true;
    };
  }, []);

  const launch = async (tabName: string, tabUrl: string, source: string) => {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (user) {
      saveTab({
        tab_name: tabName,
        tab_url: tabUrl,
        tab_type: "trading_platform",
        metadata: { source },
      });
    }

    openWindow(
      tabName,
      <iframe src={tabUrl} className="w-full h-full border-0" title={tabName} />,
      1200,
      800,
    );
  };

  const handleSearchSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;

    const platform = TRADING_PLATFORMS.find((p) =>
      p.name.toLowerCase().includes(searchQuery.toLowerCase()),
    );

    const tabName = platform ? platform.name : searchQuery;
    const tabUrl = platform
      ? platform.url
      : searchQuery.startsWith("http")
        ? searchQuery
        : "https://" + searchQuery;

    await launch(tabName, tabUrl, "arena_search");
    setSearchQuery("");
  };

  const liveCount = gangMembers.filter((m) => m.isLive).length;

  const commandBar = (
    <form onSubmit={handleSearchSubmit} className="relative max-w-xl mx-auto">
      <Input
        type="text"
        placeholder="Search platforms or enter a URL..."
        value={searchQuery}
        onChange={(e) => setSearchQuery(e.target.value)}
        className="w-full pr-12 bg-background/95 backdrop-blur-sm border-primary/30 focus:border-primary"
      />
      <Button
        type="submit"
        size="icon"
        className="absolute right-1 top-1/2 -translate-y-1/2"
        variant="ghost"
        aria-label="Open"
      >
        <Search className="w-4 h-4" />
      </Button>
    </form>
  );

  const status = (
    <>
      <ArenaAccountLinks />
      <ArenaStatusChip label={`${liveCount} live`} tone="live" />
      <ArenaStatusChip label={`${gangMembers.length} gang members`} />
      <div className="flex flex-wrap gap-2 ml-auto">
        {TRADING_PLATFORMS.slice(0, 5).map((platform) => (
          <Button
            key={platform.name}
            size="sm"
            variant="outline"
            onClick={() => launch(platform.name, platform.url, "quick_access")}
            className="h-7 text-xs backdrop-blur-sm bg-background/80 border-primary/20 hover:border-primary/50"
          >
            {platform.name}
          </Button>
        ))}
      </div>
    </>
  );

  return (
    <>
      <PageTabManager />
      <ArenaShell
        sections={SECTIONS}
        activeSection={section}
        onSectionChange={setSection}
        commandBar={commandBar}
        status={status}
      >
        {section === "saved-tabs" && <SavedTabsManager />}

        {section === "pools" && <TokenPoolManager />}

        {section === "gang" && (
          <div className="space-y-6">
            <Card className="p-6 bg-card/50 backdrop-blur border-primary/20">
              <h2 className="text-2xl font-bold text-foreground mb-4 flex items-center gap-2">
                <Users className="w-6 h-6 text-primary" />
                Gang Members
              </h2>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {gangMembers.length === 0 && (
                  <p className="text-sm text-muted-foreground">
                    No gang members yet. Follow other players to see them here.
                  </p>
                )}
                {gangMembers.map((member) => (
                  <Card key={member.id} className="p-4 bg-muted/20 border-primary/10">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <PresenceAvatar src={member.avatarUrl} name={member.name} size={48} isLive={member.isLive} />
                        <div>
                          <h3 className="font-semibold text-foreground">{member.name}</h3>
                        </div>
                      </div>
                      {member.isLive && (
                        <Badge variant="destructive" className="animate-pulse">
                          <Radio className="w-3 h-3 mr-1" />
                          LIVE
                        </Badge>
                      )}
                    </div>

                    <Button
                      onClick={() => navigate(member.streamId ? `/live/${member.streamId}` : `/profile/${member.id}`)}
                      variant={member.isLive ? "default" : "outline"}
                      className="w-full"
                    >
                      {member.isLive ? "Watch Stream" : "View Profile"}
                    </Button>
                  </Card>
                ))}
              </div>
            </Card>

            <Card className="p-6 bg-card/50 backdrop-blur border-primary/20">
              <h3 className="text-xl font-bold text-foreground mb-4">
                CyberLink Live Integration
              </h3>
              <p className="text-muted-foreground mb-4">
                Gang members can stream their gameplay directly on CyberLink Live.
                Click the button below to start your own gaming stream!
              </p>
              <Button onClick={() => navigate("/studio")} className="glow-primary">
                <Radio className="w-4 h-4 mr-2" />
                Go Live Now
              </Button>
            </Card>
          </div>
        )}

        {section === "games" && (
          <Card className="p-8 text-center bg-card/50 backdrop-blur border-primary/20">
            <Gamepad2 className="mx-auto mb-3 h-10 w-10 text-primary" />
            <h2 className="text-lg font-semibold">No connected games</h2>
            <p className="mt-1 text-sm text-muted-foreground">Games appear here only after a supported service is connected.</p>
            <Button variant="outline" className="mt-4" onClick={() => navigate("/connectors")}>Open Connectors</Button>
          </Card>
        )}

        {section === "tournaments" && (
          <Card className="p-6 bg-card/50 backdrop-blur border-primary/20">
            <h2 className="text-2xl font-bold text-foreground mb-4 flex items-center gap-2">
              <Trophy className="w-6 h-6 text-primary" />
              Upcoming Tournaments
            </h2>

            <p className="text-sm text-muted-foreground">
              No tournaments scheduled yet.
            </p>
          </Card>
        )}
      </ArenaShell>

    </>
  );
};

export default CyberGamers;
