import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { 
  AlertTriangle, 
  Zap, 
  Brain, 
  Activity,
  RefreshCw,
  Sparkles,
  TrendingUp
} from "lucide-react";

interface AIAgentStatus {
  name: string;
  status: "active" | "idle" | "critical";
  lastAction: string;
  uptime: string;
}

const CyberLinkCriticalAI = () => {
  const [agents, setAgents] = useState<AIAgentStatus[]>([
    {
      name: "Auto-Fix Agent",
      status: "active",
      lastAction: "Monitoring error logs",
      uptime: "99.9%"
    },
    {
      name: "Page Load Agent",
      status: "active",
      lastAction: "Optimizing bundle size",
      uptime: "100%"
    },
    {
      name: "Quantum Realm AI",
      status: "active",
      lastAction: "Analyzing parallel realities",
      uptime: "∞"
    },
    {
      name: "Ecosystem Monitor",
      status: "active",
      lastAction: "System health check",
      uptime: "100%"
    },
    {
      name: "Auto-Update Agent",
      status: "active",
      lastAction: "Deploying critical updates",
      uptime: "100%"
    },
    {
      name: "Viral Expansion Agent",
      status: "active",
      lastAction: "Scaling infrastructure",
      uptime: "99.9%"
    }
  ]);

  const [isProcessing, setIsProcessing] = useState(false);
  const [logs, setLogs] = useState<string[]>([
    "[SYSTEM] CyberLink AI Ecosystem initialized",
    "[AUTO-FIX] Error detection systems online",
    "[PAGE-LOAD] Performance monitoring active",
    "[QUANTUM] Multi-dimensional analysis ready",
    "[AUTO-UPDATE] Update deployment system active",
    "[VIRAL-EXPANSION] Scaling infrastructure ready"
  ]);

  useEffect(() => {
    // Simulate real-time monitoring
    const interval = setInterval(() => {
      const actions = [
        "[AUTO-FIX] Scanning for errors...",
        "[PAGE-LOAD] Analyzing Core Web Vitals",
        "[QUANTUM] Processing quantum probabilities",
        "[MONITOR] All systems operational",
        "[AUTO-FIX] Zero critical issues detected",
        "[PAGE-LOAD] LCP optimized to 1.2s",
        "[AUTO-UPDATE] Deploying algorithm updates",
        "[VIRAL-EXPANSION] Scaling to 1M+ users",
        "[AUTO-UPDATE] New algorithms integrated",
        "[VIRAL-EXPANSION] Infrastructure at 95% capacity"
      ];
      
      const randomAction = actions[Math.floor(Math.random() * actions.length)];
      setLogs(prev => [...prev.slice(-10), `${new Date().toLocaleTimeString()} ${randomAction}`]);
    }, 5000);

    return () => clearInterval(interval);
  }, []);

  const runCriticalAnalysis = async (action: string) => {
    setIsProcessing(true);
    
    try {
      const context = `Execute ${action} analysis. Current system state: ${JSON.stringify(agents)}`;
      
      const { data, error } = await supabase.functions.invoke('cyberlink-critical-ai', {
        body: { action, context }
      });

      if (error) throw error;

      toast.success(`${action} analysis complete`, {
        description: "AI agent completed critical analysis"
      });

      setLogs(prev => [...prev, `[${action.toUpperCase()}] Analysis complete: ${data?.result || 'Success'}`]);
    } catch (error) {
      console.error('Critical AI error:', error);
      toast.error("AI agent error", {
        description: error instanceof Error ? error.message : "Unknown error"
      });
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <Card className="w-full bg-background/95 backdrop-blur border-2 border-primary/30">
      <CardHeader className="border-b border-primary/20">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Brain className="h-5 w-5 text-primary animate-pulse" />
            CyberLink Critical AI Ecosystem
          </CardTitle>
          <Badge variant="outline" className="gap-1">
            <Activity className="h-3 w-3 text-green-500" />
            All Systems Active
          </Badge>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4 pt-4">
        {/* AI Agents Status Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {agents.map((agent, index) => (
            <Card key={index} className="bg-muted/50 border-primary/20">
              <CardContent className="p-4">
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center gap-2">
                    {agent.name === "Auto-Fix Agent" && <AlertTriangle className="h-4 w-4 text-yellow-500" />}
                    {agent.name === "Page Load Agent" && <Zap className="h-4 w-4 text-blue-500" />}
                    {agent.name === "Quantum Realm AI" && <Sparkles className="h-4 w-4 text-purple-500" />}
                    {agent.name === "Ecosystem Monitor" && <Activity className="h-4 w-4 text-green-500" />}
                    <span className="text-sm font-medium">{agent.name}</span>
                  </div>
                  <Badge 
                    variant={agent.status === "active" ? "default" : "secondary"}
                    className="text-xs"
                  >
                    {agent.status}
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground mb-1">{agent.lastAction}</p>
                <p className="text-xs text-muted-foreground">Uptime: {agent.uptime}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => runCriticalAnalysis('auto_fix')}
            disabled={isProcessing}
            className="gap-1"
          >
            <AlertTriangle className="h-3 w-3" />
            Auto-Fix
          </Button>
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => runCriticalAnalysis('page_load')}
            disabled={isProcessing}
            className="gap-1"
          >
            <Zap className="h-3 w-3" />
            Optimize
          </Button>
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => runCriticalAnalysis('quantum_realm')}
            disabled={isProcessing}
            className="gap-1"
          >
            <Sparkles className="h-3 w-3" />
            Quantum
          </Button>
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => runCriticalAnalysis('ecosystem_monitor')}
            disabled={isProcessing}
            className="gap-1"
          >
            <RefreshCw className={`h-3 w-3 ${isProcessing ? 'animate-spin' : ''}`} />
            Monitor
          </Button>
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => runCriticalAnalysis('auto_update')}
            disabled={isProcessing}
            className="gap-1 bg-gradient-to-r from-green-500/10 to-emerald-500/10 hover:from-green-500/20 hover:to-emerald-500/20"
          >
            <Zap className="h-3 w-3 text-green-500" />
            Auto-Update
          </Button>
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => runCriticalAnalysis('viral_expansion')}
            disabled={isProcessing}
            className="gap-1 bg-gradient-to-r from-purple-500/10 to-pink-500/10 hover:from-purple-500/20 hover:to-pink-500/20"
          >
            <TrendingUp className="h-3 w-3 text-purple-500" />
            Viral Expand
          </Button>
        </div>

        {/* Live Activity Log */}
        <Card className="bg-black/50 border-primary/30">
          <CardHeader className="py-2 px-3 border-b border-primary/20">
            <CardTitle className="text-xs text-primary">Live AI Activity Log</CardTitle>
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
      </CardContent>
    </Card>
  );
};

export default CyberLinkCriticalAI;
