import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
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
import ArenaShell, { ArenaStatusChip } from "@/components/arena/ArenaShell";

interface GangMember {
  id: number;
  name: string;
  rank: string;
  level: number;
  isLive: boolean;
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
        supabase.from("live_streams").select("user_id").in("user_id", ids).eq("is_live", true),
      ]);
      const liveIds = new Set((live ?? []).map((l: { user_id: string }) => l.user_id));
      if (!cancelled) {
        setGangMembers(
          (profiles ?? []).map((p: any) => ({
            id: p.id,
            name: p.display_name || p.username || "Member",
            avatarUrl: p.avatar_url ?? null,
            isLive: liveIds.has(p.id),
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
                        <Avatar className="w-12 h-12 border-2 border-primary/50">
                          <AvatarImage src={member.avatarUrl ?? undefined} />
                          <AvatarFallback>{member.name.slice(0, 2)}</AvatarFallback>
                        </Avatar>
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
                      onClick={() => navigate("/studio")}
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
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[
              "Cyber Strike",
              "Neon Racers",
              "Digital Warfare",
              "Pixel Legends",
              "Code Combat",
              "Virtual Arena",
            ].map((game, idx) => (
              <Card
                key={idx}
                className="p-6 bg-card/50 backdrop-blur border-primary/20 hover:border-primary/50 transition-colors"
              >
                <div className="aspect-video bg-muted/20 rounded-lg mb-4 flex items-center justify-center">
                  <Gamepad2 className="w-16 h-16 text-primary" />
                </div>
                <h3 className="text-lg font-bold text-foreground mb-2">{game}</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Join the action and compete with gang members
                </p>
                <Button variant="outline" className="w-full">
                  Play Now
                </Button>
              </Card>
            ))}
          </div>
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
