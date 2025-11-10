import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import Navigation from "@/components/Navigation";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { 
  Radio, 
  Users, 
  Eye, 
  TrendingUp, 
  MessageSquare, 
  Settings,
  Play,
  StopCircle,
  Activity
} from "lucide-react";
import { toast } from "sonner";

interface StreamStats {
  viewers: number;
  chatMessages: number;
  duration: number;
  peakViewers: number;
}

const CyberStreamer = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [isLive, setIsLive] = useState(false);
  const [streamStats, setStreamStats] = useState<StreamStats>({
    viewers: 0,
    chatMessages: 0,
    duration: 0,
    peakViewers: 0
  });

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      navigate("/auth");
      return;
    }
    setLoading(false);
  };

  const handleGoLive = () => {
    navigate("/studio");
    toast.success("Launching Cyber Live Studio...");
  };

  const startStream = () => {
    setIsLive(true);
    toast.success("Stream started! Go to Studio to broadcast.");
  };

  const stopStream = () => {
    setIsLive(false);
    toast.info("Stream ended");
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Navigation />
        <div className="container mx-auto px-4 pt-24 pb-12">
          <div className="text-center">Loading...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      <div className="container mx-auto px-4 pt-24 pb-12 max-w-7xl">
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-bold text-glow mb-2">Cyber Streamer</h1>
            <p className="text-muted-foreground">Manage your streams and connect with your audience</p>
          </div>
          <div className="flex gap-3">
            {isLive ? (
              <>
                <Badge variant="default" className="bg-red-500 animate-pulse">
                  <Activity className="w-3 h-3 mr-1" />
                  LIVE
                </Badge>
                <Button onClick={stopStream} variant="destructive">
                  <StopCircle className="w-4 h-4 mr-2" />
                  End Stream
                </Button>
              </>
            ) : (
              <Button onClick={startStream} className="glow-primary">
                <Play className="w-4 h-4 mr-2" />
                Start Stream
              </Button>
            )}
            <Button onClick={handleGoLive} variant="outline" className="glow-accent">
              <Radio className="w-4 h-4 mr-2" />
              Open Studio
            </Button>
          </div>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <Card className="glow-primary">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2">
                <Eye className="w-4 h-4" />
                Current Viewers
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{streamStats.viewers}</div>
            </CardContent>
          </Card>

          <Card className="glow-accent">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2">
                <TrendingUp className="w-4 h-4" />
                Peak Viewers
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{streamStats.peakViewers}</div>
            </CardContent>
          </Card>

          <Card className="border-primary/20">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2">
                <MessageSquare className="w-4 h-4" />
                Chat Messages
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{streamStats.chatMessages}</div>
            </CardContent>
          </Card>

          <Card className="border-accent/20">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2">
                <Activity className="w-4 h-4" />
                Stream Duration
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{streamStats.duration}m</div>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="dashboard" className="space-y-6">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="dashboard">
              <Activity className="w-4 h-4 mr-2" />
              Dashboard
            </TabsTrigger>
            <TabsTrigger value="analytics">
              <TrendingUp className="w-4 h-4 mr-2" />
              Analytics
            </TabsTrigger>
            <TabsTrigger value="settings">
              <Settings className="w-4 h-4 mr-2" />
              Settings
            </TabsTrigger>
          </TabsList>

          <TabsContent value="dashboard" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Stream Status */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Radio className="w-5 h-5" />
                    Stream Status
                  </CardTitle>
                  <CardDescription>Monitor your live stream performance</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Stream Quality</span>
                    <Badge variant="outline">1080p 60fps</Badge>
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span>Bitrate</span>
                      <span className="text-muted-foreground">6000 kbps</span>
                    </div>
                    <Progress value={85} className="h-2" />
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span>Connection Stability</span>
                      <span className="text-green-500">Excellent</span>
                    </div>
                    <Progress value={95} className="h-2" />
                  </div>
                  <Button 
                    onClick={handleGoLive}
                    className="w-full mt-4"
                    variant="default"
                  >
                    <Radio className="w-4 h-4 mr-2" />
                    Go to Cyber Live Studio
                  </Button>
                </CardContent>
              </Card>

              {/* Audience Engagement */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Users className="w-5 h-5" />
                    Audience Engagement
                  </CardTitle>
                  <CardDescription>Real-time viewer interaction metrics</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm">Active Chatters</span>
                      <span className="text-sm font-bold">0</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm">New Followers</span>
                      <span className="text-sm font-bold text-primary">+0</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm">Engagement Rate</span>
                      <span className="text-sm font-bold text-accent">0%</span>
                    </div>
                  </div>
                  <div className="pt-4 border-t">
                    <p className="text-sm text-muted-foreground mb-3">Top Viewers</p>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">Start streaming to see viewers</span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Recent Streams */}
            <Card>
              <CardHeader>
                <CardTitle>Recent Streams</CardTitle>
                <CardDescription>Your streaming history and performance</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-center py-8 text-muted-foreground">
                  <Radio className="w-12 h-12 mx-auto mb-3 opacity-50" />
                  <p>No recent streams</p>
                  <p className="text-sm mt-2">Start your first stream to see it here</p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="analytics" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="w-5 h-5" />
                  Growth Analytics
                </CardTitle>
                <CardDescription>Track your channel growth and performance</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <p className="text-sm text-muted-foreground">Total Watch Time</p>
                      <p className="text-2xl font-bold">0 hrs</p>
                      <p className="text-xs text-green-500">+0% from last week</p>
                    </div>
                    <div className="space-y-2">
                      <p className="text-sm text-muted-foreground">Average Viewers</p>
                      <p className="text-2xl font-bold">0</p>
                      <p className="text-xs text-green-500">+0% from last week</p>
                    </div>
                    <div className="space-y-2">
                      <p className="text-sm text-muted-foreground">Total Followers</p>
                      <p className="text-2xl font-bold">0</p>
                      <p className="text-xs text-green-500">+0 new</p>
                    </div>
                  </div>
                  <div className="pt-6 border-t">
                    <div className="h-64 flex items-center justify-center border border-dashed rounded-lg">
                      <div className="text-center text-muted-foreground">
                        <TrendingUp className="w-12 h-12 mx-auto mb-3 opacity-50" />
                        <p>Analytics Chart</p>
                        <p className="text-sm mt-2">Start streaming to see your analytics</p>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="settings" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Settings className="w-5 h-5" />
                  Stream Settings
                </CardTitle>
                <CardDescription>Configure your streaming preferences</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-4">
                  <div>
                    <label className="text-sm font-medium mb-2 block">Stream Title</label>
                    <input
                      type="text"
                      placeholder="Enter your stream title..."
                      className="w-full px-4 py-2 bg-secondary border border-border rounded-lg"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium mb-2 block">Stream Category</label>
                    <select className="w-full px-4 py-2 bg-secondary border border-border rounded-lg">
                      <option>Gaming</option>
                      <option>Music</option>
                      <option>Art</option>
                      <option>Technology</option>
                      <option>Just Chatting</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-sm font-medium mb-2 block">Stream Description</label>
                    <textarea
                      rows={4}
                      placeholder="Describe your stream..."
                      className="w-full px-4 py-2 bg-secondary border border-border rounded-lg"
                    />
                  </div>
                </div>
                <div className="flex gap-3 pt-4 border-t">
                  <Button className="flex-1">Save Settings</Button>
                  <Button 
                    variant="outline"
                    onClick={handleGoLive}
                  >
                    <Radio className="w-4 h-4 mr-2" />
                    Test in Studio
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default CyberStreamer;