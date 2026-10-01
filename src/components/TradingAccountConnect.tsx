import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { TrendingUp, ExternalLink, Trash2, Lock, Unlock } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface TradingAccount {
  id: string;
  platform_name: string;
  platform_type: string;
  account_username?: string;
  is_active: boolean;
  created_at: string;
}

const PLATFORM_TYPES = [
  { value: 'crypto_exchange', label: 'Crypto Exchange', icon: '🔶' },
  { value: 'stock_broker', label: 'Stock Broker', icon: '📊' },
  { value: 'nft_marketplace', label: 'NFT Marketplace', icon: '🌊' },
  { value: 'dex', label: 'DEX', icon: '🦄' },
];

export const TradingAccountConnect = () => {
  const [accounts, setAccounts] = useState<TradingAccount[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAccounts();
  }, []);

  const fetchAccounts = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('trading_accounts')
        .select('id, user_id, platform_name, platform_type, account_username, is_active, metadata, created_at, updated_at')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setAccounts(data || []);
    } catch (error: any) {
      console.error('Error fetching accounts:', error);
      toast.error('Failed to load accounts');
    } finally {
      setLoading(false);
    }
  };

  const handleToggleActive = async (accountId: string, currentStatus: boolean) => {
    try {
      const { error } = await supabase
        .from('trading_accounts')
        .update({ is_active: !currentStatus })
        .eq('id', accountId);

      if (error) throw error;

      toast.success(currentStatus ? 'Account deactivated' : 'Account activated');
      fetchAccounts();
    } catch (error: any) {
      console.error('Error toggling account:', error);
      toast.error('Failed to update account');
    }
  };

  const handleDeleteAccount = async (accountId: string) => {
    try {
      const { error } = await supabase
        .from('trading_accounts')
        .delete()
        .eq('id', accountId);

      if (error) throw error;

      toast.success('Account removed');
      fetchAccounts();
    } catch (error: any) {
      console.error('Error deleting account:', error);
      toast.error('Failed to remove account');
    }
  };

  const getPlatformIcon = (type: string) => {
    const platform = PLATFORM_TYPES.find(p => p.value === type);
    return platform?.icon || '📈';
  };

  return (
    <Card className="bg-gradient-to-br from-primary/10 via-card/50 to-secondary/10 backdrop-blur-sm border-primary/20">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-xl flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-primary" />
              Trading & Investment Accounts
            </CardTitle>
            <CardDescription>
              Connect your trading and investment platforms
            </CardDescription>
          </div>
          <Button size="sm" onClick={() => window.location.assign('/integrations')}>
            <ExternalLink className="w-4 h-4 mr-2" /> Review integrations
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="text-center py-8 text-muted-foreground">Loading accounts...</div>
        ) : accounts.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <TrendingUp className="w-12 h-12 mx-auto mb-2 opacity-50" />
            <p>No trading accounts connected yet</p>
            <p className="text-xs mt-1">Connect your first account to get started</p>
          </div>
        ) : (
          <div className="space-y-3">
            {accounts.map((account) => (
              <div
                key={account.id}
                className="p-4 rounded-lg bg-background/50 border border-border hover:border-primary/50 transition-colors"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3 flex-1">
                    <div className="text-2xl">{getPlatformIcon(account.platform_type)}</div>
                    <div>
                      <div className="font-semibold flex items-center gap-2">
                        {account.platform_name}
                        <Badge variant={account.is_active ? 'default' : 'secondary'} className="text-xs">
                          {account.is_active ? 'Active' : 'Inactive'}
                        </Badge>
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {PLATFORM_TYPES.find(t => t.value === account.platform_type)?.label}
                        {account.account_username && ` • ${account.account_username}`}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleToggleActive(account.id, account.is_active)}
                      title={account.is_active ? 'Deactivate' : 'Activate'}
                    >
                      {account.is_active ? <Lock className="w-4 h-4" /> : <Unlock className="w-4 h-4" />}
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleDeleteAccount(account.id)}
                      title="Remove account"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="mt-4 text-xs text-muted-foreground space-y-1 p-3 bg-muted/50 rounded-lg">
          <p className="font-semibold">Integration status</p>
          <p>New trading connections remain unavailable until a provider-specific, server-verified integration is configured.</p>
          <p>Existing legacy records are shown for review only and do not prove provider authorization.</p>
        </div>
      </CardContent>
    </Card>
  );
};