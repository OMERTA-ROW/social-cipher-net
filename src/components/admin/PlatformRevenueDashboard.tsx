import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { Loader2, Save } from "lucide-react";
import { money } from "@/hooks/usePlatformFees";

interface RevenueRow { source: string; amount: number; created_at: string }
interface FeeRow { revenue_type: string; percent: number }

const LABELS: Record<string, string> = {
  gifts: "Gifts",
  tips: "Tips",
  creator_subscriptions: "Creator subscriptions",
  shop_sales: "Shop sales",
  affiliate_conversions: "Affiliate conversions",
};

/**
 * Owner-only revenue console. Every figure is summed from recorded rows —
 * when a stream has no activity it reads zero rather than a sample number.
 */
const PlatformRevenueDashboard = () => {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [revenue, setRevenue] = useState<RevenueRow[]>([]);
  const [fees, setFees] = useState<FeeRow[]>([]);
  const [draft, setDraft] = useState<Record<string, string>>({});
  const [shopCommission, setShopCommission] = useState(0);
  const [entitlements, setEntitlements] = useState<Array<{ tier_key: string }>>([]);
  const [tiers, setTiers] = useState<Array<{ tier_key?: string; name?: string; price?: number }>>([]);
  const [placements, setPlacements] = useState<Record<string, { impressions: number; clicks: number }>>({});

  const load = useCallback(async () => {
    setLoading(true);
    const [rev, feeRes, earn, ent, tierRes, imp, clk] = await Promise.all([
      supabase.from("platform_revenue").select("source, amount, created_at").order("created_at", { ascending: false }).limit(5000),
      supabase.from("platform_fee_rates").select("revenue_type, percent").order("revenue_type"),
      supabase.from("platform_earnings").select("amount"),
      supabase.from("user_entitlements").select("tier_key").eq("status", "active"),
      supabase.from("subscription_tiers").select("*"),
      supabase.from("ad_impressions").select("placement"),
      supabase.from("ad_clicks").select("placement"),
    ]);

    setRevenue((rev.data ?? []) as RevenueRow[]);
    setFees((feeRes.data ?? []) as FeeRow[]);
    setDraft(Object.fromEntries((feeRes.data ?? []).map((f: any) => [f.revenue_type, String(f.percent)])));
    setShopCommission((earn.data ?? []).reduce((s: number, r: any) => s + Number(r.amount ?? 0), 0));
    setEntitlements((ent.data ?? []) as any);
    setTiers((tierRes.data ?? []) as any);

    const next: Record<string, { impressions: number; clicks: number }> = {};
    (imp.data ?? []).forEach((r: any) => {
      next[r.placement] = next[r.placement] ?? { impressions: 0, clicks: 0 };
      next[r.placement].impressions += 1;
    });
    (clk.data ?? []).forEach((r: any) => {
      next[r.placement] = next[r.placement] ?? { impressions: 0, clicks: 0 };
      next[r.placement].clicks += 1;
    });
    setPlacements(next);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const saveFee = async (revenueType: string) => {
    const percent = Number(draft[revenueType]);
    if (!Number.isFinite(percent) || percent < 0 || percent > 100) {
      toast.error("Enter a percentage between 0 and 100");
      return;
    }
    setSaving(true);
    const { data: { user } } = await supabase.auth.getUser();
    const { error } = await supabase
      .from("platform_fee_rates")
      .update({ percent, updated_by: user?.id ?? null, updated_at: new Date().toISOString() })
      .eq("revenue_type", revenueType);
    setSaving(false);
    if (error) { toast.error(error.message); return; }
    toast.success(`${LABELS[revenueType] ?? revenueType} rate saved`);
    load();
  };

  const bySource = revenue.reduce<Record<string, number>>((acc, row) => {
    acc[row.source] = (acc[row.source] ?? 0) + Number(row.amount ?? 0);
    return acc;
  }, {});
  const total = Object.values(bySource).reduce((s, v) => s + v, 0) + shopCommission;

  const mrr = entitlements.reduce((sum, e) => {
    const tier: any = tiers.find((t: any) => t.tier_key === e.tier_key || t.name === e.tier_key);
    return sum + Number(tier?.price ?? 0);
  }, 0);

  if (loading) {
    return <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin" /></div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">Platform revenue</h2>
        <p className="text-muted-foreground">All Cyber Link revenue streams, summed from recorded activity.</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { label: "Total recorded", value: money(total) },
          { label: "Advertising", value: money(bySource.advertising ?? 0) },
          { label: "Shop commission", value: money(shopCommission) },
          { label: "Subscription MRR", value: money(mrr) },
        ].map((item) => (
          <Card key={item.label}>
            <CardHeader className="pb-2"><CardTitle className="text-sm font-medium">{item.label}</CardTitle></CardHeader>
            <CardContent><div className="text-2xl font-bold">{item.value}</div></CardContent>
          </Card>
        ))}
      </div>

      <Tabs defaultValue="streams">
        <TabsList>
          <TabsTrigger value="streams">Revenue streams</TabsTrigger>
          <TabsTrigger value="ads">Ad inventory</TabsTrigger>
          <TabsTrigger value="fees">House cut</TabsTrigger>
        </TabsList>

        <TabsContent value="streams" className="pt-4">
          <Card>
            <CardHeader><CardTitle className="text-lg">By source</CardTitle></CardHeader>
            <CardContent>
              {Object.keys(bySource).length === 0 && shopCommission === 0 ? (
                <p className="text-muted-foreground">No platform revenue recorded yet.</p>
              ) : (
                <div className="space-y-2">
                  {Object.entries(bySource).map(([source, amount]) => (
                    <div key={source} className="flex justify-between p-3 border rounded-lg">
                      <span className="capitalize">{source.replace(/_/g, " ")}</span>
                      <span className="font-semibold">{money(amount)}</span>
                    </div>
                  ))}
                  {shopCommission > 0 && (
                    <div className="flex justify-between p-3 border rounded-lg">
                      <span>Shop commission</span>
                      <span className="font-semibold">{money(shopCommission)}</span>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="ads" className="pt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Inventory by placement</CardTitle>
              <CardDescription>Impressions, clicks and click-through rate.</CardDescription>
            </CardHeader>
            <CardContent>
              {Object.keys(placements).length === 0 ? (
                <p className="text-muted-foreground">No ads have been served yet.</p>
              ) : (
                <div className="space-y-2">
                  {Object.entries(placements).map(([placement, s]) => (
                    <div key={placement} className="flex justify-between items-center p-3 border rounded-lg">
                      <span className="capitalize">{placement}</span>
                      <div className="flex gap-4 text-sm">
                        <span>{s.impressions} impressions</span>
                        <span>{s.clicks} clicks</span>
                        <Badge variant="outline">
                          {s.impressions ? ((s.clicks / s.impressions) * 100).toFixed(2) : "0.00"}% CTR
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="fees" className="pt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Platform percentage by revenue type</CardTitle>
              <CardDescription>Creators see this as gross, platform fee and net payout.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {fees.map((fee) => (
                <div key={fee.revenue_type} className="flex items-center gap-3">
                  <span className="flex-1">{LABELS[fee.revenue_type] ?? fee.revenue_type}</span>
                  <Input
                    type="number" min="0" max="100" step="0.1" className="w-28"
                    value={draft[fee.revenue_type] ?? ""}
                    onChange={(e) => setDraft({ ...draft, [fee.revenue_type]: e.target.value })}
                  />
                  <span className="text-muted-foreground">%</span>
                  <Button size="sm" variant="outline" disabled={saving} onClick={() => saveFee(fee.revenue_type)}>
                    <Save className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default PlatformRevenueDashboard;
