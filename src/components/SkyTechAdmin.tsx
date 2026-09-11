import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Sparkles, RefreshCw, Zap, Globe, TrendingUp } from "lucide-react";

interface PlatformConfig {
  id: string;
  platform_name: string;
  display_name: string;
  platform_type: string;
  description: string;
  is_active: boolean;
  auto_enabled: boolean;
  created_at: string;
}

interface AppUpdate {
  id: string;
  title: string;
  description: string;
  update_type: string;
  version: string;
  is_applied: boolean;
  created_at: string;
}

export const SkyTechAdmin = () => {
  const [platforms, setPlatforms] = useState<PlatformConfig[]>([]);
  const [updates, setUpdates] = useState<AppUpdate[]>([]);
  const [loading, setLoading] = useState(true);
  const [discovering, setDiscovering] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [platformsRes, updatesRes] = await Promise.all([
        supabase
          .from('skytech_platform_configs' as any)
          .select('id, platform_name, platform_type, display_name, description, icon_url, required_scopes, is_active, auto_enabled, created_at, updated_at')
          .order('created_at', { ascending: false }),
        supabase.from('skytech_app_updates' as any).select('*').order('created_at', { ascending: false })
      ]);

      if (platformsRes.data) setPlatforms(platformsRes.data as unknown as PlatformConfig[]);
      if (updatesRes.data) setUpdates(updatesRes.data as unknown as AppUpdate[]);
    } catch (error: any) {
      toast({
        title: "Error loading data",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const discoverPlatforms = async () => {
    setDiscovering(true);
    try {
      const { data, error } = await supabase.functions.invoke('skytech-discover-platforms', {
        body: { action: 'discover' }
      });

      if (error) throw error;

      toast({
        title: "AI Discovery Complete",
        description: "New platform suggestions generated",
      });

      console.log('AI Suggestions:', data.suggestions);
    } catch (error: any) {
      toast({
        title: "Discovery failed",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setDiscovering(false);
    }
  };

  const discoverUpdates = async () => {
    setDiscovering(true);
    try {
      const { data, error } = await supabase.functions.invoke('skytech-auto-update', {
        body: { action: 'discover_updates' }
      });

      if (error) throw error;

      toast({
        title: "Update Discovery Complete",
        description: "New feature suggestions generated",
      });

      console.log('Update Suggestions:', data.suggestions);
    } catch (error: any) {
      toast({
        title: "Discovery failed",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setDiscovering(false);
    }
  };

  const togglePlatform = async (id: string, currentState: boolean) => {
    try {
      const { error } = await supabase
        .from('skytech_platform_configs' as any)
        .update({ is_active: !currentState })
        .eq('id', id);

      if (error) throw error;

      toast({
        title: "Platform updated",
        description: "Integration status changed",
      });

      loadData();
    } catch (error: any) {
      toast({
        title: "Update failed",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const applyUpdate = async (updateId: string) => {
    try {
      const { error } = await supabase.functions.invoke('skytech-auto-update', {
        body: { action: 'apply_update', update_id: updateId }
      });

      if (error) throw error;

      toast({
        title: "Update applied",
        description: "Changes have been applied successfully",
      });

      loadData();
    } catch (error: any) {
      toast({
        title: "Update failed",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            <Zap className="h-8 w-8 text-primary" />
            SkyTech Control Center
          </h2>
          <p className="text-muted-foreground mt-1">
            AI-powered auto-discovery and integration management
          </p>
        </div>
        <Button onClick={loadData} variant="outline" size="sm">
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh
        </Button>
      </div>

      <Tabs defaultValue="platforms" className="space-y-4">
        <TabsList>
          <TabsTrigger value="platforms">
            <Globe className="h-4 w-4 mr-2" />
            Platforms
          </TabsTrigger>
          <TabsTrigger value="updates">
            <TrendingUp className="h-4 w-4 mr-2" />
            Updates
          </TabsTrigger>
        </TabsList>

        <TabsContent value="platforms" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Platform Integrations</CardTitle>
              <CardDescription>
                Manage and discover social media, streaming, and affiliate platforms
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Button 
                onClick={discoverPlatforms} 
                disabled={discovering}
                className="w-full"
              >
                {discovering ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Discovering...
                  </>
                ) : (
                  <>
                    <Sparkles className="h-4 w-4 mr-2" />
                    AI Discover New Platforms
                  </>
                )}
              </Button>

              <div className="space-y-3">
                {platforms.map((platform) => (
                  <Card key={platform.id}>
                    <CardContent className="flex items-center justify-between p-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <h4 className="font-semibold">{platform.display_name}</h4>
                          <Badge variant={platform.platform_type === 'social' ? 'default' : 'secondary'}>
                            {platform.platform_type}
                          </Badge>
                          {platform.auto_enabled && (
                            <Badge variant="outline" className="border-primary text-primary">
                              Auto-enabled
                            </Badge>
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground mt-1">
                          {platform.description}
                        </p>
                      </div>
                      <Button
                        variant={platform.is_active ? "default" : "outline"}
                        onClick={() => togglePlatform(platform.id, platform.is_active)}
                      >
                        {platform.is_active ? "Active" : "Inactive"}
                      </Button>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="updates" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Application Updates</CardTitle>
              <CardDescription>
                Manage and discover new features and improvements
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Button 
                onClick={discoverUpdates} 
                disabled={discovering}
                className="w-full"
              >
                {discovering ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Discovering...
                  </>
                ) : (
                  <>
                    <Sparkles className="h-4 w-4 mr-2" />
                    AI Discover New Updates
                  </>
                )}
              </Button>

              <div className="space-y-3">
                {updates.map((update) => (
                  <Card key={update.id}>
                    <CardContent className="flex items-center justify-between p-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <h4 className="font-semibold">{update.title}</h4>
                          <Badge variant="outline">{update.update_type}</Badge>
                          <Badge variant="secondary">v{update.version}</Badge>
                        </div>
                        <p className="text-sm text-muted-foreground mt-1">
                          {update.description}
                        </p>
                      </div>
                      {!update.is_applied ? (
                        <Button onClick={() => applyUpdate(update.id)}>
                          Apply
                        </Button>
                      ) : (
                        <Badge className="bg-green-500">Applied</Badge>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};
