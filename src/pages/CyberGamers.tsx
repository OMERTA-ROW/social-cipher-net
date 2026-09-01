import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { Gamepad2, Users, Radio, Trophy, Zap, Search, Save } from "lucide-react";
import Navigation from "@/components/Navigation";
import FloatingWindow from "@/components/FloatingWindow";
import { useFloatingWindowsContext } from "@/providers/FloatingWindowsProvider";
import { useNavigate } from "react-router-dom";
import { TokenPoolManager } from "@/components/TokenPoolManager";
import { PageTabManager } from "@/components/PageTabManager";
import DracoAI from "@/components/DracoAI";
import { toast } from "sonner";
import { useSavedTabs } from "@/hooks/useSavedTabs";
import { SavedTabsManager } from "@/components/SavedTabsManager";
import { supabase } from "@/integrations/supabase/client";

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

const CyberGamers = () => {
  const navigate = useNavigate();
  const { openWindow } = useFloatingWindowsContext();
  const { saveTab, savedTabs } = useSavedTabs();
  const [searchQuery, setSearchQuery] = useState("");
  const [gangMembers] = useState<GangMember[]>([
    { id: 1, name: "CyberNinja", rank: "Leader", level: 99, isLive: true },
    { id: 2, name: "PixelWarrior", rank: "Elite", level: 87, isLive: false },
    { id: 3, name: "NeonGhost", rank: "Elite", level: 85, isLive: true },
    { id: 4, name: "DataHunter", rank: "Member", level: 72, isLive: false },
    { id: 5, name: "CodeBreaker", rank: "Member", level: 68, isLive: false },
  ]);

  const handleSearchSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;

    // Check authentication
    const { data: { user } } = await supabase.auth.getUser();
    
    // Check if it's a known platform
    const platform = TRADING_PLATFORMS.find(
      p => p.name.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const tabName = platform ? platform.name : searchQuery;
    const tabUrl = platform ? platform.url : (searchQuery.startsWith('http') ? searchQuery : 'https://' + searchQuery);

    // Save tab to database if user is authenticated
    if (user) {
      saveTab({
        tab_name: tabName,
        tab_url: tabUrl,
        tab_type: "trading_platform",
        metadata: { source: "arena_search" }
      });
    }

    // Open the window
    openWindow(
      tabName,
      <iframe
        src={tabUrl}
        className="w-full h-full border-0"
        title={tabName}
      />,
      1200,
      800
    );
    
    setSearchQuery("");
  };

  return (
    <div className="min-h-screen bg-background">
      <Navigation onCreatePost={() => {}} />
      <PageTabManager />
      
      {/* Trading Platform Search Bar */}
      <div className="fixed top-20 left-1/2 -translate-x-1/2 z-40 w-full max-w-2xl px-4">
        <form onSubmit={handleSearchSubmit} className="relative">
          <Input
            type="text"
            placeholder="Search for trading platforms (e.g., TradingView, Binance, or enter URL)..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pr-12 bg-background/95 backdrop-blur-sm border-primary/30 focus:border-primary"
          />
          <Button
            type="submit"
            size="icon"
            className="absolute right-1 top-1/2 -translate-y-1/2"
            variant="ghost"
          >
            <Search className="w-4 h-4" />
          </Button>
        </form>
        
        {/* Quick Platform Buttons */}
        <div className="flex flex-wrap gap-2 mt-2 justify-center">
          {TRADING_PLATFORMS.slice(0, 5).map((platform) => (
            <Button
              key={platform.name}
              size="sm"
              variant="outline"
              onClick={async () => {
                const { data: { user } } = await supabase.auth.getUser();
                
                if (user) {
                  saveTab({
                    tab_name: platform.name,
                    tab_url: platform.url,
                    tab_type: "trading_platform",
                    metadata: { source: "quick_access" }
                  });
                }
                
                openWindow(
                  platform.name,
                  <iframe
                    src={platform.url}
                    className="w-full h-full border-0"
                    title={platform.name}
                  />,
                  1200,
                  800
                );
              }}
              className="backdrop-blur-sm bg-background/80 border-primary/20 hover:border-primary/50"
            >
              {platform.name}
            </Button>
          ))}
        </div>
      </div>
      
      <main className="container mx-auto px-4 pt-48 pb-8">
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <Gamepad2 className="w-10 h-10 text-primary text-glow" />
                <h1 className="text-4xl font-bold text-primary text-glow">CyberLink Arena</h1>
              </div>
              <p className="text-muted-foreground">Battle in the ultimate cyber gaming arena</p>
            </div>
            <div className="flex gap-2">
              <Button 
                size="sm" 
                variant="outline"
                onClick={() => openWindow("Gang Members", (
                  <div className="grid grid-cols-2 gap-4">
                    {gangMembers.map((member) => (
                      <Card key={member.id} className="p-4">
                        <div className="flex items-center gap-3 mb-2">
                          <Avatar className="w-10 h-10">
                            <AvatarImage src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${member.name}`} />
                            <AvatarFallback>{member.name.slice(0, 2)}</AvatarFallback>
                          </Avatar>
                          <div>
                            <h4 className="font-semibold">{member.name}</h4>
                            <Badge variant="outline" className="text-xs">{member.rank}</Badge>
                          </div>
                        </div>
                        {member.isLive && <Badge variant="destructive" className="text-xs">LIVE</Badge>}
                      </Card>
                    ))}
                  </div>
                ))}
              >
                <Users className="w-4 h-4 mr-2" />
                Members
              </Button>
              <Button 
                size="sm" 
                variant="outline"
                onClick={() => openWindow("Tournaments", (
                  <div className="space-y-3">
                    {[
                      { name: "Cyber Strike Championship", date: "Dec 15, 2025", prize: "$5,000" },
                      { name: "Neon Racers Grand Prix", date: "Dec 20, 2025", prize: "$3,000" },
                      { name: "Gang Wars Tournament", date: "Dec 25, 2025", prize: "$10,000" },
                    ].map((tournament, idx) => (
                      <Card key={idx} className="p-3">
                        <h4 className="font-semibold">{tournament.name}</h4>
                        <p className="text-sm text-muted-foreground">{tournament.date}</p>
                        <Badge className="mt-2">{tournament.prize}</Badge>
                      </Card>
                    ))}
                  </div>
                ))}
              >
                <Trophy className="w-4 h-4 mr-2" />
                Tournaments
              </Button>
            </div>
          </div>
        </div>

        <Tabs defaultValue="saved-tabs" className="w-full">
          <TabsList className="grid w-full grid-cols-5 mb-6">
            <TabsTrigger value="saved-tabs" className="flex items-center gap-2">
              <Save className="w-4 h-4" />
              My Tabs
            </TabsTrigger>
            <TabsTrigger value="pools" className="flex items-center gap-2">
              <Trophy className="w-4 h-4" />
              Token Pools
            </TabsTrigger>
            <TabsTrigger value="gang" className="flex items-center gap-2">
              <Users className="w-4 h-4" />
              Gang Members
            </TabsTrigger>
            <TabsTrigger value="games" className="flex items-center gap-2">
              <Gamepad2 className="w-4 h-4" />
              Games
            </TabsTrigger>
            <TabsTrigger value="tournaments" className="flex items-center gap-2">
              <Trophy className="w-4 h-4" />
              Tournaments
            </TabsTrigger>
          </TabsList>

          <TabsContent value="saved-tabs" className="space-y-6">
            <SavedTabsManager />
          </TabsContent>

          <TabsContent value="pools" className="space-y-6">
            <TokenPoolManager />
          </TabsContent>

          <TabsContent value="gang" className="space-y-6">
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
                          <AvatarImage src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${member.name}`} />
                          <AvatarFallback>{member.name.slice(0, 2)}</AvatarFallback>
                        </Avatar>
                        <div>
                          <h3 className="font-semibold text-foreground">{member.name}</h3>
                          <Badge variant="outline" className="text-xs">{member.rank}</Badge>
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
              <h3 className="text-xl font-bold text-foreground mb-4">CyberLink Live Integration</h3>
              <p className="text-muted-foreground mb-4">
                Gang members can stream their gameplay directly on CyberLink Live. 
                Click the button below to start your own gaming stream!
              </p>
              <Button 
                onClick={() => navigate("/studio")}
                className="glow-primary"
              >
                <Radio className="w-4 h-4 mr-2" />
                Go Live Now
              </Button>
            </Card>
          </TabsContent>

          <TabsContent value="games" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {["Cyber Strike", "Neon Racers", "Digital Warfare", "Pixel Legends", "Code Combat", "Virtual Arena"].map((game, idx) => (
                <Card key={idx} className="p-6 bg-card/50 backdrop-blur border-primary/20 hover:border-primary/50 transition-colors">
                  <div className="aspect-video bg-muted/20 rounded-lg mb-4 flex items-center justify-center">
                    <Gamepad2 className="w-16 h-16 text-primary" />
                  </div>
                  <h3 className="text-lg font-bold text-foreground mb-2">{game}</h3>
                  <p className="text-sm text-muted-foreground mb-4">Join the action and compete with gang members</p>
                  <Button variant="outline" className="w-full">Play Now</Button>
                </Card>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="tournaments" className="space-y-6">
            <Card className="p-6 bg-card/50 backdrop-blur border-primary/20">
              <h2 className="text-2xl font-bold text-foreground mb-4 flex items-center gap-2">
                <Trophy className="w-6 h-6 text-primary" />
                Upcoming Tournaments
              </h2>
              
              <div className="space-y-4">
                {[
                  { name: "Cyber Strike Championship", date: "Dec 15, 2025", prize: "$5,000" },
                  { name: "Neon Racers Grand Prix", date: "Dec 20, 2025", prize: "$3,000" },
                  { name: "Gang Wars Tournament", date: "Dec 25, 2025", prize: "$10,000" },
                ].map((tournament, idx) => (
                  <Card key={idx} className="p-4 bg-muted/20 border-primary/10">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="font-semibold text-foreground">{tournament.name}</h3>
                        <p className="text-sm text-muted-foreground">{tournament.date}</p>
                      </div>
                      <div className="text-right">
                        <Badge className="bg-primary text-primary-foreground mb-2">{tournament.prize}</Badge>
                        <Button size="sm">Register</Button>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            </Card>
          </TabsContent>
        </Tabs>
      </main>

      <DracoAI />
    </div>
  );
};

export default CyberGamers;
