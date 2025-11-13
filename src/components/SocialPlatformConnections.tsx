import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { 
  Instagram, 
  Twitter, 
  Youtube, 
  Twitch as TwitchIcon,
  Facebook,
  Download,
  Link as LinkIcon,
  Unlink,
  Linkedin,
  Music,
  Send,
  MessageCircle
} from "lucide-react";

interface PlatformConnection {
  id: string;
  platform: string;
  platform_username: string;
  is_active: boolean;
  earnings_balance?: number;
}

const PLATFORM_ICONS: { [key: string]: any } = {
  instagram: Instagram,
  twitter: Twitter,
  youtube: Youtube,
  twitch: TwitchIcon,
  reddit: LinkIcon,
  facebook: Facebook,
  tiktok: Music,
  linkedin: Linkedin,
  snapchat: MessageCircle,
  telegram: Send,
};

const PLATFORM_NAMES: { [key: string]: string } = {
  instagram: "Instagram",
  twitter: "X (Twitter)",
  youtube: "YouTube",
  twitch: "Twitch",
  reddit: "Reddit",
  facebook: "Facebook",
  tiktok: "TikTok",
  linkedin: "LinkedIn",
  snapchat: "Snapchat",
  telegram: "Telegram",
};

interface SocialPlatformConnectionsProps {
  onConnectionsUpdate?: (platforms: Array<{
    platform: string;
    platform_name: string;
    is_active: boolean;
  }>) => void;
}

export const SocialPlatformConnections = ({ onConnectionsUpdate }: SocialPlatformConnectionsProps) => {
  const [connections, setConnections] = useState<PlatformConnection[]>([]);
  const [loading, setLoading] = useState(true);
  const [withdrawing, setWithdrawing] = useState<string | null>(null);

  useEffect(() => {
    fetchConnections();
    const interval = setInterval(fetchConnections, 30000);
    return () => clearInterval(interval);
  }, []);

  const fetchConnections = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from("platform_connections")
        .select("*")
        .eq("user_id", user.id);

      if (error) throw error;
      
      // Mock earnings data for each platform (in real implementation, fetch from each platform's API)
      const connectionsWithEarnings = data?.map(conn => ({
        ...conn,
        earnings_balance: Math.random() * 100 // Replace with real platform earnings API call
      })) || [];

      setConnections(connectionsWithEarnings);
      
      // Notify parent of active connections
      if (onConnectionsUpdate) {
        onConnectionsUpdate(
          connectionsWithEarnings.map(conn => ({
            platform: conn.platform,
            platform_name: PLATFORM_NAMES[conn.platform] || conn.platform,
            is_active: conn.is_active,
          }))
        );
      }
    } catch (error) {
      console.error("Error fetching platform connections:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleConnect = async (platform: string) => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast.error("Please sign in to connect platforms");
        return;
      }

      toast.info(`Opening ${PLATFORM_NAMES[platform]} OAuth...`);
      
      // Call edge function to initiate OAuth flow
      const { data, error } = await supabase.functions.invoke("connect-social-platform", {
        body: { platform },
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      if (error) throw error;
      
      if (data?.auth_url) {
        window.location.href = data.auth_url;
      }
    } catch (error: any) {
      console.error("Connection error:", error);
      toast.error(error.message || `Failed to connect to ${PLATFORM_NAMES[platform]}`);
    }
  };

  const handleDisconnect = async (connectionId: string, platform: string) => {
    try {
      const { error } = await supabase
        .from("platform_connections")
        .update({ is_active: false })
        .eq("id", connectionId);

      if (error) throw error;

      toast.success(`Disconnected from ${PLATFORM_NAMES[platform]}`);
      fetchConnections();
    } catch (error: any) {
      console.error("Disconnect error:", error);
      toast.error("Failed to disconnect platform");
    }
  };

  const handleWithdraw = async (connectionId: string, platform: string, balance: number) => {
    if (balance < 10) {
      toast.error("Minimum withdrawal is $10");
      return;
    }

    setWithdrawing(connectionId);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast.error("Please sign in to withdraw");
        return;
      }

      const { data, error } = await supabase.functions.invoke("withdraw-platform-earnings", {
        body: { 
          platform_connection_id: connectionId,
          platform,
          amount: balance 
        },
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      if (error) throw error;

      toast.success(`Withdrew $${balance.toFixed(2)} from ${PLATFORM_NAMES[platform]} to your wallet`);
      fetchConnections();
    } catch (error: any) {
      console.error("Withdrawal error:", error);
      toast.error(error.message || "Failed to withdraw earnings");
    } finally {
      setWithdrawing(null);
    }
  };

  const availablePlatforms = ["instagram", "twitter", "youtube", "twitch", "reddit", "facebook", "tiktok", "linkedin", "snapchat", "telegram"];
  const connectedPlatforms = connections.filter(c => c.is_active).map(c => c.platform);
  const unconnectedPlatforms = availablePlatforms.filter(p => !connectedPlatforms.includes(p));

  if (loading) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="animate-pulse space-y-4">
            <div className="h-4 bg-muted rounded w-3/4"></div>
            <div className="h-8 bg-muted rounded"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <LinkIcon className="w-5 h-5" />
            Connected Social Platforms
          </CardTitle>
          <CardDescription>
            Connect your social media accounts to withdraw earnings to your wallet
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {connections.filter(c => c.is_active).map((connection) => {
            const Icon = PLATFORM_ICONS[connection.platform];
            return (
              <div 
                key={connection.id}
                className="flex items-center justify-between p-4 border rounded-lg bg-card/50"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                    {Icon && <Icon className="w-5 h-5 text-primary" />}
                  </div>
                  <div>
                    <p className="font-medium">{PLATFORM_NAMES[connection.platform]}</p>
                    <p className="text-sm text-muted-foreground">@{connection.platform_username}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="text-right">
                    <p className="text-lg font-semibold">
                      ${(connection.earnings_balance || 0).toFixed(2)}
                    </p>
                    <p className="text-xs text-muted-foreground">Available</p>
                  </div>
                  <Button
                    size="sm"
                    onClick={() => handleWithdraw(connection.id, connection.platform, connection.earnings_balance || 0)}
                    disabled={withdrawing === connection.id || (connection.earnings_balance || 0) < 10}
                  >
                    <Download className="w-4 h-4 mr-1" />
                    {withdrawing === connection.id ? "Processing..." : "Withdraw"}
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => handleDisconnect(connection.id, connection.platform)}
                  >
                    <Unlink className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            );
          })}

          {connections.filter(c => c.is_active).length === 0 && (
            <div className="text-center py-6 text-muted-foreground">
              <p>No platforms connected yet</p>
              <p className="text-sm mt-1">Connect your social accounts below to start withdrawing earnings</p>
            </div>
          )}
        </CardContent>
      </Card>

      {unconnectedPlatforms.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Available Platforms</CardTitle>
            <CardDescription>
              Connect more platforms to consolidate your earnings
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {unconnectedPlatforms.map((platform) => {
                const Icon = PLATFORM_ICONS[platform];
                return (
                  <Button
                    key={platform}
                    variant="outline"
                    className="h-auto py-4"
                    onClick={() => handleConnect(platform)}
                  >
                    <div className="flex flex-col items-center gap-2">
                      {Icon && <Icon className="w-6 h-6" />}
                      <span className="text-sm">{PLATFORM_NAMES[platform]}</span>
                    </div>
                  </Button>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};
