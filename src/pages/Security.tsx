import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import Navigation from "@/components/Navigation";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Shield, Lock, Eye, Bell, History } from "lucide-react";
import { toast } from "sonner";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";

const Security = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<any>(null);
  const [twoFactorEnabled, setTwoFactorEnabled] = useState(false);
  const [privacy, setPrivacy] = useState<any>(null);
  const [auditLogs, setAuditLogs] = useState<any[]>([]);

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      navigate("/auth");
      return;
    }
    loadData(session.user.id);
  };

  const loadData = async (userId: string) => {
    try {
      const [profileRes, privacyRes, logsRes] = await Promise.all([
        supabase.from('profiles').select('*').eq('id', userId).single(),
        supabase.from('privacy_settings').select('*').eq('user_id', userId).single(),
        supabase.from('security_audit_log').select('*').eq('user_id', userId).order('created_at', { ascending: false }).limit(10)
      ]);

      if (profileRes.data) setProfile(profileRes.data);
      if (privacyRes.data) setPrivacy(privacyRes.data);
      if (logsRes.data) setAuditLogs(logsRes.data);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const updateProfile = async (updates: any) => {
    try {
      const { error } = await supabase
        .from('profiles')
        .update(updates)
        .eq('id', profile.id);

      if (error) throw error;

      setProfile({ ...profile, ...updates });
      toast.success("Profile updated");

      // Log security event
      await supabase.functions.invoke('security-audit', {
        body: { event_type: 'profile_updated', metadata: updates }
      });
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  const updatePrivacy = async (updates: any) => {
    try {
      const { error } = await supabase
        .from('privacy_settings')
        .update(updates)
        .eq('user_id', profile.id);

      if (error) throw error;

      setPrivacy({ ...privacy, ...updates });
      toast.success("Privacy settings updated");

      await supabase.functions.invoke('security-audit', {
        body: { event_type: 'privacy_updated', metadata: updates }
      });
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-transparent">
        <Navigation />
        <div className="container mx-auto px-4 pt-24 pb-12">
          <div className="text-center">Loading...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-transparent">
      <Navigation />
      <div className="container mx-auto px-4 pt-24 pb-12 max-w-4xl">
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-glow mb-2">Security Center</h1>
          <p className="text-muted-foreground">Manage your account security and privacy</p>
        </div>

        <Tabs defaultValue="security" className="space-y-6">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="security">
              <Shield className="w-4 h-4 mr-2" />
              Security
            </TabsTrigger>
            <TabsTrigger value="privacy">
              <Eye className="w-4 h-4 mr-2" />
              Privacy
            </TabsTrigger>
            <TabsTrigger value="activity">
              <History className="w-4 h-4 mr-2" />
              Activity
            </TabsTrigger>
          </TabsList>

          <TabsContent value="security" className="space-y-4">
            <Card className="glow-primary">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Lock className="w-5 h-5" />
                  Account Security
                </CardTitle>
                <CardDescription>
                  Protect your account with advanced security features
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <Label>Private Account</Label>
                    <p className="text-sm text-muted-foreground">
                      Only approved followers can see your content
                    </p>
                  </div>
                  <Switch
                    checked={profile?.is_private || false}
                    onCheckedChange={(checked) => updateProfile({ is_private: checked })}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <Label>Two-Factor Authentication</Label>
                    <p className="text-sm text-muted-foreground">
                      Add an extra layer of security (Coming soon)
                    </p>
                  </div>
                  <Switch
                    checked={profile?.two_factor_enabled || false}
                    disabled
                  />
                </div>

                <div className="pt-4 border-t">
                  <Button variant="outline" className="w-full" onClick={() => {
                    toast.info("Password change feature coming soon");
                  }}>
                    Change Password
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="privacy" className="space-y-4">
            <Card className="glow-accent">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Eye className="w-5 h-5" />
                  Privacy Controls
                </CardTitle>
                <CardDescription>
                  Control what information others can see
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <Label>Show Email</Label>
                    <p className="text-sm text-muted-foreground">
                      Display your email on your profile
                    </p>
                  </div>
                  <Switch
                    checked={privacy?.show_email || false}
                    onCheckedChange={(checked) => updatePrivacy({ show_email: checked })}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <Label>Show Activity</Label>
                    <p className="text-sm text-muted-foreground">
                      Let others see your online status
                    </p>
                  </div>
                  <Switch
                    checked={privacy?.show_activity || false}
                    onCheckedChange={(checked) => updatePrivacy({ show_activity: checked })}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <Label>Allow Messages</Label>
                    <p className="text-sm text-muted-foreground">
                      Receive direct messages from others
                    </p>
                  </div>
                  <Switch
                    checked={privacy?.allow_messages || false}
                    onCheckedChange={(checked) => updatePrivacy({ allow_messages: checked })}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <Label>Allow Tags</Label>
                    <p className="text-sm text-muted-foreground">
                      Let others tag you in posts
                    </p>
                  </div>
                  <Switch
                    checked={privacy?.allow_tags || false}
                    onCheckedChange={(checked) => updatePrivacy({ allow_tags: checked })}
                  />
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="activity" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <History className="w-5 h-5" />
                  Security Activity
                </CardTitle>
                <CardDescription>
                  Recent security events on your account
                </CardDescription>
              </CardHeader>
              <CardContent>
                {auditLogs.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-8">
                    No security events recorded yet
                  </p>
                ) : (
                  <div className="space-y-4">
                    {auditLogs.map((log) => (
                      <div key={log.id} className="flex items-start justify-between p-4 border rounded-lg">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <Badge variant="outline">{log.event_type}</Badge>
                            <span className="text-sm text-muted-foreground">
                              {new Date(log.created_at).toLocaleString()}
                            </span>
                          </div>
                          <p className="text-sm text-muted-foreground">
                            IP: {log.ip_address}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default Security;