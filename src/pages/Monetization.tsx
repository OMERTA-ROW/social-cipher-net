import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import Navigation from "@/components/Navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { DollarSign, TrendingUp, Users, CreditCard, Loader2 } from "lucide-react";
import { User } from "@supabase/supabase-js";

const Monetization = () => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentTier, setCurrentTier] = useState("CyberFree");
  const [earnings, setEarnings] = useState({ 
    tips: 0, 
    subscriptions: 0, 
    total: 0,
    payPerView: 0,
    payPerClick: 0
  });
  const navigate = useNavigate();
  const { toast } = useToast();

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
    if (user) {
      fetchEarnings();
      checkSubscriptionTier();
    }
  }, [user]);

  const checkSubscriptionTier = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const { data, error } = await supabase.functions.invoke("check-subscription", {
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });
      
      if (error) throw error;

      if (data?.tier) {
        setCurrentTier(data.tier);
      }
    } catch (error: any) {
      console.error("Error checking tier:", error);
    }
  };

  const fetchEarnings = async () => {
    if (!user) return;
    
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("creator_earnings")
        .select("amount, earning_type")
        .eq("creator_id", user.id);

      if (error) throw error;

      const payPerView = data
        ?.filter(e => e.earning_type === "pay_per_view")
        .reduce((sum, e) => sum + Number(e.amount), 0) || 0;
      
      const payPerClick = data
        ?.filter(e => e.earning_type === "pay_per_click")
        .reduce((sum, e) => sum + Number(e.amount), 0) || 0;

      const total = payPerView + payPerClick;

      setEarnings({
        total,
        tips: 0,
        subscriptions: 0,
        payPerView,
        payPerClick,
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to load earnings",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCreateSubscription = async () => {
    toast({
      title: "Coming Soon",
      description: "Subscription setup will be available soon!",
    });
  };

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      <div className="container mx-auto px-4 py-8">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-4xl font-bold mb-2">Monetization Dashboard</h1>
            <p className="text-muted-foreground">
              Manage your earnings and payment settings
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Badge variant="outline" className="text-sm py-1 px-3">
              {currentTier}
            </Badge>
            <Button 
              variant="outline" 
              onClick={() => navigate("/subscription")}
            >
              Upgrade Tier
            </Button>
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin" />
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total Earnings</CardTitle>
                  <DollarSign className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">${earnings.total.toFixed(2)}</div>
                  <p className="text-xs text-muted-foreground">All time</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Pay Per View</CardTitle>
                  <TrendingUp className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">${earnings.payPerView.toFixed(2)}</div>
                  <p className="text-xs text-muted-foreground">Content unlocks</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Pay Per Click</CardTitle>
                  <Users className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">${earnings.payPerClick.toFixed(2)}</div>
                  <p className="text-xs text-muted-foreground">Click revenue</p>
                </CardContent>
              </Card>
            </div>

            <Tabs defaultValue="overview" className="space-y-6">
              <TabsList>
                <TabsTrigger value="overview">Overview</TabsTrigger>
                <TabsTrigger value="subscriptions">Subscriptions</TabsTrigger>
                <TabsTrigger value="payouts">Payouts</TabsTrigger>
              </TabsList>

              <TabsContent value="overview" className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Recent Activity</CardTitle>
                    <CardDescription>Your latest earnings and transactions</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div className="flex items-center justify-between p-4 border rounded-lg">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-green-500/20 flex items-center justify-center">
                            <DollarSign className="w-5 h-5 text-green-500" />
                          </div>
                          <div>
                            <p className="font-medium">Tip from @supporter123</p>
                            <p className="text-sm text-muted-foreground">2 hours ago</p>
                          </div>
                        </div>
                        <Badge variant="outline">+$5.00</Badge>
                      </div>

                      <div className="flex items-center justify-between p-4 border rounded-lg">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-blue-500/20 flex items-center justify-center">
                            <Users className="w-5 h-5 text-blue-500" />
                          </div>
                          <div>
                            <p className="font-medium">New subscription</p>
                            <p className="text-sm text-muted-foreground">1 day ago</p>
                          </div>
                        </div>
                        <Badge variant="outline">+$9.99</Badge>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="subscriptions" className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Subscription Tiers</CardTitle>
                    <CardDescription>Set up monthly subscriptions for your supporters</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Button onClick={handleCreateSubscription} className="w-full">
                      <CreditCard className="w-4 h-4 mr-2" />
                      Create Subscription Tier
                    </Button>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="payouts" className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Payout Settings</CardTitle>
                    <CardDescription>Manage how you receive your earnings</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div className="flex items-center justify-between p-4 border rounded-lg">
                        <div>
                          <p className="font-medium">Available Balance</p>
                          <p className="text-sm text-muted-foreground">Ready to withdraw</p>
                        </div>
                        <p className="text-2xl font-bold">${earnings.total.toFixed(2)}</p>
                      </div>
                      <Button variant="outline" className="w-full">
                        Configure Payout Method
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </>
        )}
      </div>
    </div>
  );
};

export default Monetization;
