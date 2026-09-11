import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Pickaxe, TrendingUp, Clock, Coins } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { ExternalMiningAccounts } from "./ExternalMiningAccounts";

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

const CRYPTO_OPTIONS = [
  { symbol: 'BTC', name: 'Bitcoin', icon: '₿', color: 'text-orange-500' },
  { symbol: 'ETH', name: 'Ethereum', icon: 'Ξ', color: 'text-blue-500' },
  { symbol: 'DOGE', name: 'Dogecoin', icon: 'Ð', color: 'text-yellow-500' },
  { symbol: 'SHIB', name: 'Shiba Inu', icon: '🐕', color: 'text-red-500' },
  { symbol: 'PEPE', name: 'Pepe', icon: '🐸', color: 'text-green-500' },
  { symbol: 'USDC', name: 'USD Coin', icon: '$', color: 'text-blue-400' },
  { symbol: 'USDT', name: 'Tether', icon: '₮', color: 'text-green-400' },
  { symbol: 'MATIC', name: 'Polygon', icon: '⬡', color: 'text-purple-500' },
  { symbol: 'BNB', name: 'Binance Coin', icon: 'ⓑ', color: 'text-yellow-400' },
  { symbol: 'SOL', name: 'Solana', icon: '◎', color: 'text-cyan-500' },
  { symbol: 'ADA', name: 'Cardano', icon: '₳', color: 'text-blue-600' },
  { symbol: 'AVAX', name: 'Avalanche', icon: '🔺', color: 'text-red-400' },
];

interface MiningDashboardProps {
  miningType: "draco" | "zozo";
  isUnlocked: boolean;
}

export const MiningDashboard = ({ miningType, isUnlocked }: MiningDashboardProps) => {
  const [sessions, setSessions] = useState<MiningSession[]>([]);
  const [tokenAmount, setTokenAmount] = useState("1000");
  const [duration, setDuration] = useState("3");
  const [selectedCrypto, setSelectedCrypto] = useState("BTC");
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
          cryptoCurrency: selectedCrypto,
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

  const selectedCryptoInfo = CRYPTO_OPTIONS.find(c => c.symbol === selectedCrypto);

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
    <div className="space-y-6 relative z-10">
      <Card className="bg-gradient-to-br from-primary/5 to-secondary/10 border-primary/30 overflow-hidden">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Pickaxe className="h-5 w-5 text-primary" />
            Start Crypto Mining Session
          </CardTitle>
          <CardDescription>
            Mine real cryptocurrency and meme coins through space! Pay tokens for 2-4 days of mining.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="p-4 rounded-lg bg-gradient-to-r from-primary/10 to-accent/10 border border-primary/20">
            <div className="flex items-center gap-3">
              <span className={`text-4xl ${selectedCryptoInfo?.color}`}>
                {selectedCryptoInfo?.icon}
              </span>
              <div>
                <p className="font-bold text-lg">{selectedCryptoInfo?.name}</p>
                <p className="text-sm text-muted-foreground">Mining through space nodes</p>
              </div>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            <div className="space-y-2">
              <Label htmlFor="crypto">Cryptocurrency</Label>
              <Select value={selectedCrypto} onValueChange={setSelectedCrypto}>
                <SelectTrigger id="crypto">
                  <SelectValue placeholder="Select crypto" />
                </SelectTrigger>
                <SelectContent>
                  {CRYPTO_OPTIONS.map((crypto) => (
                    <SelectItem key={crypto.symbol} value={crypto.symbol}>
                      <span className="flex items-center gap-2">
                        <span className={crypto.color}>{crypto.icon}</span>
                        {crypto.name}
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

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

          <div className="rounded-lg bg-secondary/50 p-4 text-sm text-muted-foreground">
            Verified mining results appear after the provider records the session. No estimated earnings are shown.
          </div>

          <Button onClick={startMining} disabled={loading} className="w-full group">
            <Pickaxe className="mr-2 h-4 w-4 group-hover:animate-bounce" />
            {loading ? "Launching Spaceship..." : `Start Mining ${selectedCrypto}`}
          </Button>
          
          <div className="text-xs text-muted-foreground bg-muted/50 p-3 rounded-lg">
            <p className="font-semibold mb-1">🚀 Space Node Mining</p>
            <p>Your {miningType === "draco" ? "DRACO" : "ZoZo"} spaceship will traverse the galaxy, discovering {selectedCryptoInfo?.name} nodes on planets, asteroids, and comets!</p>
          </div>
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

      <ExternalMiningAccounts miningType={miningType} isUnlocked={isUnlocked} />
    </div>
  );
};