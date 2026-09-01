import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Radio, Send, Zap, Loader2, Video, MessageSquare, BarChart3, UserPlus, Users, ChevronLeft, ChevronRight } from "lucide-react";
import { useIsMobile } from "@/hooks/use-mobile";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel";
import Navigation from "@/components/Navigation";
import FloatingWindow from "@/components/FloatingWindow";
import { useFloatingWindowsContext } from "@/providers/FloatingWindowsProvider";
import { usePlatformChat } from "@/hooks/usePlatformChat";
import { useLiveStream } from "@/hooks/useLiveStream";
import { TipDialog } from "@/components/TipDialog";
import CryptoMarketChart from "@/components/CryptoMarketChart";
import StockMarketWidget from "@/components/StockMarketWidget";
import NFTMarketWidget from "@/components/NFTMarketWidget";
import TradingPlatformsWidget from "@/components/TradingPlatformsWidget";
import { SocialPlatformConnections } from "@/components/SocialPlatformConnections";
import { SocialMediaPoster } from "@/components/SocialMediaPoster";
import { LiveStreamInvitations } from "@/components/LiveStreamInvitations";
import { LiveStreamParticipants } from "@/components/LiveStreamParticipants";
import { StartLiveStreamDialog } from "@/components/StartLiveStreamDialog";
import { InviteToStreamDialog } from "@/components/InviteToStreamDialog";
import { MegaChat } from "@/components/MegaChat";
import { OmegaChat } from "@/components/OmegaChat";
import { supabase } from "@/integrations/supabase/client";

const Studio = () => {
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const [isLive, setIsLive] = useState(false);
  const [connectedPlatforms, setConnectedPlatforms] = useState<string[]>([]);
  const [activePlatforms, setActivePlatforms] = useState<Array<{
    platform: string;
    platform_name: string;
    is_active: boolean;
  }>>([]);
  const [showStartDialog, setShowStartDialog] = useState(false);
  const [showInviteDialog, setShowInviteDialog] = useState(false);
  const [activeCategory, setActiveCategory] = useState<"social" | "affiliate">("social");
  const [activePlatformIndex, setActivePlatformIndex] = useState(0);
  const { windows, openWindow, closeWindow } = useFloatingWindowsContext();
  const { 
    currentStream, 
    participants, 
    invitations,
    startStream, 
    endStream, 
    inviteUser, 
    respondToInvitation,
    makeAdmin,
    muteParticipant,
    blockParticipant,
    kickParticipant
  } = useLiveStream();
  const [messages, setMessages] = useState<Record<string, Array<{ role: "user" | "assistant"; content: string }>>>({
    twitter: [],
    instagram: [],
    tiktok: [],
    youtube: [],
    facebook: [],
    linkedin: [],
    amazon: [],
    clickbank: [],
    shareasale: [],
    cj: []
  });
  const [inputMessages, setInputMessages] = useState<Record<string, string>>({
    twitter: "",
    instagram: "",
    tiktok: "",
    youtube: "",
    facebook: "",
    linkedin: "",
    amazon: "",
    clickbank: "",
    shareasale: "",
    cj: ""
  });
  const [loadingPlatforms, setLoadingPlatforms] = useState<Record<string, boolean>>({
    twitter: false,
    instagram: false,
    tiktok: false,
    youtube: false,
    facebook: false,
    linkedin: false,
    amazon: false,
    clickbank: false,
    shareasale: false,
    cj: false
  });
  const { streamChat } = usePlatformChat();

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) {
        navigate("/auth");
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (!session) {
        navigate("/auth");
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  const socialPlatforms = [
    { id: "twitter", name: "Twitter", color: "bg-blue-500", category: "social" },
    { id: "instagram", name: "Instagram", color: "bg-pink-500", category: "social" },
    { id: "tiktok", name: "TikTok", color: "bg-cyan-500", category: "social" },
    { id: "youtube", name: "YouTube", color: "bg-red-500", category: "social" },
    { id: "facebook", name: "Facebook", color: "bg-blue-600", category: "social" },
    { id: "linkedin", name: "LinkedIn", color: "bg-blue-700", category: "social" },
  ];

  const affiliatePlatforms = [
    { id: "amazon", name: "Amazon Associates", color: "bg-orange-500", category: "affiliate" },
    { id: "clickbank", name: "ClickBank", color: "bg-purple-500", category: "affiliate" },
    { id: "shareasale", name: "ShareASale", color: "bg-green-500", category: "affiliate" },
    { id: "cj", name: "CJ Affiliate", color: "bg-indigo-500", category: "affiliate" },
  ];

  const platforms = [...socialPlatforms, ...affiliatePlatforms];
  const currentCategoryPlatforms = activeCategory === "social" ? socialPlatforms : affiliatePlatforms;

  const togglePlatform = (platformId: string) => {
    setConnectedPlatforms(prev =>
      prev.includes(platformId)
        ? prev.filter(id => id !== platformId)
        : [...prev, platformId]
    );
  };

  const sendMessage = async (platform: string) => {
    if (!inputMessages[platform].trim() || loadingPlatforms[platform]) return;
    
    const userMessage = { role: "user" as const, content: inputMessages[platform] };
    const updatedMessages = [...messages[platform], userMessage];
    
    setMessages(prev => ({
      ...prev,
      [platform]: updatedMessages
    }));
    
    setInputMessages(prev => ({ ...prev, [platform]: "" }));
    setLoadingPlatforms(prev => ({ ...prev, [platform]: true }));

    let assistantContent = "";
    const upsertAssistant = (nextChunk: string) => {
      assistantContent += nextChunk;
      setMessages(prev => {
        const currentMessages = prev[platform];
        const last = currentMessages[currentMessages.length - 1];
        if (last?.role === "assistant") {
          return {
            ...prev,
            [platform]: currentMessages.map((m, i) => 
              i === currentMessages.length - 1 ? { ...m, content: assistantContent } : m
            )
          };
        }
        return {
          ...prev,
          [platform]: [...currentMessages, { role: "assistant" as const, content: assistantContent }]
        };
      });
    };

    await streamChat(
      platform,
      updatedMessages,
      (chunk) => upsertAssistant(chunk),
      () => setLoadingPlatforms(prev => ({ ...prev, [platform]: false }))
    );
  };

  return (
    <div className="min-h-screen bg-background">
      <Navigation onCreatePost={() => {}} />
      {currentStream && <OmegaChat streamId={currentStream.id} streamerId={currentStream.user_id} />}
      
      <main className="container mx-auto px-4 pt-20 pb-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-4xl font-bold text-primary text-glow mb-2">Live Studio</h1>
            <p className="text-muted-foreground">Stream to multiple platforms simultaneously</p>
          </div>
          
          <div className="flex items-center gap-4 flex-wrap">
            {currentStream && (
              <>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setShowInviteDialog(true)}
                >
                  <UserPlus className="w-4 h-4 mr-2" />
                  Invite Users
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={async () => {
                    const { data: { user } } = await supabase.auth.getUser();
                    const currentUserParticipant = participants.find(p => p.user_id === user?.id);
                    const isAdmin = currentUserParticipant?.is_admin || currentUserParticipant?.is_host;
                    
                    openWindow("Participants", (
                      <LiveStreamParticipants 
                        participants={participants}
                        currentUserId={user?.id}
                        isCurrentUserAdmin={isAdmin}
                        onMakeAdmin={makeAdmin}
                        onMute={muteParticipant}
                        onBlock={blockParticipant}
                        onKick={kickParticipant}
                      />
                    ));
                  }}
                >
                  <Users className="w-4 h-4 mr-2" />
                  Participants ({participants.length})
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    if (currentStream) {
                      openWindow("Mega Chat", (
                        <MegaChat streamId={currentStream.id} />
                      ));
                    }
                  }}
                >
                  <MessageSquare className="w-4 h-4 mr-2" />
                  Mega Chat
                </Button>
              </>
            )}
            
            <Button
              size="sm"
              variant="outline"
              onClick={() => openWindow("Stream Preview", (
                <div className="aspect-video bg-black rounded-lg flex items-center justify-center">
                  <div className="text-center">
                    <Video className="w-16 h-16 mx-auto mb-4 text-primary" />
                    <p className="text-xl font-bold">Stream Preview</p>
                  </div>
                </div>
              ))}
            >
              <Video className="w-4 h-4 mr-2" />
              Preview
            </Button>
            
            {/* Trading Widgets */}
            <Button
              size="sm"
              variant="outline"
              onClick={() => openWindow("Trading Platforms", <TradingPlatformsWidget />)}
            >
              <BarChart3 className="w-4 h-4 mr-2" />
              Platforms
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => openWindow("Crypto Markets", <CryptoMarketChart />)}
            >
              <BarChart3 className="w-4 h-4 mr-2" />
              Crypto
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => openWindow("Stock Market", <StockMarketWidget />)}
            >
              <BarChart3 className="w-4 h-4 mr-2" />
              Stocks
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => openWindow("NFT Marketplace", <NFTMarketWidget />)}
            >
              <BarChart3 className="w-4 h-4 mr-2" />
              NFTs
            </Button>
            {connectedPlatforms.map(platformId => {
              const platform = platforms.find(p => p.id === platformId);
              return (
                <Button
                  key={platformId}
                  size="sm"
                  variant="outline"
                  onClick={() => openWindow(`${platform?.name} Chat`, (
                    <div className="space-y-4">
                      <div className="h-[400px] bg-muted/10 rounded-lg p-4 overflow-y-auto">
                        {messages[platformId].map((msg, idx) => (
                          <div key={idx} className={`p-3 rounded-lg mb-2 ${msg.role === "user" ? "bg-primary/20" : "bg-card/70"}`}>
                            <div className="text-xs text-muted-foreground mb-1">
                              {msg.role === "user" ? "You" : `${platform?.name} Bot`}
                            </div>
                            <div>{msg.content}</div>
                          </div>
                        ))}
                      </div>
                      <div className="flex gap-2">
                        <Input placeholder="Type message..." />
                        <Button size="icon"><Send className="w-4 h-4" /></Button>
                      </div>
                    </div>
                  ))}
                >
                  <MessageSquare className="w-4 h-4 mr-2" />
                  {platform?.name}
                </Button>
              );
            })}
            {currentStream && (
              <>
                <Badge variant="destructive" className="animate-pulse">
                  <Radio className="w-4 h-4 mr-1" />
                  LIVE
                </Badge>
                <TipDialog creatorName="Your Stream" />
              </>
            )}
            <Button
              onClick={() => currentStream ? endStream() : setShowStartDialog(true)}
              variant={currentStream ? "destructive" : "default"}
              className={currentStream ? "" : "glow-primary"}
            >
              {currentStream ? "End Stream" : "Go Live"}
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Live Preview */}
          <Card className="lg:col-span-2 p-6 bg-card/50 backdrop-blur border-primary/20">
            <div className="aspect-video bg-muted/20 rounded-lg flex items-center justify-center mb-4 border border-primary/10">
              <div className="text-center">
                <Zap className="w-16 h-16 text-primary mx-auto mb-2" />
                <p className="text-muted-foreground">Camera Preview</p>
              </div>
            </div>
            
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-foreground">Connected Platforms</h3>
              
              {/* Category Tabs */}
              <Tabs value={activeCategory} onValueChange={(v) => setActiveCategory(v as "social" | "affiliate")} className="w-full">
                <TabsList className="w-full grid grid-cols-2">
                  <TabsTrigger value="social">Social Media</TabsTrigger>
                  <TabsTrigger value="affiliate">Affiliate</TabsTrigger>
                </TabsList>
                
                <TabsContent value="social" className="mt-4">
                  {isMobile ? (
                    /* Mobile/Tablet: Swipeable Carousel */
                    <Carousel className="w-full">
                      <CarouselContent>
                        {socialPlatforms.map(platform => {
                          const isConnected = activePlatforms.some(
                            ap => ap.platform.toLowerCase() === platform.id.toLowerCase() && ap.is_active
                          );
                          return (
                            <CarouselItem key={platform.id} className="basis-1/2 md:basis-1/3">
                              <div className="p-1">
                                <Button
                                  variant={connectedPlatforms.includes(platform.id) ? "default" : "outline"}
                                  onClick={() => togglePlatform(platform.id)}
                                  className={`w-full relative ${connectedPlatforms.includes(platform.id) ? platform.color : ""}`}
                                >
                                  <span className={`absolute left-2 top-1/2 -translate-y-1/2 w-2 h-2 rounded-full ${
                                    isConnected ? 'bg-green-500 animate-pulse' : 'bg-red-500'
                                  }`}></span>
                                  <span className="ml-3">{platform.name}</span>
                                </Button>
                              </div>
                            </CarouselItem>
                          );
                        })}
                      </CarouselContent>
                      <CarouselPrevious />
                      <CarouselNext />
                    </Carousel>
                  ) : (
                    /* Desktop: Grid with Arrow Navigation */
                    <div className="relative">
                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="icon"
                          onClick={() => setActivePlatformIndex(Math.max(0, activePlatformIndex - 1))}
                          disabled={activePlatformIndex === 0}
                        >
                          <ChevronLeft className="w-4 h-4" />
                        </Button>
                        <div className="flex-1 flex flex-wrap gap-2">
                          {socialPlatforms.map(platform => {
                            const isConnected = activePlatforms.some(
                              ap => ap.platform.toLowerCase() === platform.id.toLowerCase() && ap.is_active
                            );
                            return (
                              <Button
                                key={platform.id}
                                variant={connectedPlatforms.includes(platform.id) ? "default" : "outline"}
                                onClick={() => togglePlatform(platform.id)}
                                className={`relative ${connectedPlatforms.includes(platform.id) ? platform.color : ""}`}
                              >
                                <span className={`absolute left-2 top-1/2 -translate-y-1/2 w-2 h-2 rounded-full ${
                                  isConnected ? 'bg-green-500 animate-pulse' : 'bg-red-500'
                                }`}></span>
                                <span className="ml-3">{platform.name}</span>
                              </Button>
                            );
                          })}
                        </div>
                        <Button
                          variant="outline"
                          size="icon"
                          onClick={() => setActivePlatformIndex(Math.min(socialPlatforms.length - 1, activePlatformIndex + 1))}
                          disabled={activePlatformIndex >= socialPlatforms.length - 1}
                        >
                          <ChevronRight className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  )}
                </TabsContent>
                
                <TabsContent value="affiliate" className="mt-4">
                  {isMobile ? (
                    /* Mobile/Tablet: Swipeable Carousel */
                    <Carousel className="w-full">
                      <CarouselContent>
                        {affiliatePlatforms.map(platform => {
                          const isConnected = activePlatforms.some(
                            ap => ap.platform.toLowerCase() === platform.id.toLowerCase() && ap.is_active
                          );
                          return (
                            <CarouselItem key={platform.id} className="basis-1/2 md:basis-1/3">
                              <div className="p-1">
                                <Button
                                  variant={connectedPlatforms.includes(platform.id) ? "default" : "outline"}
                                  onClick={() => togglePlatform(platform.id)}
                                  className={`w-full relative ${connectedPlatforms.includes(platform.id) ? platform.color : ""}`}
                                >
                                  <span className={`absolute left-2 top-1/2 -translate-y-1/2 w-2 h-2 rounded-full ${
                                    isConnected ? 'bg-green-500 animate-pulse' : 'bg-red-500'
                                  }`}></span>
                                  <span className="ml-3">{platform.name}</span>
                                </Button>
                              </div>
                            </CarouselItem>
                          );
                        })}
                      </CarouselContent>
                      <CarouselPrevious />
                      <CarouselNext />
                    </Carousel>
                  ) : (
                    /* Desktop: Grid with Arrow Navigation */
                    <div className="relative">
                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="icon"
                          onClick={() => setActivePlatformIndex(Math.max(0, activePlatformIndex - 1))}
                          disabled={activePlatformIndex === 0}
                        >
                          <ChevronLeft className="w-4 h-4" />
                        </Button>
                        <div className="flex-1 flex flex-wrap gap-2">
                          {affiliatePlatforms.map(platform => {
                            const isConnected = activePlatforms.some(
                              ap => ap.platform.toLowerCase() === platform.id.toLowerCase() && ap.is_active
                            );
                            return (
                              <Button
                                key={platform.id}
                                variant={connectedPlatforms.includes(platform.id) ? "default" : "outline"}
                                onClick={() => togglePlatform(platform.id)}
                                className={`relative ${connectedPlatforms.includes(platform.id) ? platform.color : ""}`}
                              >
                                <span className={`absolute left-2 top-1/2 -translate-y-1/2 w-2 h-2 rounded-full ${
                                  isConnected ? 'bg-green-500 animate-pulse' : 'bg-red-500'
                                }`}></span>
                                <span className="ml-3">{platform.name}</span>
                              </Button>
                            );
                          })}
                        </div>
                        <Button
                          variant="outline"
                          size="icon"
                          onClick={() => setActivePlatformIndex(Math.min(affiliatePlatforms.length - 1, activePlatformIndex + 1))}
                          disabled={activePlatformIndex >= affiliatePlatforms.length - 1}
                        >
                          <ChevronRight className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  )}
                </TabsContent>
              </Tabs>
              
              <div className="mt-6">
                <SocialPlatformConnections onConnectionsUpdate={setActivePlatforms} />
              </div>
              
              {activePlatforms.length > 0 && (
                <div className="mt-6">
                  <SocialMediaPoster connectedPlatforms={activePlatforms} />
                </div>
              )}
            </div>
          </Card>

          {/* Chat Panel */}
          <Card className="p-6 bg-card/50 backdrop-blur border-primary/20">
            <h3 className="text-lg font-semibold text-foreground mb-4">Live Chat</h3>
            
            {connectedPlatforms.length === 0 ? (
              <div className="text-center text-muted-foreground py-8">
                Connect platforms to see chats
              </div>
            ) : (
              <Tabs defaultValue={connectedPlatforms[0]} className="w-full">
                <TabsList className="w-full">
                  {connectedPlatforms.map(platformId => {
                    const platform = platforms.find(p => p.id === platformId);
                    const isConnected = activePlatforms.some(
                      ap => ap.platform.toLowerCase() === platformId.toLowerCase() && ap.is_active
                    );
                    return (
                      <TabsTrigger key={platformId} value={platformId} className="flex-1 relative">
                        <span className={`absolute left-2 top-1/2 -translate-y-1/2 w-2 h-2 rounded-full ${
                          isConnected ? 'bg-green-500 animate-pulse' : 'bg-red-500'
                        }`}></span>
                        <span className="ml-3">{platform?.name}</span>
                      </TabsTrigger>
                    );
                  })}
                </TabsList>
                
                {connectedPlatforms.map(platformId => (
                  <TabsContent key={platformId} value={platformId} className="space-y-4">
                    <div className="h-[400px] bg-muted/10 rounded-lg p-4 overflow-y-auto border border-primary/10">
                      {messages[platformId].length === 0 ? (
                        <p className="text-muted-foreground text-sm">No messages yet. Start chatting with your platform AI bot!</p>
                      ) : (
                        <div className="space-y-3">
                          {messages[platformId].map((msg, idx) => (
                            <div 
                              key={idx} 
                              className={`p-3 rounded-lg ${
                                msg.role === "user" 
                                  ? "bg-primary/20 ml-8" 
                                  : "bg-card/70 mr-8"
                              }`}
                            >
                              <div className="text-xs text-muted-foreground mb-1">
                                {msg.role === "user" ? "You" : `${platforms.find(p => p.id === platformId)?.name} Bot`}
                              </div>
                              <div className="text-foreground whitespace-pre-wrap">{msg.content}</div>
                            </div>
                          ))}
                          {loadingPlatforms[platformId] && (
                            <div className="flex items-center gap-2 text-muted-foreground">
                              <Loader2 className="w-4 h-4 animate-spin" />
                              <span className="text-sm">AI is typing...</span>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                    
                    <div className="flex gap-2">
                      <Input
                        placeholder="Type a message..."
                        value={inputMessages[platformId]}
                        onChange={(e) => setInputMessages(prev => ({ ...prev, [platformId]: e.target.value }))}
                        onKeyPress={(e) => e.key === "Enter" && sendMessage(platformId)}
                        className="flex-1"
                      />
                      <Button 
                        onClick={() => sendMessage(platformId)} 
                        size="icon"
                        disabled={loadingPlatforms[platformId]}
                      >
                        {loadingPlatforms[platformId] ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <Send className="w-4 h-4" />
                        )}
                      </Button>
                    </div>
                  </TabsContent>
                ))}
              </Tabs>
            )}
          </Card>
        </div>
      </main>

      {/* Live Stream Invitations */}
      <LiveStreamInvitations 
        invitations={invitations} 
        onRespond={respondToInvitation}
      />

      {/* Live Stream Dialogs */}
      <StartLiveStreamDialog 
        open={showStartDialog}
        onOpenChange={setShowStartDialog}
        onStart={startStream}
      />
      
      <InviteToStreamDialog
        open={showInviteDialog}
        onOpenChange={setShowInviteDialog}
        streamId={currentStream?.id || ""}
        onInvite={inviteUser}
      />

      {/* Floating Windows */}
      {windows.map((window) => (
        <FloatingWindow
          key={window.id}
          id={window.id}
          title={window.title}
          onClose={() => closeWindow(window.id)}
          initialX={window.x}
          initialY={window.y}
          width={600}
          height={500}
        >
          {window.content}
        </FloatingWindow>
      ))}
    </div>
  );
};

export default Studio;
