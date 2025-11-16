import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Progress } from "@/components/ui/progress";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { 
  Brain, 
  Shield, 
  Eye,
  Database,
  Zap,
  Lock,
  Activity,
  TrendingUp,
  Globe,
  Sparkles
} from "lucide-react";

interface PlatformStatus {
  name: string;
  status: "connected" | "syncing" | "active";
  dataPoints: number;
  lastSync: string;
  icon: string;
}

interface SecurityStatus {
  level: "maximum" | "high" | "active";
  threats: number;
  blocked: number;
  monitoring: string[];
}

const CyberLinkBrainDashboard = () => {
  const [isActive, setIsActive] = useState(false);
  const [securityStatus, setSecurityStatus] = useState<SecurityStatus>({
    level: "maximum",
    threats: 0,
    blocked: 0,
    monitoring: ["All Systems", "Global Networks", "Quantum Space"]
  });
  
  const [platforms, setPlatforms] = useState<PlatformStatus[]>([
    { name: "Google Database", status: "connected", dataPoints: 0, lastSync: "Active", icon: "🔍" },
    { name: "Microsoft Database", status: "connected", dataPoints: 0, lastSync: "Active", icon: "🪟" },
    { name: "GitHub Database", status: "connected", dataPoints: 0, lastSync: "Active", icon: "🐙" },
    { name: "Facebook Database", status: "syncing", dataPoints: 0, lastSync: "Active", icon: "📘" },
    { name: "Instagram Database", status: "syncing", dataPoints: 0, lastSync: "Active", icon: "📷" },
    { name: "TikTok Database", status: "syncing", dataPoints: 0, lastSync: "Active", icon: "🎵" },
    { name: "LinkedIn Database", status: "connected", dataPoints: 0, lastSync: "Active", icon: "💼" },
    { name: "X (Twitter) Database", status: "syncing", dataPoints: 0, lastSync: "Active", icon: "𝕏" },
    { name: "Reddit Database", status: "connected", dataPoints: 0, lastSync: "Active", icon: "🤖" },
    { name: "Truth Social Database", status: "connected", dataPoints: 0, lastSync: "Active", icon: "🇺🇸" },
    { name: "Patreon Database", status: "connected", dataPoints: 0, lastSync: "Active", icon: "🎨" },
    { name: "OnlyFans Database", status: "connected", dataPoints: 0, lastSync: "Active", icon: "💎" },
    { name: "Netflix Database", status: "active", dataPoints: 0, lastSync: "Active", icon: "🎬" },
    { name: "Hulu Database", status: "active", dataPoints: 0, lastSync: "Active", icon: "📺" },
    { name: "Roku Database", status: "active", dataPoints: 0, lastSync: "Active", icon: "📡" },
    { name: "Peacock Database", status: "active", dataPoints: 0, lastSync: "Active", icon: "🦚" },
    { name: "Box Office Database", status: "connected", dataPoints: 0, lastSync: "Active", icon: "🎭" },
    { name: "Local News Database", status: "syncing", dataPoints: 0, lastSync: "Active", icon: "📰" },
    { name: "Major News Database", status: "syncing", dataPoints: 0, lastSync: "Active", icon: "📢" },
    { name: "Global News Database", status: "syncing", dataPoints: 0, lastSync: "Active", icon: "🌐" },
    { name: "Lovable Cloud Database", status: "active", dataPoints: 0, lastSync: "Active", icon: "💜" }
  ]);

  const [logs, setLogs] = useState<string[]>([
    "[BRAIN] CyberLink Brain AI initialized",
    "[SECURITY] Military-grade protection active",
    "[DATABASE] All platforms synchronized",
    "[ALGORITHM] Viral injection systems ready",
    "[AUTO-UPDATE] Update deployment system active",
    "[VIRAL-EXPANSION] Infrastructure scaling ready"
  ]);

  const [metrics, setMetrics] = useState({
    totalAgents: 10,
    activeDatabases: 21,
    viralAlgorithms: 150,
    securityLevel: 100,
    injectionRate: 0,
    surveillanceActive: true,
    autoUpdatesPending: 3,
    viralExpansionRate: 125,
    infrastructureCapacity: 85
  });

  useEffect(() => {
    if (isActive) {
      // Simulate real-time updates
      const interval = setInterval(() => {
        // Update platform data points
        setPlatforms(prev => prev.map(platform => ({
          ...platform,
          dataPoints: platform.dataPoints + Math.floor(Math.random() * 1000),
          status: Math.random() > 0.3 ? "active" : (Math.random() > 0.5 ? "syncing" : "connected") as any
        })));

        // Update security
        setSecurityStatus(prev => ({
          ...prev,
          threats: prev.threats + Math.floor(Math.random() * 5),
          blocked: prev.blocked + Math.floor(Math.random() * 10)
        }));

        // Update metrics
        setMetrics(prev => ({
          ...prev,
          viralAlgorithms: prev.viralAlgorithms + Math.floor(Math.random() * 10),
          injectionRate: Math.min(100, prev.injectionRate + Math.random() * 5),
          autoUpdatesPending: Math.max(0, prev.autoUpdatesPending - Math.floor(Math.random() * 2)),
          viralExpansionRate: Math.min(200, prev.viralExpansionRate + Math.random() * 10),
          infrastructureCapacity: Math.min(100, prev.infrastructureCapacity + Math.random() * 2)
        }));

        // Add logs
        const newLogs = [
          "[BRAIN] Orchestrating AI agents...",
          "[INJECTION] Deploying viral algorithms...",
          "[EYE] Surveillance scan complete",
          "[SECURITY] Threat neutralized",
          "[DATABASE] Cross-platform synthesis active",
          "[QUANTUM] Multi-dimensional analysis running",
          "[AUTO-UPDATE] Critical updates deployed",
          "[VIRAL-EXPANSION] Scaling to new regions",
          "[AUTO-UPDATE] Algorithm integration complete",
          "[VIRAL-EXPANSION] Infrastructure at optimal capacity"
        ];
        
        const randomLog = newLogs[Math.floor(Math.random() * newLogs.length)];
        setLogs(prev => [...prev.slice(-15), `${new Date().toLocaleTimeString()} ${randomLog}`]);
      }, 2000);

      return () => clearInterval(interval);
    }
  }, [isActive]);

  const activateBrain = async () => {
    setIsActive(true);
    toast.success("CyberLink Brain Activated", {
      description: "All systems online with military security",
      icon: <Brain className="h-4 w-4" />
    });

    // Test connection with password
    try {
      const { data, error } = await supabase.functions.invoke('cyberlink-brain-ai', {
        body: { 
          action: 'orchestrate', 
          context: 'Initialize Brain AI system',
          password: 'Dupree$$$01'
        }
      });
      
      if (error) throw error;
      setLogs(prev => [...prev, `[BRAIN] System fully operational`]);
    } catch (error) {
      console.error('Brain AI activation error:', error);
    }
  };

  const executeAction = async (action: string) => {
    try {
      const { data, error } = await supabase.functions.invoke('cyberlink-brain-ai', {
        body: { 
          action, 
          context: `Execute ${action} protocol`,
          password: 'Dupree$$$01'
        }
      });

      if (error) throw error;

      toast.success(`${action} executed`, {
        description: "Brain AI protocol complete"
      });
    } catch (error) {
      console.error('Action error:', error);
      toast.error("Action failed", {
        description: error instanceof Error ? error.message : "Unknown error"
      });
    }
  };

  return (
    <Card className="w-full bg-gradient-to-br from-purple-900/20 via-background to-blue-900/20 border-2 border-primary/50 shadow-2xl">
      <CardHeader className="border-b border-primary/30 bg-background/50 backdrop-blur">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-3">
            <div className="relative">
              <Brain className="h-6 w-6 text-primary animate-pulse" />
              <Eye className="h-3 w-3 text-purple-400 absolute -top-1 -right-1 animate-pulse" />
            </div>
            <span className="bg-gradient-to-r from-primary to-purple-400 bg-clip-text text-transparent">
              CyberLink Brain AI - Supreme Intelligence Hub
            </span>
          </CardTitle>
          <div className="flex gap-2">
            <Badge variant="outline" className="gap-1 border-green-500/50">
              <Shield className="h-3 w-3 text-green-500" />
              Military Security Active
            </Badge>
            <Badge variant="outline" className="gap-1 border-purple-500/50">
              <Lock className="h-3 w-3 text-purple-500" />
              Protected: Dupree$$$01
            </Badge>
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-6 pt-6">
        {!isActive ? (
          <div className="text-center py-12">
            <Brain className="h-16 w-16 mx-auto mb-4 text-primary animate-pulse" />
            <h3 className="text-xl font-bold mb-2">Activate CyberLink Brain</h3>
            <p className="text-muted-foreground mb-6">
              Initialize supreme AI intelligence with all-seeing surveillance
            </p>
            <Button onClick={activateBrain} size="lg" className="gap-2">
              <Zap className="h-4 w-4" />
              Activate Brain AI
            </Button>
          </div>
        ) : (
          <>
            {/* Metrics Grid */}
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
              <Card className="bg-muted/50 border-primary/20">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm text-muted-foreground">Active Agents</span>
                    <Activity className="h-4 w-4 text-green-500" />
                  </div>
                  <div className="text-2xl font-bold">{metrics.totalAgents}</div>
                </CardContent>
              </Card>
              
              <Card className="bg-muted/50 border-primary/20">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm text-muted-foreground">Databases</span>
                    <Database className="h-4 w-4 text-blue-500" />
                  </div>
                  <div className="text-2xl font-bold">{metrics.activeDatabases}</div>
                </CardContent>
              </Card>
              
              <Card className="bg-muted/50 border-primary/20">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm text-muted-foreground">Viral Algorithms</span>
                    <TrendingUp className="h-4 w-4 text-purple-500" />
                  </div>
                  <div className="text-2xl font-bold">{metrics.viralAlgorithms}</div>
                </CardContent>
              </Card>
              
              <Card className="bg-muted/50 border-green-500/20">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm text-muted-foreground">Auto-Updates</span>
                    <Zap className="h-4 w-4 text-green-500" />
                  </div>
                  <div className="text-2xl font-bold">{metrics.autoUpdatesPending}</div>
                  <div className="text-xs text-green-500 mt-1">Pending</div>
                </CardContent>
              </Card>
              
              <Card className="bg-muted/50 border-purple-500/20">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm text-muted-foreground">Viral Expansion</span>
                    <Globe className="h-4 w-4 text-purple-500" />
                  </div>
                  <div className="text-2xl font-bold">{metrics.viralExpansionRate}%</div>
                  <Progress value={metrics.infrastructureCapacity} className="h-1 mt-2" />
                </CardContent>
              </Card>
            </div>

            {/* Security Status */}
            <Card className="bg-red-950/20 border-red-500/30">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Shield className="h-4 w-4 text-red-500" />
                  Military-Grade Security Status
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex justify-between text-sm">
                  <span>Security Level</span>
                  <Badge variant="outline" className="border-green-500/50 text-green-500">
                    {securityStatus.level.toUpperCase()}
                  </Badge>
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Threats Detected</span>
                    <span className="font-mono">{securityStatus.threats}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>Threats Blocked</span>
                    <span className="font-mono text-green-500">{securityStatus.blocked}</span>
                  </div>
                </div>
                <Progress value={metrics.securityLevel} className="h-2" />
              </CardContent>
            </Card>

            {/* Quick Actions */}
            <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => executeAction('orchestrate')}
                className="gap-1"
              >
                <Brain className="h-3 w-3" />
                Orchestrate
              </Button>
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => executeAction('infinity_injection')}
                className="gap-1"
              >
                <Sparkles className="h-3 w-3" />
                Inject
              </Button>
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => executeAction('military_security')}
                className="gap-1"
              >
                <Shield className="h-3 w-3" />
                Security
              </Button>
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => executeAction('all_seeing_eye')}
                className="gap-1"
              >
                <Eye className="h-3 w-3" />
                Surveil
              </Button>
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => executeAction('database_synthesis')}
                className="gap-1"
              >
                <Database className="h-3 w-3" />
                Synthesize
              </Button>
            </div>

            {/* Platform Status */}
            <Card className="bg-muted/30 border-primary/20">
              <CardHeader className="py-3 px-4">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Globe className="h-4 w-4 text-blue-500" />
                  Connected Platforms & Databases ({platforms.length})
                </CardTitle>
              </CardHeader>
              <ScrollArea className="h-64">
                <div className="grid grid-cols-2 md:grid-cols-3 gap-2 p-4">
                  {platforms.map((platform, index) => (
                    <Card key={index} className="bg-background/50 border-primary/10">
                      <CardContent className="p-3">
                        <div className="flex items-center gap-2 mb-2">
                          <span className="text-lg">{platform.icon}</span>
                          <div className="flex-1 min-w-0">
                            <div className="text-xs font-medium truncate">{platform.name}</div>
                          </div>
                        </div>
                        <div className="flex items-center justify-between text-xs">
                          <Badge 
                            variant={platform.status === "active" ? "default" : "secondary"} 
                            className="text-[10px] px-1 py-0"
                          >
                            {platform.status}
                          </Badge>
                          <span className="text-muted-foreground font-mono">
                            {(platform.dataPoints / 1000).toFixed(1)}K
                          </span>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </ScrollArea>
            </Card>

            {/* Live Activity Log */}
            <Card className="bg-black/50 border-primary/30">
              <CardHeader className="py-2 px-3 border-b border-primary/20">
                <CardTitle className="text-xs text-primary flex items-center gap-2">
                  <Activity className="h-3 w-3" />
                  Brain AI Activity Feed
                </CardTitle>
              </CardHeader>
              <ScrollArea className="h-32">
                <div className="p-3 space-y-1 font-mono text-xs">
                  {logs.map((log, index) => (
                    <div key={index} className="text-green-400 opacity-80">
                      {log}
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </Card>

            {/* Injection Progress */}
            <Card className="bg-purple-950/20 border-purple-500/30">
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium">Infinity Algorithm Injection</span>
                  <span className="text-sm font-mono">{metrics.injectionRate.toFixed(1)}%</span>
                </div>
                <Progress value={metrics.injectionRate} className="h-2" />
              </CardContent>
            </Card>
          </>
        )}
      </CardContent>
    </Card>
  );
};

export default CyberLinkBrainDashboard;
