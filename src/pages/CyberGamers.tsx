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
import DracoAI from "@/components/DracoAI";
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

const TOURNAMENTS = [
  { name: "Cyber Strike Championship", date: "Dec 15, 2025", prize: "$5,000" },
  { name: "Neon Racers Grand Prix", date: "Dec 20, 2025", prize: "$3,000" },
  { name: "Gang Wars Tournament", date: "Dec 25, 2025", prize: "$10,000" },
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
  const [gangMembers] = useState<GangMember[]>([
    { id: 1, name: "CyberNinja", rank: "Leader", level: 99, isLive: true },
    { id: 2, name: "PixelWarrior", rank: "Elite", level: 87, isLive: false },
    { id: 3, name: "NeonGhost", rank: "Elite", level: 85, isLive: true },
    { id: 4, name: "DataHunter", rank: "Member", level: 72, isLive: false },
    { id: 5, name: "CodeBreaker", rank: "Member", level: 68, isLive: false },
  ]);

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
      <ArenaStatusChip label={`${TOURNAMENTS.length} tournaments open`} />
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
                {gangMembers.map((member) => (
                  <Card key={member.id} className="p-4 bg-muted/20 border-primary/10">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <Avatar className="w-12 h-12 border-2 border-primary/50">
                          <AvatarImage
                            src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${member.name}`}
                          />
                          <AvatarFallback>{member.name.slice(0, 2)}</AvatarFallback>
                        </Avatar>
                        <div>
                          <h3 className="font-semibold text-foreground">{member.name}</h3>
                          <Badge variant="outline" className="text-xs">
                            {member.rank}
                          </Badge>
                        </div>
                      </div>
                      {member.isLive && (
                        <Badge variant="destructive" className="animate-pulse">
                          <Radio className="w-3 h-3 mr-1" />
                          LIVE
                        </Badge>
                      )}
                    </div>

                    <div className="flex items-center justify-between text-sm text-muted-foreground mb-3">
                      <span className="flex items-center gap-1">
                        <Zap className="w-4 h-4 text-primary" />
                        Level {member.level}
                      </span>
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

            <div className="space-y-4">
              {TOURNAMENTS.map((tournament, idx) => (
                <Card key={idx} className="p-4 bg-muted/20 border-primary/10">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-semibold text-foreground">{tournament.name}</h3>
                      <p className="text-sm text-muted-foreground">{tournament.date}</p>
                    </div>
                    <div className="text-right">
                      <Badge className="bg-primary text-primary-foreground mb-2">
                        {tournament.prize}
                      </Badge>
                      <Button size="sm">Register</Button>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          </Card>
        )}
      </ArenaShell>

      <DracoAI />
    </>
  );
};

export default CyberGamers;
