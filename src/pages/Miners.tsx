import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import Navigation from "@/components/Navigation";
import { MiningDashboard } from "@/components/MiningDashboard";
import { ExternalMiningAccounts } from "@/components/ExternalMiningAccounts";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useMiningFeatures } from "@/hooks/useMiningFeatures";
import { Pickaxe, ExternalLink, Zap } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

const Miners = () => {
  const [user, setUser] = useState<any>(null);
  const navigate = useNavigate();
  const { draco, zozo, loading } = useMiningFeatures();

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) {
        navigate("/auth");
      } else {
        setUser(session.user);
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (!session) {
        navigate("/auth");
      } else {
        setUser(session.user);
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  useEffect(() => {
    if (!loading && !draco && !zozo) {
      navigate("/subscription");
    }
  }, [loading, draco, zozo, navigate]);

  if (loading) {
    return (
      <div className="min-h-screen bg-transparent">
        <Navigation />
        <div className="container mx-auto px-4 pt-24">
          <div className="text-center">
            <p className="text-muted-foreground">Loading...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-transparent">
      <Navigation />
      
      <div className="container mx-auto px-4 pt-24 pb-12">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-8">
            <div className="flex items-center justify-center gap-3 mb-4">
              <Pickaxe className="w-12 h-12 text-primary text-glow" />
              <h1 className="text-4xl md:text-5xl font-bold text-glow">Miners Hub</h1>
            </div>
            <p className="text-muted-foreground text-lg">
              Premium Mining Features - Unlocked
            </p>
          </div>

          <Alert className="mb-6 border-primary/50 bg-primary/10">
            <Zap className="h-4 w-4 text-primary" />
            <AlertDescription>
              {draco && zozo 
                ? "You have access to both DRACO and ZoZo mining features!"
                : draco 
                  ? "You have access to DRACO mining features!"
                  : "You have access to ZoZo mining features!"}
            </AlertDescription>
          </Alert>

          <Tabs defaultValue="internal" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="internal" className="gap-2">
                <Pickaxe className="w-4 h-4" />
                Internal Mining
              </TabsTrigger>
              <TabsTrigger value="external" className="gap-2">
                <ExternalLink className="w-4 h-4" />
                External Accounts
              </TabsTrigger>
            </TabsList>

            <TabsContent value="internal" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Pickaxe className="w-5 h-5 text-primary" />
                    CyberLink Mining Dashboard
                  </CardTitle>
                  <CardDescription>
                    Manage your internal mining operations and boost performance with CyberLink tokens
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {draco && <MiningDashboard miningType="draco" isUnlocked={true} />}
                  {zozo && !draco && <MiningDashboard miningType="zozo" isUnlocked={true} />}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="external" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <ExternalLink className="w-5 h-5 text-primary" />
                    External Mining Accounts
                  </CardTitle>
                  <CardDescription>
                    Connect and optimize your external mining accounts from other platforms
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {draco && <ExternalMiningAccounts miningType="draco" isUnlocked={true} />}
                  {zozo && !draco && <ExternalMiningAccounts miningType="zozo" isUnlocked={true} />}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
};

export default Miners;
