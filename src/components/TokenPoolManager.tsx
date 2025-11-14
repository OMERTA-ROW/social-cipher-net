import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Trophy, Users, Coins, Shield } from "lucide-react";
import { toast } from "sonner";

interface Pool {
  id: string;
  pool_name: string;
  entry_fee: number;
  total_pool: number;
  game_type: string;
  max_participants: number;
  current_participants: number;
  status: string;
  creator_id: string;
}

export const TokenPoolManager = () => {
  const [pools, setPools] = useState<Pool[]>([]);
  const [loading, setLoading] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const [formData, setFormData] = useState({
    pool_name: "",
    entry_fee: "100",
    game_type: "pvp",
    max_participants: "2"
  });

  useEffect(() => {
    fetchPools();
    
    const channel = supabase
      .channel('token-pools-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'token_pools'
        },
        () => fetchPools()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const fetchPools = async () => {
    const { data, error } = await supabase
      .from('token_pools')
      .select('*')
      .in('status', ['active', 'ready'])
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching pools:', error);
    } else {
      setPools(data || []);
    }
  };

  const createPool = async () => {
    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast.error("Please sign in to create a pool");
        return;
      }

      const { error } = await supabase.functions.invoke('create-token-pool', {
        body: {
          pool_name: formData.pool_name,
          entry_fee: parseFloat(formData.entry_fee),
          game_type: formData.game_type,
          max_participants: parseInt(formData.max_participants)
        }
      });

      if (error) throw error;

      toast.success("Pool created successfully!");
      setShowCreate(false);
      setFormData({
        pool_name: "",
        entry_fee: "100",
        game_type: "pvp",
        max_participants: "2"
      });
      fetchPools();
    } catch (error: any) {
      toast.error(error.message || "Failed to create pool");
    } finally {
      setLoading(false);
    }
  };

  const joinPool = async (poolId: string) => {
    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast.error("Please sign in to join a pool");
        return;
      }

      const { error } = await supabase.functions.invoke('join-token-pool', {
        body: { pool_id: poolId }
      });

      if (error) throw error;

      toast.success("Joined pool successfully!");
      fetchPools();
    } catch (error: any) {
      toast.error(error.message || "Failed to join pool");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Trophy className="w-6 h-6 text-primary" />
          <h2 className="text-2xl font-bold">Token Pools</h2>
          <Shield className="w-5 h-5 text-green-500" />
        </div>
        <Button onClick={() => setShowCreate(!showCreate)}>
          {showCreate ? "Cancel" : "Create Pool"}
        </Button>
      </div>

      {showCreate && (
        <Card className="bg-card/50 backdrop-blur-sm border-primary/20">
          <CardHeader>
            <CardTitle>Create New Pool</CardTitle>
            <CardDescription>Set up a new token pool competition</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="pool_name">Pool Name</Label>
              <Input
                id="pool_name"
                value={formData.pool_name}
                onChange={(e) => setFormData({ ...formData, pool_name: e.target.value })}
                placeholder="Epic Battle Pool"
              />
            </div>
            <div>
              <Label htmlFor="entry_fee">Entry Fee (Tokens)</Label>
              <Input
                id="entry_fee"
                type="number"
                value={formData.entry_fee}
                onChange={(e) => setFormData({ ...formData, entry_fee: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="game_type">Game Type</Label>
              <Select
                value={formData.game_type}
                onValueChange={(value) => setFormData({ ...formData, game_type: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pvp">PvP Battle</SelectItem>
                  <SelectItem value="tournament">Tournament</SelectItem>
                  <SelectItem value="arena">Arena Match</SelectItem>
                  <SelectItem value="challenge">Challenge</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="max_participants">Max Participants</Label>
              <Select
                value={formData.max_participants}
                onValueChange={(value) => setFormData({ ...formData, max_participants: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="2">2 Players</SelectItem>
                  <SelectItem value="4">4 Players</SelectItem>
                  <SelectItem value="8">8 Players</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button onClick={createPool} disabled={loading} className="w-full">
              Create Pool
            </Button>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {pools.map((pool) => (
          <Card key={pool.id} className="bg-gradient-to-br from-primary/10 via-card/50 to-secondary/10 backdrop-blur-sm border-primary/20">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Trophy className="w-5 h-5 text-primary" />
                {pool.pool_name}
              </CardTitle>
              <CardDescription className="uppercase text-xs">
                {pool.game_type}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Coins className="w-4 h-4 text-yellow-500" />
                  <span className="text-sm">Entry Fee:</span>
                </div>
                <span className="font-bold text-primary">{pool.entry_fee} tokens</span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Trophy className="w-4 h-4 text-yellow-500" />
                  <span className="text-sm">Prize Pool:</span>
                </div>
                <span className="font-bold text-green-500">{pool.total_pool} tokens</span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Users className="w-4 h-4 text-blue-500" />
                  <span className="text-sm">Players:</span>
                </div>
                <span className="font-bold">{pool.current_participants}/{pool.max_participants}</span>
              </div>
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Shield className="w-3 h-3 text-green-500" />
                <span>AI-Protected • 15% Commission</span>
              </div>
              <Button 
                onClick={() => joinPool(pool.id)} 
                disabled={loading || pool.status === 'ready'}
                className="w-full"
                variant={pool.status === 'ready' ? 'secondary' : 'default'}
              >
                {pool.status === 'ready' ? 'Full - Starting Soon' : 'Join Pool'}
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>

      {pools.length === 0 && (
        <Card className="bg-card/50 backdrop-blur-sm">
          <CardContent className="py-12 text-center text-muted-foreground">
            <Trophy className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p>No active pools. Create one to start competing!</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
};