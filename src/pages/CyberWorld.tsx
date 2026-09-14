import { useEffect, useState, type ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import Navigation from "@/components/Navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import SectionFeed from "@/components/feed/SectionFeed";
import { Badge } from "@/components/ui/badge";
import {
  Globe,
  Users,
  TrendingUp,
  Video,
  Calendar,
  Award,
  Star,
  BarChart3,
  Radio,
  Trophy,
  LineChart,
  Clapperboard,
  Compass,
} from "lucide-react";
import CryptoMarketChart from "@/components/CryptoMarketChart";
import StockMarketWidget from "@/components/StockMarketWidget";
import NFTMarketWidget from "@/components/NFTMarketWidget";
import { useFloatingWindowsContext } from "@/providers/FloatingWindowsProvider";
import { User } from "@supabase/supabase-js";
import CouponAI from "@/components/CouponAI";
import { TokenPoolManager } from "@/components/TokenPoolManager";
import { CryptoWalletConnect } from "@/components/CryptoWalletConnect";
import { TradingAccountConnect } from "@/components/TradingAccountConnect";
import BroadcastPanel from "@/components/studio/BroadcastPanel";
import ChartWindow from "@/components/windows/ChartWindow";
import LiveEventsPanel from "@/components/cyberworld/LiveEventsPanel";
import TrendingPanel from "@/components/cyberworld/TrendingPanel";
import CreatorsPanel from "@/components/cyberworld/CreatorsPanel";
import CommunityPanel from "@/components/cyberworld/CommunityPanel";
import TradingDisclaimer from "@/components/market/TradingDisclaimer";
import { signInPath } from "@/lib/authRedirect";

const CHART_TICKERS = ["BTC", "ETH", "SOL", "AAPL", "TSLA", "SPY"];

const CyberWorld = () => {
  const [user, setUser] = useState<User | null>(null);
  const [followers, setFollowers] = useState<number | null>(null);
  const [following, setFollowing] = useState<number | null>(null);
  const [liveNow, setLiveNow] = useState<number | null>(null);
  const [myPosts, setMyPosts] = useState<number | null>(null);
  const navigate = useNavigate();
  const { openWindow, windows, closeAllWindows } = useFloatingWindowsContext();

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) navigate(signInPath());
      else setUser(session.user);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!session) navigate(signInPath());
      else setUser(session.user);
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  useEffect(() => {
    if (!user) return;
    let alive = true;

    const load = async () => {
      const [inbound, outbound, live, posts] = await Promise.all([
        supabase.from("followers").select("id", { count: "exact", head: true }).eq("following_id", user.id),
        supabase.from("followers").select("id", { count: "exact", head: true }).eq("follower_id", user.id),
        supabase.from("live_streams").select("id", { count: "exact", head: true }).eq("is_live", true),
        supabase.from("posts").select("id", { count: "exact", head: true }).eq("user_id", user.id),
      ]);
      if (!alive) return;
      setFollowers(inbound.count ?? 0);
      setFollowing(outbound.count ?? 0);
      setLiveNow(live.count ?? 0);
      setMyPosts(posts.count ?? 0);
    };

    load();
    const timer = window.setInterval(load, 60_000);
    return () => {
      alive = false;
      window.clearInterval(timer);
    };
  }, [user]);

  const open = (title: string, content: ReactNode, width = 620, height = 480) =>
    openWindow(title, content, width, height);

  const stat = (value: number | null) => (value === null ? "—" : value.toLocaleString());

  const openWindowsBar = windows.length > 0 && (
    <div className="mt-4 flex items-center justify-between rounded-lg border bg-muted/30 p-3">
      <span className="text-sm text-muted-foreground">
        {windows.length} window{windows.length !== 1 ? "s" : ""} open · drag to arrange, pin to lock in place
      </span>
      <Button size="sm" variant="destructive" onClick={closeAllWindows}>
        Close all windows
      </Button>
    </div>
  );

  return (
    <div className="min-h-screen bg-transparent">
      <Navigation />

      <div className="container mx-auto px-4 py-8">
        {/* Hero Section */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <Badge variant="outline" className="text-lg px-4 py-2">
              <Globe className="w-5 h-5 mr-2" />
              Global Network
            </Badge>
          </div>
        </div>

        {/* Stats Overview — all figures read live from your account */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <Card className="bg-gradient-to-br from-primary/10 to-primary/5 border-primary/20">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Followers</CardTitle>
              <Users className="h-4 w-4 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stat(followers)}</div>
              <p className="text-xs text-muted-foreground">Your community</p>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-accent/10 to-accent/5 border-accent/20">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Following</CardTitle>
              <Star className="h-4 w-4 text-accent" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stat(following)}</div>
              <p className="text-xs text-muted-foreground">Connections</p>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-secondary/10 to-secondary/5 border-secondary/20">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Your posts</CardTitle>
              <Award className="h-4 w-4 text-secondary" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stat(myPosts)}</div>
              <p className="text-xs text-muted-foreground">Published here</p>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-primary/10 via-accent/5 to-secondary/10 border-primary/20">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Live now</CardTitle>
              <Video className="h-4 w-4 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stat(liveNow)}</div>
              <p className="text-xs text-muted-foreground">Broadcasts running</p>
            </CardContent>
          </Card>
        </div>

        {/* Main Content Tabs */}
        <Tabs defaultValue="trading" className="space-y-6">
          <TabsList className="grid w-full grid-cols-4 lg:grid-cols-8">
            <TabsTrigger value="trading">
              <BarChart3 className="w-4 h-4 mr-2" />
              Trading
            </TabsTrigger>
            <TabsTrigger value="studio">Studio</TabsTrigger>
            <TabsTrigger value="live">
              <Radio className="w-4 h-4 mr-2" />
              Live Studio
            </TabsTrigger>
            <TabsTrigger value="trending">Trending</TabsTrigger>
            <TabsTrigger value="events">Live Events</TabsTrigger>
            <TabsTrigger value="communities">Community</TabsTrigger>
            <TabsTrigger value="discover">Discovery</TabsTrigger>
            <TabsTrigger value="pools">
              <Trophy className="w-4 h-4 mr-2" />
              Pool
            </TabsTrigger>
          </TabsList>

          {/* Trading — the multi-window workspace */}
          <TabsContent value="trading" className="space-y-6">
            <Card className="border-primary/30 bg-gradient-to-br from-primary/10 to-transparent">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <LineChart className="w-5 h-5 text-primary" />
                  Trading workspace
                </CardTitle>
                <CardDescription>
                  Pop open as many live chart windows as you like, drag them where you want them and
                  pin the ones you need to keep watching.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex flex-wrap gap-2">
                  {CHART_TICKERS.map((ticker) => (
                    <Button
                      key={ticker}
                      variant="outline"
                      size="sm"
                      onClick={() => open(`Chart · ${ticker}`, <ChartWindow symbol={ticker} />, 640, 520)}
                    >
                      <LineChart className="w-4 h-4 mr-2" />
                      {ticker}
                    </Button>
                  ))}
                  <Button size="sm" onClick={() => navigate("/trading")}>
                    Full trading desk
                  </Button>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  <Button
                    variant="outline"
                    className="h-24 flex flex-col gap-2"
                    onClick={() => open("Cryptocurrency Markets", <CryptoMarketChart />)}
                  >
                    <TrendingUp className="w-6 h-6" />
                    <span className="text-sm">Crypto</span>
                  </Button>

                  <Button
                    variant="outline"
                    className="h-24 flex flex-col gap-2"
                    onClick={() => open("Stock Market", <StockMarketWidget />)}
                  >
                    <BarChart3 className="w-6 h-6" />
                    <span className="text-sm">Stocks</span>
                  </Button>

                  <Button
                    variant="outline"
                    className="h-24 flex flex-col gap-2"
                    onClick={() => open("NFT Marketplace", <NFTMarketWidget />)}
                  >
                    <Award className="w-6 h-6" />
                    <span className="text-sm">NFTs</span>
                  </Button>
                </div>

                {openWindowsBar}
              </CardContent>
            </Card>

            <CouponAI />

            {/* Financial accounts */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <CryptoWalletConnect />
              <TradingAccountConnect />
            </div>

            {/* Trader presence: go live with your group and build a following */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Radio className="w-5 h-5 text-primary" />
                  Traders live now
                </CardTitle>
                <CardDescription>
                  Go live with your trading group, build your following and host your own room.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <LiveEventsPanel
                  category="trading"
                  emptyMessage="No trading rooms are live right now — start yours."
                />
                <div className="flex flex-wrap gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => open("Traders live", <LiveEventsPanel category="trading" />)}
                  >
                    Open as window
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => navigate("/studio")}>
                    Go live
                  </Button>
                </div>
              </CardContent>
            </Card>

            <TradingDisclaimer />
            <SectionFeed section="trading" />
          </TabsContent>

          {/* Studio */}
          <TabsContent value="studio" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Clapperboard className="w-5 h-5 text-accent" />
                  Studio
                </CardTitle>
                <CardDescription>Create here, then send it out everywhere you are connected.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex flex-wrap gap-2">
                  <Button onClick={() => navigate("/studio")}>Open Studio</Button>
                  <Button
                    variant="outline"
                    onClick={() => open("Studio · Broadcast", <BroadcastPanel />, 680, 560)}
                  >
                    Broadcast setup window
                  </Button>
                </div>
                {openWindowsBar}
              </CardContent>
            </Card>
            <SectionFeed section="studio" />
          </TabsContent>

          {/* Live Studio */}
          <TabsContent value="live" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Radio className="w-5 h-5 text-primary" />
                  CyberLink Live Studio
                </CardTitle>
                <CardDescription>Start a broadcast and watch who else is on air.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex flex-wrap gap-2">
                  <Button onClick={() => navigate("/studio")}>
                    <Radio className="w-4 h-4 mr-2" />
                    Go live
                  </Button>
                  <Button variant="outline" onClick={() => open("Live now", <LiveEventsPanel />)}>
                    Open live board in a window
                  </Button>
                </div>
                <LiveEventsPanel />
                {openWindowsBar}
              </CardContent>
            </Card>
            <SectionFeed section="live" />
          </TabsContent>

          {/* Trending */}
          <TabsContent value="trending" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="w-5 h-5 text-secondary" />
                  Trending topics
                </CardTitle>
                <CardDescription>Counted from real posts across CyberWorld</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <Button size="sm" variant="outline" onClick={() => open("Trending", <TrendingPanel />)}>
                  Open as window
                </Button>
                <TrendingPanel />
              </CardContent>
            </Card>
            <SectionFeed section="trending" />
          </TabsContent>

          {/* Live Events */}
          <TabsContent value="events" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Calendar className="w-5 h-5 text-accent" />
                  Live events
                </CardTitle>
                <CardDescription>Broadcasts happening right now</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <Button size="sm" variant="outline" onClick={() => open("Live events", <LiveEventsPanel />)}>
                  Open as window
                </Button>
                <LiveEventsPanel />
              </CardContent>
            </Card>
            <SectionFeed section="events" />
          </TabsContent>

          {/* Community */}
          <TabsContent value="communities" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="w-5 h-5 text-primary" />
                  Your community
                </CardTitle>
                <CardDescription>The people around you on Cyber Link</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => open("Community", <CommunityPanel userId={user?.id ?? null} />)}
                >
                  Open as window
                </Button>
                <CommunityPanel userId={user?.id ?? null} />
              </CardContent>
            </Card>
            <SectionFeed section="community" />
          </TabsContent>

          {/* Discovery */}
          <TabsContent value="discover" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Compass className="w-5 h-5 text-primary" />
                  Discovery
                </CardTitle>
                <CardDescription>Creators on the platform, ranked by real followers</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <Button size="sm" variant="outline" onClick={() => open("Discovery", <CreatorsPanel />)}>
                  Open as window
                </Button>
                <CreatorsPanel />
              </CardContent>
            </Card>
            <SectionFeed section="discovery" />
          </TabsContent>

          {/* Pool */}
          <TabsContent value="pools" className="space-y-6">
            <Button
              size="sm"
              variant="outline"
              onClick={() => open("Token pools", <TokenPoolManager />, 720, 560)}
            >
              Open as window
            </Button>
            <TokenPoolManager />
            <SectionFeed section="pool" />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default CyberWorld;
