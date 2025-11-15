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
  const [criticalUpdates, setCriticalUpdates] = useState<any[]>([]);
  const [liveMetrics, setLiveMetrics] = useState({
    stockMarket: { status: 'monitoring', lastPrice: 0, change: 0 },
    crypto: { status: 'monitoring', lastPrice: 0, change: 0 },
    nft: { status: 'monitoring', volume: 0, change: 0 },
    binaryOptions: { status: 'monitoring', signals: 0, accuracy: 0 },
    nasa: { status: 'monitoring', updates: 0, events: 0 },
    web3: { status: 'monitoring', gasPrice: 0, transactions: 0, defi: 0 },
    constellations: { 
      status: 'monitoring', 
      activeStars: 0, 
      magnitude: 0, 
      visibleConstellations: [] as string[],
      currentConstellation: '',
      stellarActivity: 0
    }
  });

  useEffect(() => {
    let ecosystemInterval: NodeJS.Timeout;
    let criticalInterval: NodeJS.Timeout;
    
    // Critical updates every 500ms
    criticalInterval = setInterval(() => {
      updateLiveMetrics();
    }, 500);
    
    if (autoMode) {
      // Run ecosystem checks every 30 seconds in auto mode
      runFullEcosystemCheck();
      ecosystemInterval = setInterval(() => {
        runFullEcosystemCheck();
      }, 30 * 1000);
    }

    return () => {
      if (ecosystemInterval) clearInterval(ecosystemInterval);
      if (criticalInterval) clearInterval(criticalInterval);
    };
  }, [autoMode]);

  const updateLiveMetrics = () => {
    // Simulate real-time market updates with millisecond precision
    const now = Date.now();
    
    // NASA Star Constellations data
    const constellations = [
      'Orion', 'Ursa Major', 'Cassiopeia', 'Andromeda', 'Perseus',
      'Draco', 'Cygnus', 'Lyra', 'Aquila', 'Pegasus', 'Scorpius',
      'Sagittarius', 'Gemini', 'Leo', 'Virgo', 'Taurus'
    ];
    const visibleCount = Math.floor(5 + Math.random() * 7);
    const visibleConstellations = [...constellations]
      .sort(() => Math.random() - 0.5)
      .slice(0, visibleCount);
    
    setLiveMetrics(prev => ({
      stockMarket: {
        status: 'active',
        lastPrice: 45000 + Math.random() * 1000,
        change: (Math.random() - 0.5) * 5
      },
      crypto: {
        status: 'active',
        lastPrice: 98000 + Math.random() * 2000,
        change: (Math.random() - 0.5) * 3
      },
      nft: {
        status: 'active',
        volume: Math.floor(Math.random() * 1000000),
        change: (Math.random() - 0.5) * 10
      },
      binaryOptions: {
        status: 'active',
        signals: Math.floor(Math.random() * 100),
        accuracy: 75 + Math.random() * 20
      },
      nasa: {
        status: 'active',
        updates: Math.floor(Math.random() * 50),
        events: Math.floor(Math.random() * 10)
      },
      web3: {
        status: 'active',
        gasPrice: Math.floor(20 + Math.random() * 100),
        transactions: Math.floor(Math.random() * 500),
        defi: Math.floor(Math.random() * 10000)
      },
      constellations: {
        status: 'active',
        activeStars: Math.floor(1000 + Math.random() * 5000),
        magnitude: parseFloat((-6 + Math.random() * 12).toFixed(2)),
        visibleConstellations,
        currentConstellation: visibleConstellations[0],
        stellarActivity: Math.floor(50 + Math.random() * 150)
      }
    }));

    // Generate critical AI alerts for significant changes
    if (Math.random() > 0.92) {
      const alertTypes = [
        { type: '🔴 CRITICAL SURGE', category: 'crypto' },
        { type: '⚡ MARKET SHIFT', category: 'stock' },
        { type: '🌌 NASA EVENT', category: 'nasa' },
        { type: '💎 WEB3 OPPORTUNITY', category: 'web3' },
        { type: '🚀 NFT SPIKE', category: 'nft' },
        { type: '⚠️ GAS ALERT', category: 'web3' },
        { type: '⭐ CONSTELLATION SHIFT', category: 'constellation' },
        { type: '✨ STELLAR SURGE', category: 'constellation' },
        { type: '🌟 COSMIC ALIGNMENT', category: 'constellation' }
      ];
      const alert = alertTypes[Math.floor(Math.random() * alertTypes.length)];
      const newAlert = {
        id: now,
        type: alert.type,
        category: alert.category,
        message: `Critical AI detected ${alert.category.toUpperCase()} movement at ${new Date(now).toLocaleTimeString()}.${now % 1000}`,
        timestamp: new Date(),
        severity: Math.random() > 0.7 ? 'high' : 'medium'
      };
      setCriticalUpdates(prev => [newAlert, ...prev].slice(0, 8));
      
      toast.error(newAlert.type, {
        description: newAlert.message,
        duration: 3000
      });
    }
  };

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

        {/* Critical Live Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-7 gap-4 mb-6">
          <Card className="bg-background/40 backdrop-blur-xl border-green-500/30 relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-green-500/10 to-transparent animate-pulse" />
            <CardContent className="pt-4 relative z-10">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs text-green-400">STOCK MARKET</span>
                <div className="h-2 w-2 rounded-full bg-green-400 animate-pulse" />
              </div>
              <div className="text-2xl font-bold text-green-300">
                ${liveMetrics.stockMarket.lastPrice.toFixed(2)}
              </div>
              <div className={`text-xs ${liveMetrics.stockMarket.change >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                {liveMetrics.stockMarket.change >= 0 ? '↑' : '↓'} {Math.abs(liveMetrics.stockMarket.change).toFixed(2)}%
              </div>
            </CardContent>
          </Card>

          <Card className="bg-background/40 backdrop-blur-xl border-orange-500/30 relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-orange-500/10 to-transparent animate-pulse" />
            <CardContent className="pt-4 relative z-10">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs text-orange-400">CRYPTO</span>
                <div className="h-2 w-2 rounded-full bg-orange-400 animate-pulse" />
              </div>
              <div className="text-2xl font-bold text-orange-300">
                ${liveMetrics.crypto.lastPrice.toFixed(2)}
              </div>
              <div className={`text-xs ${liveMetrics.crypto.change >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                {liveMetrics.crypto.change >= 0 ? '↑' : '↓'} {Math.abs(liveMetrics.crypto.change).toFixed(2)}%
              </div>
            </CardContent>
          </Card>

          <Card className="bg-background/40 backdrop-blur-xl border-purple-500/30 relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-purple-500/10 to-transparent animate-pulse" />
            <CardContent className="pt-4 relative z-10">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs text-purple-400">NFT MARKET</span>
                <div className="h-2 w-2 rounded-full bg-purple-400 animate-pulse" />
              </div>
              <div className="text-2xl font-bold text-purple-300">
                ${(liveMetrics.nft.volume / 1000).toFixed(1)}K
              </div>
              <div className={`text-xs ${liveMetrics.nft.change >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                {liveMetrics.nft.change >= 0 ? '↑' : '↓'} {Math.abs(liveMetrics.nft.change).toFixed(2)}%
              </div>
            </CardContent>
          </Card>

          <Card className="bg-background/40 backdrop-blur-xl border-blue-500/30 relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-blue-500/10 to-transparent animate-pulse" />
            <CardContent className="pt-4 relative z-10">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs text-blue-400">BINARY OPTIONS</span>
                <div className="h-2 w-2 rounded-full bg-blue-400 animate-pulse" />
              </div>
              <div className="text-2xl font-bold text-blue-300">
                {liveMetrics.binaryOptions.signals}
              </div>
              <div className="text-xs text-blue-400">
                {liveMetrics.binaryOptions.accuracy.toFixed(1)}% Accuracy
              </div>
            </CardContent>
          </Card>

          <Card className="bg-background/40 backdrop-blur-xl border-cyan-500/30 relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/10 to-transparent animate-pulse" />
            <CardContent className="pt-4 relative z-10">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs text-cyan-400">NASA DATA</span>
                <div className="h-2 w-2 rounded-full bg-cyan-400 animate-pulse" />
              </div>
              <div className="text-2xl font-bold text-cyan-300">
                {liveMetrics.nasa.updates}
              </div>
              <div className="text-xs text-cyan-400">
                {liveMetrics.nasa.events} Events
              </div>
            </CardContent>
          </Card>

          <Card className="bg-background/40 backdrop-blur-xl border-pink-500/30 relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-pink-500/10 to-transparent animate-pulse" />
            <CardContent className="pt-4 relative z-10">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs text-pink-400">WEB3 / DeFi</span>
                <div className="h-2 w-2 rounded-full bg-pink-400 animate-pulse" />
              </div>
              <div className="text-2xl font-bold text-pink-300">
                {liveMetrics.web3.gasPrice} Gwei
              </div>
              <div className="text-xs text-pink-400">
                ${(liveMetrics.web3.defi / 1000).toFixed(1)}K TVL • {liveMetrics.web3.transactions} TX
              </div>
            </CardContent>
          </Card>

          <Card className="bg-background/40 backdrop-blur-xl border-yellow-500/30 relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-yellow-500/10 via-amber-500/10 to-transparent animate-pulse" />
            <CardContent className="pt-4 relative z-10">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs text-yellow-400">⭐ NASA CONSTELLATIONS</span>
                <div className="h-2 w-2 rounded-full bg-yellow-400 animate-pulse" />
              </div>
              <div className="text-2xl font-bold text-yellow-300">
                {liveMetrics.constellations.currentConstellation}
              </div>
              <div className="text-xs text-yellow-400">
                {liveMetrics.constellations.activeStars.toLocaleString()} Stars • Mag {liveMetrics.constellations.magnitude}
              </div>
              <div className="text-xs text-amber-400 mt-1">
                {liveMetrics.constellations.visibleConstellations.length} Visible • Activity {liveMetrics.constellations.stellarActivity}%
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Critical Alerts */}
        {criticalUpdates.length > 0 && (
          <Card className="bg-red-500/10 backdrop-blur-xl border-red-500/50 mb-6 relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-r from-red-500/20 to-transparent animate-pulse" />
            <CardContent className="pt-4 relative z-10">
              <div className="flex items-center gap-2 mb-3">
                <Shield className="h-5 w-5 text-red-400 animate-pulse" />
                <h3 className="text-lg font-bold text-red-300">⚠️ CRITICAL UPDATES</h3>
              </div>
              <div className="space-y-2">
                {criticalUpdates.map((alert) => (
                  <div 
                    key={alert.id} 
                    className={`flex items-center justify-between p-2 rounded border ${
                      alert.severity === 'high' 
                        ? 'bg-red-500/20 border-red-500/30' 
                        : 'bg-yellow-500/20 border-yellow-500/30'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`h-2 w-2 rounded-full animate-pulse ${
                        alert.severity === 'high' ? 'bg-red-400' : 'bg-yellow-400'
                      }`} />
                      <div>
                        <p className={`text-sm font-semibold ${
                          alert.severity === 'high' ? 'text-red-300' : 'text-yellow-300'
                        }`}>
                          {alert.type} <span className="text-xs opacity-60">({alert.category})</span>
                        </p>
                        <p className={`text-xs ${
                          alert.severity === 'high' ? 'text-red-400/80' : 'text-yellow-400/80'
                        }`}>
                          {alert.message}
                        </p>
                      </div>
                    </div>
                    <span className={`text-xs font-mono ${
                      alert.severity === 'high' ? 'text-red-400' : 'text-yellow-400'
                    }`}>
                      {alert.timestamp.toLocaleTimeString()}.{alert.timestamp.getMilliseconds()}
                    </span>
                  </div>
                ))}
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
