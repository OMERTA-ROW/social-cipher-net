import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Loader2, Shield, TrendingUp, RefreshCw, Eye, Brain, Zap } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";

export const AIEcosystemDashboard = () => {
  const [loading, setLoading] = useState(false);
  const [autoMode, setAutoMode] = useState(false);
  const [ecosystemStatus, setEcosystemStatus] = useState<any>(null);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    
    if (autoMode) {
      // Run ecosystem checks every 5 minutes in auto mode
      runFullEcosystemCheck();
      interval = setInterval(() => {
        runFullEcosystemCheck();
      }, 5 * 60 * 1000);
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [autoMode]);

  const runFullEcosystemCheck = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('cyberlink-ai-ecosystem', {
        body: { action: 'full_analysis' }
      });

      if (error) throw error;

      setEcosystemStatus(data);
      setLastUpdate(new Date());
      
      toast.success("AI Ecosystem Analysis Complete", {
        description: "System health check completed successfully"
      });
    } catch (error: any) {
      console.error('Ecosystem check error:', error);
      toast.error("Ecosystem Check Failed", {
        description: error.message
      });
    } finally {
      setLoading(false);
    }
  };

  const runSpecificAction = async (action: string, title: string) => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('cyberlink-ai-ecosystem', {
        body: { action }
      });

      if (error) throw error;

      toast.success(`${title} Complete`, {
        description: "Analysis completed successfully"
      });

      // Refresh full status
      await runFullEcosystemCheck();
    } catch (error: any) {
      console.error(`${action} error:`, error);
      toast.error(`${title} Failed`, {
        description: error.message
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative space-y-6">
      {/* Space-themed overlay effect */}
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-background/5 to-transparent pointer-events-none" />
      
      <div className="max-w-7xl mx-auto space-y-6 relative z-10">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-bold bg-gradient-to-r from-cyan-400 via-purple-400 to-pink-400 bg-clip-text text-transparent animate-pulse">
              🤖 AI Infinity Multiverse Algorithm
            </h1>
            <p className="text-cyan-300/80 mt-2">
              Infinite Expansion • Self-Evolution • Cosmic Intelligence
            </p>
          </div>
          <div className="flex items-center gap-4">
            <Button
              variant={autoMode ? "default" : "outline"}
              onClick={() => setAutoMode(!autoMode)}
              className="gap-2"
            >
              <Zap className="h-4 w-4" />
              {autoMode ? "Auto Mode: ON" : "Auto Mode: OFF"}
            </Button>
            <Button
              onClick={runFullEcosystemCheck}
              disabled={loading}
              className="gap-2"
            >
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <RefreshCw className="h-4 w-4" />
              )}
              Run Full Check
            </Button>
          </div>
        </div>

        {/* Status Overview */}
        {lastUpdate && (
          <Card className="bg-background/40 backdrop-blur-xl border-primary/20 shadow-2xl shadow-primary/10 relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/5 via-purple-500/5 to-pink-500/5 animate-pulse" />
            <CardContent className="pt-6 relative z-10">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="h-12 w-12 rounded-full bg-cyan-500/20 flex items-center justify-center animate-pulse">
                    <Brain className="h-6 w-6 text-cyan-400" />
                  </div>
                  <div>
                    <p className="text-sm text-cyan-400/60">Last Cosmic Analysis</p>
                    <p className="text-lg font-semibold text-cyan-300">{lastUpdate.toLocaleString()}</p>
                  </div>
                </div>
                <Badge variant="outline" className="text-green-400 border-green-400 bg-green-400/10">
                  Multiverse Active
                </Badge>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Action Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <Card className="hover:border-primary/50 transition-colors cursor-pointer">
            <CardHeader>
              <div className="flex items-center gap-2">
                <Eye className="h-5 w-5 text-blue-500" />
                <CardTitle className="text-lg">Self-Monitor</CardTitle>
              </div>
              <CardDescription>
                Continuous system health and performance monitoring
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button
                onClick={() => runSpecificAction('self_monitor', 'Self-Monitor')}
                disabled={loading}
                variant="outline"
                className="w-full"
              >
                Run Monitoring
              </Button>
            </CardContent>
          </Card>

          <Card className="hover:border-primary/50 transition-colors cursor-pointer">
            <CardHeader>
              <div className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-green-500" />
                <CardTitle className="text-lg">Self-Enhance</CardTitle>
              </div>
              <CardDescription>
                Identify optimization and improvement opportunities
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button
                onClick={() => runSpecificAction('self_enhance', 'Self-Enhance')}
                disabled={loading}
                variant="outline"
                className="w-full"
              >
                Analyze Enhancements
              </Button>
            </CardContent>
          </Card>

          <Card className="hover:border-primary/50 transition-colors cursor-pointer">
            <CardHeader>
              <div className="flex items-center gap-2">
                <RefreshCw className="h-5 w-5 text-purple-500" />
                <CardTitle className="text-lg">Auto-Update</CardTitle>
              </div>
              <CardDescription>
                Check for and apply system updates automatically
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button
                onClick={() => runSpecificAction('auto_update', 'Auto-Update')}
                disabled={loading}
                variant="outline"
                className="w-full"
              >
                Check Updates
              </Button>
            </CardContent>
          </Card>

          <Card className="hover:border-primary/50 transition-colors cursor-pointer">
            <CardHeader>
              <div className="flex items-center gap-2">
                <Shield className="h-5 w-5 text-red-500" />
                <CardTitle className="text-lg">Self-Protect</CardTitle>
              </div>
              <CardDescription>
                Detect threats and implement protection measures
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button
                onClick={() => runSpecificAction('self_protect', 'Self-Protect')}
                disabled={loading}
                variant="outline"
                className="w-full"
              >
                Run Protection
              </Button>
            </CardContent>
          </Card>

          <Card className="hover:border-primary/50 transition-colors cursor-pointer">
            <CardHeader>
              <div className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-pink-500" />
                <CardTitle className="text-lg">Viral Trends</CardTitle>
              </div>
              <CardDescription>
                Analyze viral trends, YouTube, TikTok & Snapchat algorithms
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button
                onClick={() => runSpecificAction('viral_trends', 'Viral Trends')}
                disabled={loading}
                variant="outline"
                className="w-full"
              >
                Analyze Trends
              </Button>
            </CardContent>
          </Card>

          <Card className="hover:border-primary/50 transition-colors cursor-pointer">
            <CardHeader>
              <div className="flex items-center gap-2">
                <Brain className="h-5 w-5 text-orange-500" />
                <CardTitle className="text-lg">AI Learning</CardTitle>
              </div>
              <CardDescription>
                System learns from patterns and user behavior
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Learning Progress</span>
                  <span>78%</span>
                </div>
                <Progress value={78} />
              </div>
            </CardContent>
          </Card>

          <Card className="hover:border-primary/50 transition-colors cursor-pointer">
            <CardHeader>
              <div className="flex items-center gap-2">
                <Zap className="h-5 w-5 text-yellow-500" />
                <CardTitle className="text-lg">Performance</CardTitle>
              </div>
              <CardDescription>
                Real-time system performance metrics
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>System Health</span>
                  <span className="text-green-500">Excellent</span>
                </div>
                <Progress value={95} className="bg-green-500/20" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Results Display */}
        {ecosystemStatus && (
          <Card className="bg-background/30 backdrop-blur-xl border-cyan-500/30 shadow-2xl shadow-cyan-500/10 relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/5 via-purple-500/5 to-pink-500/5" />
            <CardHeader className="relative z-10">
              <CardTitle className="text-cyan-300 flex items-center gap-2">
                <Brain className="h-5 w-5 text-cyan-400 animate-pulse" />
                Cosmic Intelligence Analysis
              </CardTitle>
              <CardDescription className="text-cyan-400/60">
                Multiverse ecosystem analysis and cosmic recommendations
              </CardDescription>
            </CardHeader>
            <CardContent className="relative z-10">
              <Tabs defaultValue="overview" className="w-full">
                <TabsList className="grid w-full grid-cols-4">
                  <TabsTrigger value="overview">Overview</TabsTrigger>
                  <TabsTrigger value="security">Security</TabsTrigger>
                  <TabsTrigger value="performance">Performance</TabsTrigger>
                  <TabsTrigger value="recommendations">Actions</TabsTrigger>
                </TabsList>

                <TabsContent value="overview" className="space-y-4 mt-4">
                  <div className="prose prose-sm max-w-none dark:prose-invert">
                    <pre className="bg-muted p-4 rounded-lg overflow-auto">
                      {JSON.stringify(ecosystemStatus, null, 2)}
                    </pre>
                  </div>
                </TabsContent>

                <TabsContent value="security" className="space-y-4 mt-4">
                  <p className="text-muted-foreground">
                    Security analysis and threat assessment
                  </p>
                </TabsContent>

                <TabsContent value="performance" className="space-y-4 mt-4">
                  <p className="text-muted-foreground">
                    Performance metrics and optimization recommendations
                  </p>
                </TabsContent>

                <TabsContent value="recommendations" className="space-y-4 mt-4">
                  <p className="text-muted-foreground">
                    Prioritized action items and improvement suggestions
                  </p>
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};
