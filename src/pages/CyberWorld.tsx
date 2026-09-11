import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import Navigation from "@/components/Navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { 
  Globe, 
  Users, 
  TrendingUp, 
  MessageCircle, 
  Video,
  Calendar,
  Award,
  Zap,
  Star,
  Crown,
  BarChart3,
  Radio,
  Trophy
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
import { BTCAlgorithmEngine } from "@/components/BTCAlgorithmEngine";
import { StockAlgorithmEngine } from "@/components/StockAlgorithmEngine";
import { NFTAlgorithmEngine } from "@/components/NFTAlgorithmEngine";
import { MoonshotAlgorithmEngine } from "@/components/MoonshotAlgorithmEngine";
import { BinaryOptionsAlgorithmEngine } from "@/components/BinaryOptionsAlgorithmEngine";
import { CyberLinkExchangeAgent } from "@/components/CyberLinkExchangeAgent";
import { AIEcosystemDashboard } from "@/components/AIEcosystemDashboard";

const CyberWorld = () => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [followers, setFollowers] = useState(0);
  const [following, setFollowing] = useState(0);
  const navigate = useNavigate();
  const { openWindow, windows, closeAllWindows } = useFloatingWindowsContext();

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) {
        navigate("/auth");
      } else {
        setUser(session.user);
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (!session) {
        navigate("/auth");
      } else {
        setUser(session.user);
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  useEffect(() => {
    if (user) {
      fetchSocialStats();
    }
  }, [user]);

  const fetchSocialStats = async () => {
    if (!user) return;
    
    setLoading(true);
    try {
      // Fetch followers
      const { data: followersData } = await supabase
        .from("followers")
        .select("id", { count: "exact" })
        .eq("following_id", user.id);

      // Fetch following
      const { data: followingData } = await supabase
        .from("followers")
        .select("id", { count: "exact" })
        .eq("follower_id", user.id);

      setFollowers(followersData?.length || 0);
      setFollowing(followingData?.length || 0);
    } catch (error) {
      console.error("Error fetching social stats:", error);
    } finally {
      setLoading(false);
    }
  };

  const trendingCreators = [
    { name: "CyberGamer Pro", handle: "@cybergamer", followers: "125K", avatar: "" },
    { name: "Digital Artist", handle: "@digitalart", followers: "98K", avatar: "" },
    { name: "Tech Streamer", handle: "@techstream", followers: "87K", avatar: "" },
  ];

  const liveEvents = [
    { title: "Gaming Tournament Finals", time: "Live Now", viewers: "15.2K", category: "Gaming" },
    { title: "Digital Art Showcase", time: "In 30 min", viewers: "8.5K", category: "Creative" },
    { title: "Tech Talk: Web3 Future", time: "In 1 hour", viewers: "12.1K", category: "Tech" },
  ];

  const featuredCommunities = [
    { name: "Cyber Gamers", members: "50K", icon: "🎮", active: "2.5K online" },
    { name: "Digital Artists", members: "35K", icon: "🎨", active: "1.8K online" },
    { name: "Tech Innovators", members: "42K", icon: "💻", active: "3.2K online" },
    { name: "Content Creators", members: "28K", icon: "📹", active: "1.2K online" },
  ];

  return (
    <div className="min-h-screen bg-transparent">
      <Navigation />
      
      <div className="container mx-auto px-4 py-8">
        {/* Hero Section */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-5xl font-bold mb-2 bg-gradient-to-r from-primary via-accent to-secondary bg-clip-text text-transparent">
                CyberWorld
              </h1>
              <p className="text-xl text-muted-foreground">
                Your central hub for the digital universe
              </p>
            </div>
            <Badge variant="outline" className="text-lg px-4 py-2">
              <Globe className="w-5 h-5 mr-2" />
              Global Network
            </Badge>
          </div>
        </div>

        {/* Stats Overview */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <Card className="bg-gradient-to-br from-primary/10 to-primary/5 border-primary/20">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Followers</CardTitle>
              <Users className="h-4 w-4 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{followers.toLocaleString()}</div>
              <p className="text-xs text-muted-foreground">Your community</p>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-accent/10 to-accent/5 border-accent/20">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Following</CardTitle>
              <Star className="h-4 w-4 text-accent" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{following.toLocaleString()}</div>
              <p className="text-xs text-muted-foreground">Connections</p>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-secondary/10 to-secondary/5 border-secondary/20">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Active Users</CardTitle>
              <Zap className="h-4 w-4 text-secondary" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">248K</div>
              <p className="text-xs text-muted-foreground">Online now</p>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-primary/10 via-accent/5 to-secondary/10 border-primary/20">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Live Events</CardTitle>
              <Video className="h-4 w-4 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">127</div>
              <p className="text-xs text-muted-foreground">Happening now</p>
            </CardContent>
          </Card>
        </div>

        {/* Main Content Tabs */}
        <Tabs defaultValue="pools" className="space-y-6">
          <TabsList className="grid w-full grid-cols-7">
            <TabsTrigger value="pools">
              <Trophy className="w-4 h-4 mr-2" />
              Pools
            </TabsTrigger>
            <TabsTrigger value="discover">Discover</TabsTrigger>
            <TabsTrigger value="communities">Communities</TabsTrigger>
            <TabsTrigger value="events">Live Events</TabsTrigger>
            <TabsTrigger value="trending">Trending</TabsTrigger>
            <TabsTrigger value="trading">
              <BarChart3 className="w-4 h-4 mr-2" />
              Trading
            </TabsTrigger>
            <TabsTrigger value="live">
              <Radio className="w-4 h-4 mr-2" />
              Live Studio
            </TabsTrigger>
          </TabsList>

          {/* Token Pools Tab */}
          <TabsContent value="pools" className="space-y-6">
            <TokenPoolManager />
          </TabsContent>

          {/* Discover Tab */}
          <TabsContent value="discover" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <TrendingUp className="w-5 h-5 text-primary" />
                    Trending Creators
                  </CardTitle>
                  <CardDescription>Top creators in CyberWorld right now</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {trendingCreators.map((creator, index) => (
                    <div key={index} className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 transition-colors">
                      <div className="flex items-center gap-3">
                        <Avatar>
                          <AvatarFallback>{creator.name[0]}</AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="font-medium">{creator.name}</p>
                          <p className="text-sm text-muted-foreground">{creator.handle}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-medium">{creator.followers}</p>
                        <Button size="sm" variant="outline" className="mt-1">
                          Follow
                        </Button>
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Award className="w-5 h-5 text-accent" />
                    Your Achievements
                  </CardTitle>
                  <CardDescription>Milestones and rewards</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center gap-3 p-3 border rounded-lg bg-primary/5">
                    <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                      <Crown className="w-6 h-6 text-primary" />
                    </div>
                    <div className="flex-1">
                      <p className="font-medium">Early Adopter</p>
                      <p className="text-sm text-muted-foreground">Joined in 2024</p>
                    </div>
                    <Badge variant="secondary">Unlocked</Badge>
                  </div>

                  <div className="flex items-center gap-3 p-3 border rounded-lg">
                    <div className="w-12 h-12 rounded-full bg-accent/10 flex items-center justify-center">
                      <Users className="w-6 h-6 text-accent" />
                    </div>
                    <div className="flex-1">
                      <p className="font-medium">Community Builder</p>
                      <p className="text-sm text-muted-foreground">Reach 100 followers</p>
                    </div>
                    <Badge variant="outline">In Progress</Badge>
                  </div>

                  <div className="flex items-center gap-3 p-3 border rounded-lg">
                    <div className="w-12 h-12 rounded-full bg-secondary/10 flex items-center justify-center">
                      <Star className="w-6 h-6 text-secondary" />
                    </div>
                    <div className="flex-1">
                      <p className="font-medium">Content Creator</p>
                      <p className="text-sm text-muted-foreground">Post 50 times</p>
                    </div>
                    <Badge variant="outline">Locked</Badge>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Communities Tab */}
          <TabsContent value="communities" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="w-5 h-5 text-primary" />
                  Featured Communities
                </CardTitle>
                <CardDescription>Join communities that match your interests</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {featuredCommunities.map((community, index) => (
                    <div key={index} className="p-4 border rounded-lg hover:bg-muted/50 transition-colors">
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex items-center gap-3">
                          <div className="text-3xl">{community.icon}</div>
                          <div>
                            <h3 className="font-semibold">{community.name}</h3>
                            <p className="text-sm text-muted-foreground">{community.members} members</p>
                          </div>
                        </div>
                        <Button size="sm">Join</Button>
                      </div>
                      <div className="flex items-center gap-2 text-sm">
                        <div className="w-2 h-2 rounded-full bg-green-500"></div>
                        <span className="text-muted-foreground">{community.active}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Live Events Tab */}
          <TabsContent value="events" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Calendar className="w-5 h-5 text-accent" />
                  Live & Upcoming Events
                </CardTitle>
                <CardDescription>Don't miss out on exciting events</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {liveEvents.map((event, index) => (
                  <div key={index} className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center">
                        <Video className="w-6 h-6 text-primary" />
                      </div>
                      <div>
                        <h3 className="font-semibold">{event.title}</h3>
                        <div className="flex items-center gap-3 mt-1">
                          <Badge variant="outline" className="text-xs">{event.category}</Badge>
                          <span className="text-sm text-muted-foreground">{event.time}</span>
                          <span className="text-sm text-muted-foreground">👁 {event.viewers}</span>
                        </div>
                      </div>
                    </div>
                    <Button variant={index === 0 ? "default" : "outline"}>
                      {index === 0 ? "Watch Now" : "Set Reminder"}
                    </Button>
                  </div>
                ))}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Trending Tab */}
          <TabsContent value="trending" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="w-5 h-5 text-secondary" />
                  Trending Topics
                </CardTitle>
                <CardDescription>What's hot in CyberWorld</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {["#Web3Gaming", "#AIArt", "#MetaverseEvents", "#CryptoCreators", "#DigitalFashion"].map((tag, index) => (
                    <div key={index} className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 transition-colors cursor-pointer">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center text-sm font-bold">
                          {index + 1}
                        </div>
                        <div>
                          <p className="font-medium">{tag}</p>
                          <p className="text-sm text-muted-foreground">{(Math.random() * 50 + 10).toFixed(1)}K posts</p>
                        </div>
                      </div>
                      <MessageCircle className="w-5 h-5 text-muted-foreground" />
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Trading Tab */}
          <TabsContent value="trading" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="w-5 h-5 text-primary" />
                  Trading Hub Control Center
                </CardTitle>
                <CardDescription>Open multiple trading windows simultaneously</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <Button
                    variant="outline"
                    className="h-24 flex flex-col gap-2"
                    onClick={() => openWindow("Cryptocurrency Markets", <CryptoMarketChart />)}
                  >
                    <TrendingUp className="w-6 h-6" />
                    <span className="text-sm">Crypto</span>
                  </Button>
                  
                  <Button
                    variant="outline"
                    className="h-24 flex flex-col gap-2"
                    onClick={() => openWindow("Stock Market", <StockMarketWidget />)}
                  >
                    <BarChart3 className="w-6 h-6" />
                    <span className="text-sm">Stocks</span>
                  </Button>
                  
                  <Button
                    variant="outline"
                    className="h-24 flex flex-col gap-2"
                    onClick={() => openWindow("NFT Marketplace", <NFTMarketWidget />)}
                  >
                    <Award className="w-6 h-6" />
                    <span className="text-sm">NFTs</span>
                  </Button>
                </div>

                {windows.length > 0 && (
                  <div className="mt-4 flex items-center justify-between p-3 border rounded-lg bg-muted/30">
                    <span className="text-sm text-muted-foreground">
                      {windows.length} window{windows.length !== 1 ? 's' : ''} open
                    </span>
                    <Button size="sm" variant="destructive" onClick={closeAllWindows}>
                      Close All Windows
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>

            <CouponAI />
            
            {/* Financial Accounts Section */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <CryptoWalletConnect />
              <TradingAccountConnect />
            </div>

            {/* AI Trading Algorithms */}
            <div className="space-y-6">
              <Card className="bg-gradient-to-br from-purple-900/20 to-pink-900/20 border-purple-500/30">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-2xl">
                    🤖 CyberLink AI Trading Algorithms
                  </CardTitle>
                  <CardDescription>
                    Advanced AI-powered trading algorithms with real-time analysis and auto-trading capabilities
                  </CardDescription>
                </CardHeader>
              </Card>
              
              {/* CyberLink Exchange AI Agent - Master Controller */}
              <CyberLinkExchangeAgent />
              
              <BTCAlgorithmEngine />
              <StockAlgorithmEngine />
              <NFTAlgorithmEngine />
              <MoonshotAlgorithmEngine />
              <BinaryOptionsAlgorithmEngine />
            </div>

            {/* AI Ecosystem Dashboard */}
            <AIEcosystemDashboard />
          </TabsContent>

          {/* Live Studio Tab */}
          <TabsContent value="live" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Radio className="w-5 h-5 text-primary" />
                  CyberLink Live Studio Control
                </CardTitle>
                <CardDescription>Access live streaming controls and features</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 gap-4">
                  <Button
                    variant="outline"
                    className="h-24 flex flex-col gap-2"
                    onClick={() => window.location.href = '/studio'}
                  >
                    <Radio className="w-6 h-6" />
                    <span className="text-sm">Go Live</span>
                  </Button>
                </div>

                {windows.length > 0 && (
                  <div className="mt-4 flex items-center justify-between p-3 border rounded-lg bg-muted/30">
                    <span className="text-sm text-muted-foreground">
                      {windows.length} window{windows.length !== 1 ? 's' : ''} open
                    </span>
                    <Button size="sm" variant="destructive" onClick={closeAllWindows}>
                      Close All Windows
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

    </div>
  );
};

export default CyberWorld;
