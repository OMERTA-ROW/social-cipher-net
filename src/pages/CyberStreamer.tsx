import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import Navigation from "@/components/Navigation";
import SponsoredCard from "@/components/ads/SponsoredCard";
import { useAdSlot, useAdsSuppressed } from "@/hooks/useAdSlot";
import FloatingWindow from "@/components/FloatingWindow";
import { useFloatingWindows } from "@/hooks/useFloatingWindows";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { 
  Radio, 
  Users, 
  Eye, 
  MessageSquare, 
  Settings,
  Play,
  StopCircle,
  Activity,
  Link as LinkIcon,
  Check,
  X,
  Send,
  Youtube,
  Facebook,
  Video,
  Monitor,
  Twitch,
  ShoppingCart,
  Instagram
} from "lucide-react";
import { toast } from "sonner";

interface StreamStats {
  viewers: number;
  chatMessages: number;
  duration: number;
  peakViewers: number;
}

interface Platform {
  id: string;
  name: string;
  icon: any;
  connected: boolean;
  streamKey?: string;
  rtmpUrl?: string;
}

interface ChatMessage {
  id: string;
  platform: string;
  username: string;
  message: string;
  user_avatar?: string;
  created_at: string;
}

const CyberStreamer = () => {
  // Live-stream ad placement: real running campaigns only, hidden for paid tiers.
  const adsSuppressed = useAdsSuppressed();
  const { data: streamAds } = useAdSlot("stream");
  const navigate = useNavigate();
  const { windows, openWindow, closeWindow } = useFloatingWindows();
  const [loading, setLoading] = useState(true);
  const [isLive, setIsLive] = useState(false);
  const [currentStreamId, setCurrentStreamId] = useState<string | null>(null);
  const [streamStats, setStreamStats] = useState<StreamStats>({
    viewers: 0,
    chatMessages: 0,
    duration: 0,
    peakViewers: 0
  });
  const [streamingPlatforms, setStreamingPlatforms] = useState<Platform[]>([
    { id: 'youtube', name: 'YouTube', icon: Youtube, connected: false },
    { id: 'twitch', name: 'Twitch', icon: Twitch, connected: false },
    { id: 'facebook', name: 'Facebook', icon: Facebook, connected: false },
  ]);
  
  const [socialPlatforms, setSocialPlatforms] = useState<Platform[]>([
    { id: 'google', name: 'Google', icon: Monitor, connected: false },
    { id: 'instagram', name: 'Instagram', icon: Video, connected: false },
    { id: 'twitter', name: 'X (Twitter)', icon: MessageSquare, connected: false },
    { id: 'tiktok', name: 'TikTok', icon: Video, connected: false },
  ]);
  
  const [commercePlatforms, setCommercePlatforms] = useState<Platform[]>([
    { id: 'shopify', name: 'Shopify', icon: ShoppingCart, connected: false },
    { id: 'unitedmasters', name: 'United Masters', icon: Users, connected: false },
  ]);
  
  const allPlatforms = [...streamingPlatforms, ...socialPlatforms, ...commercePlatforms];
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState("");
  const chatScrollRef = useRef<HTMLDivElement>(null);
  const [streamTitle, setStreamTitle] = useState("My Awesome Stream");
  const [streamCategory, setStreamCategory] = useState("Gaming");

  useEffect(() => {
    checkAuth();
  }, []);

  useEffect(() => {
    if (currentStreamId) {
      const cleanup = setupRealtimeChat();
      return cleanup;
    }
  }, [currentStreamId]);

  useEffect(() => {
    if (chatScrollRef.current) {
      chatScrollRef.current.scrollTop = chatScrollRef.current.scrollHeight;
    }
  }, [chatMessages]);

  const checkAuth = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      navigate("/auth");
      return;
    }
    await loadPlatformConnections();
    setLoading(false);
  };

  const loadPlatformConnections = async () => {
    try {
      const { data, error } = await supabase
        .from('platform_connections')
        .select('*')
        .eq('is_active', true);

      if (error) throw error;

      if (data) {
        const updatePlatforms = (platforms: Platform[]) => 
          platforms.map(p => ({
            ...p,
            connected: data.some(conn => conn.platform === p.id),
            streamKey: data.find(conn => conn.platform === p.id)?.stream_key,
            rtmpUrl: data.find(conn => conn.platform === p.id)?.rtmp_url
          }));

        setStreamingPlatforms(prev => updatePlatforms(prev));
        setSocialPlatforms(prev => updatePlatforms(prev));
        setCommercePlatforms(prev => updatePlatforms(prev));
      }
    } catch (error) {
      console.error('Error loading platforms:', error);
    }
  };

  const setupRealtimeChat = () => {
    const channel = supabase
      .channel('stream-chat')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'stream_chat_messages',
          filter: `stream_id=eq.${currentStreamId}`
        },
        (payload) => {
          setChatMessages(prev => [...prev, payload.new as ChatMessage]);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  };

  const handleGoLive = () => {
    navigate("/studio");
    toast.success("Launching Cyber Live Studio...");
  };

  const stopStream = async () => {
    try {
      if (!currentStreamId) return;

      const { error } = await supabase
        .from('live_streams')
        .update({
          is_live: false,
          ended_at: new Date().toISOString()
        })
        .eq('id', currentStreamId);

      if (error) throw error;

      setIsLive(false);
      setCurrentStreamId(null);
      setChatMessages([]);
      toast.info("Stream ended");
    } catch (error) {
      console.error('Error stopping stream:', error);
      toast.error("Failed to stop stream");
    }
  };

  const connectPlatform = async (platformId: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Real credentials only: the RTMP server URL and stream key must come
      // from the streaming provider's own dashboard. Nothing is generated here.
      const rtmpUrl = window.prompt(`RTMP server URL from your ${platformId} dashboard`)?.trim();
      if (!rtmpUrl) return;
      const streamKey = window.prompt(`Stream key from your ${platformId} dashboard`)?.trim();
      if (!streamKey) return;

      const { error } = await supabase
        .from('platform_connections')
        .insert({
          user_id: user.id,
          platform: platformId,
          is_active: true,
          stream_key: streamKey,
          rtmp_url: rtmpUrl
        });

      if (error) throw error;

      await loadPlatformConnections();
      toast.success(`Connected to ${platformId}!`);
    } catch (error: any) {
      if (error.code === '23505') {
        toast.info(`Already connected to ${platformId}`);
      } else {
        toast.error("Failed to connect platform");
      }
    }
  };

  const disconnectPlatform = async (platformId: string) => {
    try {
      const { error } = await supabase
        .from('platform_connections')
        .delete()
        .eq('platform', platformId);

      if (error) throw error;

      await loadPlatformConnections();
      toast.info(`Disconnected from ${platformId}`);
    } catch (error) {
      console.error('Error disconnecting platform:', error);
      toast.error("Failed to disconnect platform");
    }
  };

  const sendChatMessage = async () => {
    if (!chatInput.trim() || !currentStreamId) return;

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { error } = await supabase
        .from('stream_chat_messages')
        .insert({
          stream_id: currentStreamId,
          platform: 'cyberlink',
          username: user.email?.split('@')[0] || 'Streamer',
          message: chatInput,
          user_avatar: null
        });

      if (error) throw error;

      setChatInput("");
    } catch (error) {
      console.error('Error sending message:', error);
      toast.error("Failed to send message");
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-transparent">
        <Navigation />
        <div className="container mx-auto px-4 pt-24 pb-12">
          <div className="text-center">Loading...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-transparent">
      <Navigation />
      <div className="container mx-auto px-4 pt-24 pb-12 max-w-7xl">
        {!adsSuppressed && streamAds?.[0] && (
          <div className="mb-6">
            <SponsoredCard creative={streamAds[0]} placement="stream" />
          </div>
        )}
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-4xl font-bold text-glow mb-2">Streaming Command Center</h1>
              <p className="text-muted-foreground">Monitor, stream, and chat - all in one place</p>
            </div>
            <div className="flex gap-3">
              <Button
                size="sm"
                variant="outline"
                onClick={() => openWindow("Stream Stats", (
                  <div className="grid grid-cols-2 gap-4">
                    <Card>
                      <CardContent className="pt-6">
                        <div className="flex items-center gap-2 mb-2">
                          <Eye className="w-4 h-4 text-primary" />
                          <span className="text-sm text-muted-foreground">Viewers</span>
                        </div>
                        <p className="text-2xl font-bold">{streamStats.viewers}</p>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardContent className="pt-6">
                        <div className="flex items-center gap-2 mb-2">
                          <MessageSquare className="w-4 h-4 text-accent" />
                          <span className="text-sm text-muted-foreground">Messages</span>
                        </div>
                        <p className="text-2xl font-bold">{chatMessages.length}</p>
                      </CardContent>
                    </Card>
                  </div>
                ))}
              >
                <Activity className="w-4 h-4 mr-2" />
                Stats
              </Button>
              {isLive ? (
                <>
                  <Badge variant="default" className="bg-red-500 animate-pulse px-4 py-2">
                    <Activity className="w-3 h-3 mr-2" />
                    LIVE NOW
                  </Badge>
                  <Button onClick={stopStream} variant="destructive" size="lg">
                    <StopCircle className="w-4 h-4 mr-2" />
                    End Stream
                  </Button>
                </>
              ) : (
                <Button onClick={handleGoLive} size="lg" className="glow-primary">
                  <Play className="w-4 h-4 mr-2" />
                  Go Live
                </Button>
              )}
            </div>
          </div>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="stream" className="space-y-6">
          <TabsList className="grid w-full grid-cols-2 gap-1">
            <TabsTrigger value="stream" className="text-xs">
              <Monitor className="w-4 h-4 mr-1" />
              Stream
            </TabsTrigger>
            <TabsTrigger value="accounts" className="text-xs">
              <LinkIcon className="w-4 h-4 mr-1" />
              Accounts
            </TabsTrigger>
          </TabsList>

          <TabsContent value="stream" className="space-y-0">
            {/* Main Layout */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column - Stream Monitor */}
          <div className="lg:col-span-2 space-y-6">
            {/* Stream Preview */}
            <Card className="glow-primary">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Monitor className="w-5 h-5" />
                  Stream Monitor
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="aspect-video bg-black rounded-lg flex items-center justify-center">
                  {isLive ? (
                    <div className="text-center">
                      <Video className="w-16 h-16 mx-auto mb-4 text-primary animate-pulse" />
                      <p className="text-xl font-bold">Your Stream is Live!</p>
                      <p className="text-sm text-muted-foreground mt-2">Broadcasting to {streamingPlatforms.filter(p => p.connected).length} platform(s)</p>
                    </div>
                  ) : (
                    <div className="text-center text-muted-foreground">
                      <Monitor className="w-16 h-16 mx-auto mb-4 opacity-50" />
                      <p>Stream preview will appear here</p>
                      <p className="text-sm mt-2">Connect platforms and go live to start</p>
                    </div>
                  )}
                </div>
                <Button 
                  onClick={handleGoLive}
                  className="w-full mt-4"
                  variant="outline"
                >
                  <Radio className="w-4 h-4 mr-2" />
                  Open in Cyber Live Studio
                </Button>
              </CardContent>
            </Card>

            {/* Streaming Platform Connections */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Radio className="w-5 h-5" />
                  Streaming Platforms
                </CardTitle>
                <CardDescription>Connect to stream on multiple platforms</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {streamingPlatforms.map((platform) => {
                  const Icon = platform.icon;
                  return (
                    <div key={platform.id} className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="flex items-center gap-3">
                        <Icon className="w-6 h-6" />
                        <div>
                          <p className="font-medium">{platform.name}</p>
                          {platform.connected && (
                            <p className="text-xs text-muted-foreground">
                              RTMP: {platform.rtmpUrl}
                            </p>
                          )}
                        </div>
                      </div>
                      {platform.connected ? (
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="border-green-500 text-green-500">
                            <Check className="w-3 h-3 mr-1" />
                            Connected
                          </Badge>
                          <Button 
                            size="sm" 
                            variant="ghost"
                            onClick={() => disconnectPlatform(platform.id)}
                          >
                            <X className="w-4 h-4" />
                          </Button>
                        </div>
                      ) : (
                        <Button 
                          size="sm"
                          onClick={() => connectPlatform(platform.id)}
                        >
                          Connect
                        </Button>
                      )}
                    </div>
                  );
                })}
              </CardContent>
            </Card>
          </div>

          {/* Right Column - Chat & Stats */}
          <div className="space-y-6">
            {/* Quick Stats */}
            <div className="grid grid-cols-2 gap-3">
              <Card className="glow-accent">
                <CardContent className="pt-6">
                  <div className="flex items-center gap-2 mb-2">
                    <Eye className="w-4 h-4 text-primary" />
                    <span className="text-sm text-muted-foreground">Viewers</span>
                  </div>
                  <p className="text-2xl font-bold">{streamStats.viewers}</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center gap-2 mb-2">
                    <MessageSquare className="w-4 h-4 text-accent" />
                    <span className="text-sm text-muted-foreground">Chat</span>
                  </div>
                  <p className="text-2xl font-bold">{chatMessages.length}</p>
                </CardContent>
              </Card>
            </div>

            {/* Unified Chat */}
            <Card className="h-[600px] flex flex-col">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2">
                  <MessageSquare className="w-5 h-5" />
                  Live Chat
                </CardTitle>
                <CardDescription>Unified chat from all platforms</CardDescription>
              </CardHeader>
              <Separator />
              <CardContent className="flex-1 flex flex-col p-0">
                <ScrollArea className="flex-1 p-4" ref={chatScrollRef}>
                  {chatMessages.length === 0 ? (
                    <div className="text-center text-muted-foreground py-8">
                      <MessageSquare className="w-12 h-12 mx-auto mb-3 opacity-50" />
                      <p className="text-sm">Chat messages will appear here</p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {chatMessages.map((msg) => (
                        <div key={msg.id} className="space-y-1">
                          <div className="flex items-center gap-2">
                            <Badge variant="outline" className="text-xs">
                              {msg.platform}
                            </Badge>
                            <span className="font-medium text-sm">{msg.username}</span>
                          </div>
                          <p className="text-sm ml-2">{msg.message}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </ScrollArea>
                <Separator />
                <div className="p-4">
                  <div className="flex gap-2">
                    <Input
                      placeholder={isLive ? "Type a message..." : "Go live to chat"}
                      value={chatInput}
                      onChange={(e) => setChatInput(e.target.value)}
                      onKeyPress={(e) => e.key === 'Enter' && sendChatMessage()}
                      disabled={!isLive}
                    />
                    <Button 
                      size="icon"
                      onClick={sendChatMessage}
                      disabled={!isLive || !chatInput.trim()}
                    >
                      <Send className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
          </TabsContent>

          <TabsContent value="accounts" className="space-y-6">
            {/* Account Overview */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              <Card className="glow-primary">
                <CardContent className="pt-6">
                  <div className="text-center">
                    <p className="text-sm text-muted-foreground mb-2">Social Accounts</p>
                    <p className="text-3xl font-bold">{socialPlatforms.filter(p => p.connected).length}/{socialPlatforms.length}</p>
                  </div>
                </CardContent>
              </Card>
              <Card className="glow-accent">
                <CardContent className="pt-6">
                  <div className="text-center">
                    <p className="text-sm text-muted-foreground mb-2">E-Commerce</p>
                    <p className="text-3xl font-bold">{commercePlatforms.filter(p => p.connected).length}/{commercePlatforms.length}</p>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6">
                  <div className="text-center">
                    <p className="text-sm text-muted-foreground mb-2">Total Connected</p>
                    <p className="text-3xl font-bold">{allPlatforms.filter(p => p.connected).length}</p>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Social Media Accounts */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="w-5 h-5" />
                  Social Media Accounts
                </CardTitle>
                <CardDescription>Connect your social media for cross-posting and analytics</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {socialPlatforms.map((platform) => {
                  const Icon = platform.icon;
                  return (
                    <div key={platform.id} className="flex items-center justify-between p-4 border rounded-lg hover:border-primary/50 transition-colors">
                      <div className="flex items-center gap-3">
                        <Icon className="w-6 h-6" />
                        <div>
                          <p className="font-medium">{platform.name}</p>
                          <p className="text-sm text-muted-foreground">
                            {platform.connected ? 'Auto-post enabled' : 'Not connected'}
                          </p>
                        </div>
                      </div>
                      {platform.connected ? (
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="border-green-500 text-green-500">
                            <Check className="w-3 h-3 mr-1" />
                            Connected
                          </Badge>
                          <Button 
                            size="sm" 
                            variant="ghost"
                            onClick={() => disconnectPlatform(platform.id)}
                          >
                            <X className="w-4 h-4" />
                          </Button>
                        </div>
                      ) : (
                        <Button 
                          size="sm"
                          onClick={() => connectPlatform(platform.id)}
                        >
                          Connect
                        </Button>
                      )}
                    </div>
                  );
                })}
              </CardContent>
            </Card>

            {/* E-Commerce & Monetization */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <ShoppingCart className="w-5 h-5" />
                  E-Commerce & Monetization
                </CardTitle>
                <CardDescription>Connect stores and distribution platforms</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {commercePlatforms.map((platform) => {
                  const Icon = platform.icon;
                  return (
                    <div key={platform.id} className="flex items-center justify-between p-4 border rounded-lg hover:border-primary hover:text-primary hover:shadow-[0_0_12px_hsl(var(--primary)/0.35)] transition-colors">
                      <div className="flex items-center gap-3">
                        <Icon className="w-6 h-6" />
                        <div>
                          <p className="font-medium">{platform.name}</p>
                          <p className="text-sm text-muted-foreground">
                            {platform.connected 
                              ? platform.id === 'shopify' 
                                ? 'Store connected' 
                                : 'Distribution enabled'
                              : 'Not connected'}
                          </p>
                        </div>
                      </div>
                      {platform.connected ? (
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="border-green-500 text-green-500">
                            <Check className="w-3 h-3 mr-1" />
                            Connected
                          </Badge>
                          <Button 
                            size="sm" 
                            variant="ghost"
                            onClick={() => disconnectPlatform(platform.id)}
                          >
                            <X className="w-4 h-4" />
                          </Button>
                        </div>
                      ) : (
                        <Button 
                          size="sm"
                          onClick={() => connectPlatform(platform.id)}
                        >
                          Connect
                        </Button>
                      )}
                    </div>
                  );
                })}
              </CardContent>
            </Card>

            {/* Account Management Info */}
            <Card className="border-primary/20">
              <CardHeader>
                <CardTitle>Why Connect Multiple Accounts?</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3 text-sm text-muted-foreground">
                  <div className="flex items-start gap-2">
                    <Check className="w-4 h-4 text-green-500 mt-0.5" />
                    <p><strong>Cross-Post Content:</strong> Share streams and videos across all platforms automatically</p>
                  </div>
                  <div className="flex items-start gap-2">
                    <Check className="w-4 h-4 text-green-500 mt-0.5" />
                    <p><strong>Unified Analytics:</strong> See performance metrics from all platforms in one dashboard</p>
                  </div>
                  <div className="flex items-start gap-2">
                    <Check className="w-4 h-4 text-green-500 mt-0.5" />
                    <p><strong>Monetization:</strong> Connect stores and distribution to earn from your content</p>
                  </div>
                  <div className="flex items-start gap-2">
                    <Check className="w-4 h-4 text-green-500 mt-0.5" />
                    <p><strong>Grow Faster:</strong> Reach audiences on every platform from one control center</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

        </Tabs>
      </div>

      {/* Floating Windows */}
      {windows.map((window) => (
        <FloatingWindow
          key={window.id}
          id={window.id}
          title={window.title}
          onClose={() => closeWindow(window.id)}
          initialX={window.x}
          initialY={window.y}
          width={700}
          height={600}
        >
          {window.content}
        </FloatingWindow>
      ))}
    </div>
  );
};

export default CyberStreamer;