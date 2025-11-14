import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Pickaxe, TrendingUp, Clock, Coins } from "lucide-react";
import { DracoMiningBackground } from "./DracoMiningBackground";
import { ZozoMiningBackground } from "./ZozoMiningBackground";

interface MiningSession {
  id: string;
  mining_type: string;
  tokens_paid: number;
  performance_multiplier: number;
  start_date: string;
  end_date: string;
  days_duration: number;
  status: string;
  total_mined: number;
}

interface MiningDashboardProps {
  miningType: "draco" | "zozo";
  isUnlocked: boolean;
}

export const MiningDashboard = ({ miningType, isUnlocked }: MiningDashboardProps) => {
  const [sessions, setSessions] = useState<MiningSession[]>([]);
  const [tokenAmount, setTokenAmount] = useState("1000");
  const [duration, setDuration] = useState("3");
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (isUnlocked) {
      fetchSessions();
    }
  }, [isUnlocked, miningType]);

  const fetchSessions = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;

    const { data } = await supabase
      .from("mining_sessions")
      .select("*")
      .eq("mining_type", miningType)
      .order("created_at", { ascending: false });

    if (data) setSessions(data);
  };

  const startMining = async () => {
    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Not authenticated");

      const amount = parseFloat(tokenAmount);
      const days = parseInt(duration);

      if (isNaN(amount) || amount < 1 || amount > 100000) {
        throw new Error("Token amount must be between 1 and 100,000");
      }

      const { data, error } = await supabase.functions.invoke("start-mining-session", {
        body: {
          miningType,
          tokenAmount: amount,
          duration: days,
        },
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      if (error) throw error;

      toast({
        title: "Mining Started! ⛏️",
        description: data.message,
      });

      fetchSessions();
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to start mining",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const multiplier = 1.0 + ((parseFloat(tokenAmount) - 1) / 99999.0) * 99.0;
  const dailyEarning = 10 * multiplier;

  const activeSessions = sessions.filter(s => s.status === "active");
  const hasDracoMining = activeSessions.some(s => s.mining_type === "draco");
  const hasZozoMining = activeSessions.some(s => s.mining_type === "zozo");

  if (!isUnlocked) {
    return (
      <Card className="bg-gradient-to-br from-background/50 to-secondary/20 border-primary/20">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Pickaxe className="h-5 w-5" />
            {miningType === "draco" ? "DRACO" : "ZoZo"} Mining
          </CardTitle>
          <CardDescription>
            Unlock this feature by subscribing to the Pro yearly plan
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground text-sm">
            🔒 Upgrade to unlock powerful Bitcoin mining capabilities powered by AI
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      {/* Mining backgrounds */}
      <DracoMiningBackground isActive={hasDracoMining} />
      <ZozoMiningBackground isActive={hasZozoMining} />
      
      <div className="space-y-6 relative z-10">
      <Card className="bg-gradient-to-br from-primary/5 to-secondary/10 border-primary/30">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Pickaxe className="h-5 w-5 text-primary" />
            Start Mining Session
          </CardTitle>
          <CardDescription>
            Pay tokens to boost your mining performance for 2-4 days
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="tokens">Token Amount (1 - 100,000)</Label>
              <Input
                id="tokens"
                type="number"
                min="1"
                max="100000"
                value={tokenAmount}
                onChange={(e) => setTokenAmount(e.target.value)}
                placeholder="Enter token amount"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="duration">Mining Duration</Label>
              <Select value={duration} onValueChange={setDuration}>
                <SelectTrigger id="duration">
                  <SelectValue placeholder="Select duration" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="2">2 Days</SelectItem>
                  <SelectItem value="3">3 Days</SelectItem>
                  <SelectItem value="4">4 Days</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="rounded-lg bg-secondary/50 p-4 space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Performance Multiplier:</span>
              <span className="font-bold text-primary">{multiplier.toFixed(2)}x</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Estimated Daily Earning:</span>
              <span className="font-bold">{dailyEarning.toFixed(2)} tokens</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Total Potential Earnings:</span>
              <span className="font-bold text-green-500">
                ~{(dailyEarning * parseInt(duration)).toFixed(2)} tokens
              </span>
            </div>
          </div>

          <Button onClick={startMining} disabled={loading} className="w-full">
            <Pickaxe className="mr-2 h-4 w-4" />
            {loading ? "Starting..." : "Start Mining Session"}
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Active Mining Sessions
          </CardTitle>
        </CardHeader>
        <CardContent>
          {sessions.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">
              No mining sessions yet. Start your first session above!
            </p>
          ) : (
            <div className="space-y-4">
              {sessions.map((session) => (
                <Card key={session.id} className="bg-secondary/20">
                  <CardContent className="pt-6">
                    <div className="flex items-center justify-between mb-4">
                      <span className="text-sm font-medium uppercase">{session.mining_type}</span>
                      <span className={`text-xs px-2 py-1 rounded ${
                        session.status === "active" ? "bg-green-500/20 text-green-500" : "bg-muted"
                      }`}>
                        {session.status}
                      </span>
                    </div>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div className="flex items-center gap-2">
                        <Coins className="h-4 w-4 text-muted-foreground" />
                        <span>Paid: {session.tokens_paid} tokens</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <TrendingUp className="h-4 w-4 text-muted-foreground" />
                        <span>Multiplier: {session.performance_multiplier.toFixed(2)}x</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Clock className="h-4 w-4 text-muted-foreground" />
                        <span>{session.days_duration} days</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Pickaxe className="h-4 w-4 text-muted-foreground" />
                        <span>Mined: {session.total_mined.toFixed(2)} tokens</span>
                      </div>
                    </div>
                    <div className="mt-4 text-xs text-muted-foreground">
                      Ends: {new Date(session.end_date).toLocaleDateString()}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
    </>
  );
};