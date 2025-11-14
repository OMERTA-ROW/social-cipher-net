import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { Plus, Search, Trash2, Power, Settings2, ExternalLink } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";

interface ExternalMiningAccount {
  id: string;
  account_name: string;
  account_type: string;
  platform: string;
  wallet_address?: string;
  mining_type: string;
  is_active: boolean;
  optimization_level: string;
  created_at: string;
}

interface ExternalMiningAccountsProps {
  miningType: "draco" | "zozo";
  isUnlocked: boolean;
}

const PLATFORMS = [
  { value: "nicehash", label: "NiceHash" },
  { value: "binance", label: "Binance Pool" },
  { value: "coinbase", label: "Coinbase" },
  { value: "ethermine", label: "Ethermine" },
  { value: "f2pool", label: "F2Pool" },
  { value: "custom", label: "Custom Pool" },
];

const OPTIMIZATION_LEVELS = [
  { value: "standard", label: "Standard", description: "Balanced mining" },
  { value: "high", label: "High", description: "Increased performance" },
  { value: "maximum", label: "Maximum", description: "Peak performance" },
];

export const ExternalMiningAccounts = ({ miningType, isUnlocked }: ExternalMiningAccountsProps) => {
  const [accounts, setAccounts] = useState<ExternalMiningAccount[]>([]);
  const [loading, setLoading] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const { toast } = useToast();

  // Form state
  const [accountName, setAccountName] = useState("");
  const [accountType, setAccountType] = useState<"search" | "created">("created");
  const [platform, setPlatform] = useState("nicehash");
  const [apiKey, setApiKey] = useState("");
  const [apiSecret, setApiSecret] = useState("");
  const [walletAddress, setWalletAddress] = useState("");
  const [optimizationLevel, setOptimizationLevel] = useState("standard");

  useEffect(() => {
    if (isUnlocked) {
      fetchAccounts();
    }
  }, [isUnlocked, miningType]);

  const fetchAccounts = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const { data, error } = await supabase.functions.invoke("manage-external-mining-account", {
        body: {
          action: "search",
          accountData: { mining_type: miningType },
        },
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      if (error) throw error;
      if (data?.accounts) setAccounts(data.accounts);
    } catch (error) {
      console.error("Error fetching accounts:", error);
    }
  };

  const createAccount = async () => {
    if (!accountName.trim()) {
      toast({
        title: "Error",
        description: "Please enter an account name",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Not authenticated");

      const { data, error } = await supabase.functions.invoke("manage-external-mining-account", {
        body: {
          action: "create",
          accountData: {
            account_name: accountName,
            account_type: accountType,
            platform,
            api_key: apiKey,
            api_secret: apiSecret,
            wallet_address: walletAddress,
            mining_type: miningType,
            optimization_level: optimizationLevel,
          },
        },
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      if (error) throw error;

      toast({
        title: "Success! 🎉",
        description: data.message,
      });

      // Reset form
      setAccountName("");
      setApiKey("");
      setApiSecret("");
      setWalletAddress("");
      setOptimizationLevel("standard");
      setIsDialogOpen(false);
      fetchAccounts();
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to create account",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const toggleAccount = async (accountId: string, currentStatus: boolean) => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Not authenticated");

      const { error } = await supabase.functions.invoke("manage-external-mining-account", {
        body: {
          action: "update",
          accountId,
          accountData: { is_active: !currentStatus },
        },
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      if (error) throw error;

      toast({
        title: "Account Updated",
        description: `Account ${!currentStatus ? "activated" : "deactivated"}`,
      });

      fetchAccounts();
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to update account",
        variant: "destructive",
      });
    }
  };

  const deleteAccount = async (accountId: string) => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Not authenticated");

      const { error } = await supabase.functions.invoke("manage-external-mining-account", {
        body: {
          action: "delete",
          accountId,
        },
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      if (error) throw error;

      toast({
        title: "Account Deleted",
        description: "Mining account removed successfully",
      });

      fetchAccounts();
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to delete account",
        variant: "destructive",
      });
    }
  };

  if (!isUnlocked) {
    return null;
  }

  return (
    <Card className="mt-6">
      <CardHeader>
        <div className="flex justify-between items-center">
          <div>
            <CardTitle className="flex items-center gap-2">
              <ExternalLink className="h-5 w-5" />
              External Mining Accounts
            </CardTitle>
            <CardDescription>
              Connect external accounts to optimize your {miningType.toUpperCase()} mining operations
            </CardDescription>
          </div>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button className="gap-2">
                <Plus className="h-4 w-4" />
                Add Account
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>Add External Mining Account</DialogTitle>
                <DialogDescription>
                  Connect or create a mining account to optimize your operations
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 mt-4">
                <div className="space-y-2">
                  <Label>Account Type</Label>
                  <Select value={accountType} onValueChange={(val: "search" | "created") => setAccountType(val)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="created">Create New</SelectItem>
                      <SelectItem value="search">Search & Connect</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="accountName">Account Name</Label>
                  <Input
                    id="accountName"
                    placeholder="My Mining Account"
                    value={accountName}
                    onChange={(e) => setAccountName(e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Platform</Label>
                  <Select value={platform} onValueChange={setPlatform}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {PLATFORMS.map((p) => (
                        <SelectItem key={p.value} value={p.value}>
                          {p.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="walletAddress">Wallet Address (Optional)</Label>
                  <Input
                    id="walletAddress"
                    placeholder="0x..."
                    value={walletAddress}
                    onChange={(e) => setWalletAddress(e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="apiKey">API Key (Optional)</Label>
                  <Input
                    id="apiKey"
                    type="password"
                    placeholder="Enter API key"
                    value={apiKey}
                    onChange={(e) => setApiKey(e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="apiSecret">API Secret (Optional)</Label>
                  <Input
                    id="apiSecret"
                    type="password"
                    placeholder="Enter API secret"
                    value={apiSecret}
                    onChange={(e) => setApiSecret(e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Optimization Level</Label>
                  <Select value={optimizationLevel} onValueChange={setOptimizationLevel}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {OPTIMIZATION_LEVELS.map((level) => (
                        <SelectItem key={level.value} value={level.value}>
                          <div>
                            <div className="font-medium">{level.label}</div>
                            <div className="text-xs text-muted-foreground">{level.description}</div>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <Button onClick={createAccount} disabled={loading} className="w-full">
                  {loading ? "Creating..." : "Create Account"}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent>
        {accounts.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Search className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>No external mining accounts connected yet</p>
            <p className="text-sm mt-2">Add an account to optimize your mining operations</p>
          </div>
        ) : (
          <div className="space-y-4">
            {accounts.map((account) => (
              <div
                key={account.id}
                className="flex items-center justify-between p-4 border rounded-lg hover:border-primary/50 transition-colors"
              >
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="font-semibold">{account.account_name}</h3>
                    <Badge variant={account.is_active ? "default" : "secondary"}>
                      {account.is_active ? "Active" : "Inactive"}
                    </Badge>
                    <Badge variant="outline">{account.platform}</Badge>
                    <Badge variant="outline" className="capitalize">
                      {account.optimization_level}
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Type: {account.account_type === "created" ? "Created" : "Connected"} •{" "}
                    {account.wallet_address && `Wallet: ${account.wallet_address.substring(0, 8)}...`}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Switch
                    checked={account.is_active}
                    onCheckedChange={() => toggleAccount(account.id, account.is_active)}
                  />
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => deleteAccount(account.id)}
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};