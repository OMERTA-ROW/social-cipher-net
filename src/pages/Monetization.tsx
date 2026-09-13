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
import { money } from "@/hooks/usePlatformFees";
import { User } from "@supabase/supabase-js";
import CrossPlatformEarnings from "@/components/CrossPlatformEarnings";
import AffiliatesTab from "@/components/monetization/AffiliatesTab";
import { useTier } from "@/lib/tiers";
import BrandDealsTab from "@/components/monetization/BrandDealsTab";

const Monetization = () => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentTier, setCurrentTier] = useState("Free");
  const [earnings, setEarnings] = useState({ 
    tips: 0, 
    subscriptions: 0, 
    total: 0,
    payPerView: 0,
    payPerClick: 0,
    affiliate: 0,
    brandDeals: 0,
  });
  const [recent, setRecent] = useState<Array<{ id: string; amount: number; earning_type: string; created_at: string }>>([]);
  const [breakdown, setBreakdown] = useState<Array<{ type: string; gross: number; fee: number; net: number; currency: string }>>([]);
  const navigate = useNavigate();
  const { toast } = useToast();
  const { tier, isPaid, loading: tierLoading } = useTier();

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
        .select("id, amount, earning_type, gross_amount, platform_fee, net_amount, currency, created_at")
        .eq("creator_id", user.id)
        .order("created_at", { ascending: false });

      if (error) throw error;

      const payPerView = data
        ?.filter(e => e.earning_type === "pay_per_view")
        .reduce((sum, e) => sum + Number(e.amount), 0) || 0;
      
      const payPerClick = data
        ?.filter(e => e.earning_type === "pay_per_click")
        .reduce((sum, e) => sum + Number(e.amount), 0) || 0;

      const affiliate = data
        ?.filter(e => e.earning_type === "affiliate_commission")
        .reduce((sum, e) => sum + Number(e.amount), 0) || 0;

      // Brand deals count once they are actually paid.
      const [{ data: paidDeals }, { data: conversions }] = await Promise.all([
        supabase
        .from("brand_deals")
        .select("amount, platform_fee, net_amount, currency")
        .eq("creator_id", user.id)
        .eq("status", "paid"),
        supabase
          .from("affiliate_conversions")
          .select("commission_amount, platform_fee, net_amount, currency")
          .eq("user_id", user.id)
          .eq("status", "confirmed"),
      ]);
      const brandDeals = (paidDeals ?? []).reduce((sum, d: any) => sum + Number(d.net_amount ?? 0), 0);

      const total = payPerView + payPerClick + affiliate + brandDeals;

      setRecent(
        (data ?? []).slice(0, 10).map((e: any) => ({
          id: String(e.id),
          amount: Number(e.amount),
          earning_type: e.earning_type,
          created_at: e.created_at,
        })),
      );

      const rows = new Map<string, { type: string; gross: number; fee: number; net: number; currency: string }>();
      const add = (type: string, gross: number, fee: number, net: number, currency = "USD") => {
        const row = rows.get(type) ?? { type, gross: 0, fee: 0, net: 0, currency };
        row.gross += gross;
        row.fee += fee;
        row.net += net;
        rows.set(type, row);
      };
      (data ?? [])
        .filter((entry: any) => entry.earning_type !== "affiliate_commission")
        .forEach((entry: any) => add(
          entry.earning_type,
          Number(entry.gross_amount ?? entry.amount ?? 0),
          Number(entry.platform_fee ?? 0),
          Number(entry.net_amount ?? entry.amount ?? 0),
          entry.currency ?? "USD",
        ));
      (conversions ?? []).forEach((entry: any) => add(
        "affiliate_conversions",
        Number(entry.commission_amount ?? 0),
        Number(entry.platform_fee ?? 0),
        Number(entry.net_amount ?? 0),
        entry.currency ?? "USD",
      ));
      (paidDeals ?? []).forEach((entry: any) => add(
        "brand_deals",
        Number(entry.amount ?? 0),
        Number(entry.platform_fee ?? 0),
        Number(entry.net_amount ?? 0),
        entry.currency ?? "USD",
      ));
      setBreakdown([...rows.values()]);

      setEarnings({
        total,
        tips: 0,
        subscriptions: 0,
        payPerView,
        payPerClick,
        affiliate,
        brandDeals,
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

  return (
    <div className="min-h-screen bg-transparent">
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
              {tierLoading ? "…" : currentTier}
            </Badge>
            <Button 
              variant="outline" 
              onClick={() => navigate("/subscription")}
            >
              Upgrade Tier
            </Button>
          </div>
        </div>

        <div className="mb-8">
          <CrossPlatformEarnings />
        </div>

        {loading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin" />
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-3 xl:grid-cols-5 gap-6 mb-8">
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

              {isPaid && (<>
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
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Affiliates</CardTitle>
                  <DollarSign className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">${earnings.affiliate.toFixed(2)}</div>
                  <p className="text-xs text-muted-foreground">Net commissions</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Brand Deals</CardTitle>
                  <TrendingUp className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">${earnings.brandDeals.toFixed(2)}</div>
                  <p className="text-xs text-muted-foreground">Paid deals, net</p>
                </CardContent>
              </Card>
              </>)}
            </div>


            <Tabs defaultValue="overview" className="space-y-6">
              <TabsList>
                <TabsTrigger value="overview">Overview</TabsTrigger>
                {isPaid && <TabsTrigger value="affiliates">Affiliates</TabsTrigger>}
                {isPaid && <TabsTrigger value="brand-deals">Brand Deals</TabsTrigger>}
                <TabsTrigger value="subscriptions">Subscriptions</TabsTrigger>
                <TabsTrigger value="payouts">Payouts</TabsTrigger>
              </TabsList>

              {isPaid && <TabsContent value="affiliates"><AffiliatesTab /></TabsContent>}
              {isPaid && <TabsContent value="brand-deals"><BrandDealsTab /></TabsContent>}

              <TabsContent value="overview" className="space-y-6">
                {!isPaid && !tierLoading && (
                  <Card>
                    <CardHeader>
                      <CardTitle>Unlock creator monetization</CardTitle>
                      <CardDescription>
                        Pay-per-view and pay-per-click posts, affiliate links and brand deals are part of Plus and Pro.
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <Button onClick={() => navigate("/subscription")}>See plans</Button>
                    </CardContent>
                  </Card>
                )}
                <Card>
                  <CardHeader>
                    <CardTitle>Earnings breakdown</CardTitle>
                    <CardDescription>Gross income, Cyber Link fee, and your net payout by revenue type.</CardDescription>
                  </CardHeader>
                  <CardContent>
                    {breakdown.length === 0 ? (
                      <p className="text-sm text-muted-foreground">No completed earnings to break down yet.</p>
                    ) : (
                      <div className="overflow-x-auto">
                        <div className="min-w-[520px] space-y-2">
                          <div className="grid grid-cols-[minmax(0,1fr)_repeat(3,7rem)] gap-3 px-3 text-xs text-muted-foreground">
                            <span>Revenue type</span><span className="text-right">Gross</span><span className="text-right">Platform fee</span><span className="text-right">Net payout</span>
                          </div>
                          {breakdown.map((row) => (
                            <div key={row.type} className="grid grid-cols-[minmax(0,1fr)_repeat(3,7rem)] gap-3 rounded-md border p-3 text-sm">
                              <span className="capitalize">{row.type.replace(/_/g, " ")}</span>
                              <span className="text-right">{money(row.gross, row.currency)}</span>
                              <span className="text-right text-muted-foreground">{money(row.fee, row.currency)}</span>
                              <span className="text-right font-semibold text-primary">{money(row.net, row.currency)}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader>
                    <CardTitle>Recent Activity</CardTitle>
                    <CardDescription>Your latest earnings on Cyber Link Social</CardDescription>
                  </CardHeader>
                  <CardContent>
                    {recent.length === 0 ? (
                      <p className="text-sm text-muted-foreground">
                        No earnings recorded yet on Cyber Link Social.
                      </p>
                    ) : (
                      <div className="space-y-4">
                        {recent.map((item) => (
                          <div
                            key={item.id}
                            className="flex items-center justify-between p-4 border rounded-lg"
                          >
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 rounded-full bg-green-500/20 flex items-center justify-center">
                                <DollarSign className="w-5 h-5 text-green-500" />
                              </div>
                              <div>
                                <p className="font-medium capitalize">
                                  {item.earning_type.replace(/_/g, " ")}
                                </p>
                                <p className="text-sm text-muted-foreground">
                                  {new Date(item.created_at).toLocaleString()}
                                </p>
                              </div>
                            </div>
                            <Badge variant="outline">+${item.amount.toFixed(2)}</Badge>
                          </div>
                        ))}
                      </div>
                    )}
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
                    <Button onClick={() => navigate("/subscription")} className="w-full">
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
                      <p className="text-sm text-muted-foreground">Payout controls appear after a supported payment account is connected.</p>
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
