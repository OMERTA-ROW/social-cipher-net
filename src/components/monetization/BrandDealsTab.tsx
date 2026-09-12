import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import {
  Card, CardContent, CardDescription, CardHeader, CardTitle,
} from "@/components/ui/card";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { Briefcase, Copy, Loader2, Plus, Megaphone } from "lucide-react";
import { usePlatformFees, feePercentOf, money, splitAmount } from "@/hooks/usePlatformFees";

const STATUSES = [
  { value: "offer_received", label: "Offer received" },
  { value: "negotiating", label: "Negotiating" },
  { value: "accepted", label: "Accepted" },
  { value: "content_delivered", label: "Content delivered" },
  { value: "paid", label: "Paid" },
];

interface Deal {
  id: string;
  brand_name: string;
  title: string;
  amount: number;
  platform_fee: number;
  net_amount: number;
  status: string;
  created_at: string;
}

interface Campaign {
  id: string;
  brand_user_id: string;
  brand_name: string;
  title: string;
  description: string | null;
  niche: string | null;
  budget: number | null;
  min_followers: number;
  status: string;
}

const slugify = (value: string) =>
  value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "").slice(0, 40);

/** Brand deals: media kit, campaign marketplace and the deal pipeline. */
const BrandDealsTab = () => {
  const [userId, setUserId] = useState<string | null>(null);
  const [kit, setKit] = useState<any>(null);
  const [deals, setDeals] = useState<Deal[]>([]);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [appliedIds, setAppliedIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [dealOpen, setDealOpen] = useState(false);
  const [campaignOpen, setCampaignOpen] = useState(false);
  const { data: rates } = usePlatformFees();
  const feePercent = feePercentOf(rates, "creator_subscriptions");

  const [kitForm, setKitForm] = useState({ headline: "", bio: "", niche: "", contact_email: "", is_public: false });
  const [dealForm, setDealForm] = useState({ brand_name: "", title: "", amount: "", notes: "" });
  const [campaignForm, setCampaignForm] = useState({ brand_name: "", title: "", description: "", niche: "", budget: "", min_followers: "0" });

  const load = useCallback(async () => {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    setUserId(user?.id ?? null);
    if (!user) { setLoading(false); return; }

    const [kitRes, dealRes, campRes, appRes] = await Promise.all([
      supabase.from("creator_media_kits").select("*").eq("user_id", user.id).maybeSingle(),
      supabase.from("brand_deals").select("id, brand_name, title, amount, platform_fee, net_amount, status, created_at")
        .eq("creator_id", user.id).order("created_at", { ascending: false }),
      supabase.from("brand_campaigns").select("id, brand_user_id, brand_name, title, description, niche, budget, min_followers, status")
        .order("created_at", { ascending: false }).limit(50),
      supabase.from("campaign_applications").select("campaign_id").eq("creator_id", user.id),
    ]);

    if (kitRes.data) {
      setKit(kitRes.data);
      setKitForm({
        headline: kitRes.data.headline ?? "",
        bio: kitRes.data.bio ?? "",
        niche: kitRes.data.niche ?? "",
        contact_email: kitRes.data.contact_email ?? "",
        is_public: kitRes.data.is_public,
      });
    }
    setDeals((dealRes.data ?? []) as Deal[]);
    setCampaigns((campRes.data ?? []) as Campaign[]);
    setAppliedIds(new Set((appRes.data ?? []).map((a: any) => a.campaign_id)));
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const saveKit = async () => {
    if (!userId) return;
    setSaving(true);
    const { data: profile } = await supabase.from("profiles").select("username").eq("id", userId).maybeSingle();
    const base = slugify(profile?.username || kitForm.headline || "creator") || "creator";
    const { error } = await supabase.from("creator_media_kits").upsert(
      { user_id: userId, slug: kit?.slug ?? `${base}-${userId.slice(0, 6)}`, ...kitForm },
      { onConflict: "user_id" },
    );
    setSaving(false);
    if (error) { toast.error(error.message); return; }
    toast.success("Media kit saved");
    load();
  };

  const createDeal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userId) return;
    const gross = Number(dealForm.amount || 0);
    const { fee, net } = splitAmount(gross, feePercent);
    setSaving(true);
    const { error } = await supabase.from("brand_deals").insert({
      creator_id: userId,
      brand_name: dealForm.brand_name,
      title: dealForm.title,
      amount: gross,
      platform_fee: fee,
      net_amount: net,
      notes: dealForm.notes || null,
    });
    setSaving(false);
    if (error) { toast.error(error.message); return; }
    toast.success("Deal added to your pipeline");
    setDealForm({ brand_name: "", title: "", amount: "", notes: "" });
    setDealOpen(false);
    load();
  };

  const updateStatus = async (deal: Deal, status: string) => {
    const { error } = await supabase
      .from("brand_deals")
      .update({ status, paid_at: status === "paid" ? new Date().toISOString() : null })
      .eq("id", deal.id);
    if (error) { toast.error(error.message); return; }
    load();
  };

  const createCampaign = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userId) return;
    setSaving(true);
    const { error } = await supabase.from("brand_campaigns").insert({
      brand_user_id: userId,
      brand_name: campaignForm.brand_name,
      title: campaignForm.title,
      description: campaignForm.description || null,
      niche: campaignForm.niche || null,
      budget: campaignForm.budget ? Number(campaignForm.budget) : null,
      min_followers: Number(campaignForm.min_followers || 0),
    });
    setSaving(false);
    if (error) { toast.error(error.message); return; }
    toast.success("Campaign posted");
    setCampaignForm({ brand_name: "", title: "", description: "", niche: "", budget: "", min_followers: "0" });
    setCampaignOpen(false);
    load();
  };

  const apply = async (campaign: Campaign) => {
    if (!userId) return;
    const { error } = await supabase.from("campaign_applications").insert({
      campaign_id: campaign.id,
      creator_id: userId,
    });
    if (error) { toast.error(error.message); return; }
    toast.success("Application sent");
    setAppliedIds(new Set([...appliedIds, campaign.id]));
  };

  const pipelineTotal = deals.reduce((sum, d) => sum + Number(d.net_amount ?? 0), 0);
  const paidTotal = deals.filter((d) => d.status === "paid").reduce((sum, d) => sum + Number(d.net_amount ?? 0), 0);

  if (loading) {
    return <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin" /></div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">Brand deals</h2>
        <p className="text-muted-foreground">
          Your media kit, the campaign marketplace and every deal from first offer to payout.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Media kit</CardTitle>
          <CardDescription>
            Built from your real profile stats. Publish it to share one link with brands.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <Label htmlFor="headline">Headline</Label>
              <Input id="headline" value={kitForm.headline}
                onChange={(e) => setKitForm({ ...kitForm, headline: e.target.value })}
                placeholder="What you make and who it is for" />
            </div>
            <div>
              <Label htmlFor="niche">Niche</Label>
              <Input id="niche" value={kitForm.niche}
                onChange={(e) => setKitForm({ ...kitForm, niche: e.target.value })}
                placeholder="Gaming, crypto, fashion..." />
            </div>
          </div>
          <div>
            <Label htmlFor="kitbio">About</Label>
            <Textarea id="kitbio" value={kitForm.bio}
              onChange={(e) => setKitForm({ ...kitForm, bio: e.target.value })} />
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <Label htmlFor="contact">Contact email</Label>
              <Input id="contact" type="email" value={kitForm.contact_email}
                onChange={(e) => setKitForm({ ...kitForm, contact_email: e.target.value })} />
            </div>
            <div className="flex items-end gap-3">
              <Switch id="public" checked={kitForm.is_public}
                onCheckedChange={(v) => setKitForm({ ...kitForm, is_public: v })} />
              <Label htmlFor="public">Publish publicly</Label>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button onClick={saveKit} disabled={saving}>
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save media kit"}
            </Button>
            {kit?.slug && (
              <>
                <Button variant="outline" asChild>
                  <Link to={`/kit/${kit.slug}`}>View media kit</Link>
                </Button>
                <Button variant="outline" onClick={() => {
                  navigator.clipboard.writeText(`${window.location.origin}/kit/${kit.slug}`);
                  toast.success("Media kit link copied");
                }}>
                  <Copy className="mr-2 h-4 w-4" />Copy link
                </Button>
              </>
            )}
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 sm:grid-cols-2">
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm font-medium">Pipeline value (net)</CardTitle></CardHeader>
          <CardContent><div className="text-2xl font-bold">{money(pipelineTotal)}</div></CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm font-medium">Paid out (net)</CardTitle></CardHeader>
          <CardContent><div className="text-2xl font-bold">{money(paidTotal)}</div></CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="flex-row items-center justify-between space-y-0">
          <div>
            <CardTitle className="text-lg">Deal pipeline</CardTitle>
            <CardDescription>Gross, platform fee and your net on every deal.</CardDescription>
          </div>
          <Dialog open={dealOpen} onOpenChange={setDealOpen}>
            <DialogTrigger asChild><Button size="sm"><Plus className="mr-2 h-4 w-4" />Add deal</Button></DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add a brand deal</DialogTitle>
                <DialogDescription>Log an offer you have received.</DialogDescription>
              </DialogHeader>
              <form onSubmit={createDeal} className="space-y-4">
                <div><Label htmlFor="brand">Brand</Label>
                  <Input id="brand" required value={dealForm.brand_name}
                    onChange={(e) => setDealForm({ ...dealForm, brand_name: e.target.value })} /></div>
                <div><Label htmlFor="deal_title">Deal</Label>
                  <Input id="deal_title" required value={dealForm.title}
                    onChange={(e) => setDealForm({ ...dealForm, title: e.target.value })} /></div>
                <div><Label htmlFor="amount">Agreed amount (USD)</Label>
                  <Input id="amount" type="number" min="0" step="0.01" required value={dealForm.amount}
                    onChange={(e) => setDealForm({ ...dealForm, amount: e.target.value })} /></div>
                <div><Label htmlFor="notes">Notes</Label>
                  <Textarea id="notes" value={dealForm.notes}
                    onChange={(e) => setDealForm({ ...dealForm, notes: e.target.value })} /></div>
                <Button type="submit" className="w-full" disabled={saving}>Add to pipeline</Button>
              </form>
            </DialogContent>
          </Dialog>
        </CardHeader>
        <CardContent>
          {deals.length === 0 ? (
            <div className="py-8 text-center text-muted-foreground">
              <Briefcase className="h-8 w-8 mx-auto mb-2" />
              No deals yet.
            </div>
          ) : (
            <div className="space-y-3">
              {deals.map((deal) => (
                <div key={deal.id} className="flex flex-wrap items-center justify-between gap-3 p-4 border rounded-lg">
                  <div>
                    <p className="font-medium">{deal.title}</p>
                    <p className="text-sm text-muted-foreground">{deal.brand_name}</p>
                    <p className="text-xs text-muted-foreground">
                      Gross {money(Number(deal.amount))} · fee {money(Number(deal.platform_fee))} · net {money(Number(deal.net_amount))}
                    </p>
                  </div>
                  <Select value={deal.status} onValueChange={(v) => updateStatus(deal, v)}>
                    <SelectTrigger className="w-48"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {STATUSES.map((s) => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex-row items-center justify-between space-y-0">
          <div>
            <CardTitle className="text-lg">Campaign marketplace</CardTitle>
            <CardDescription>Open briefs from brands. Apply with one click.</CardDescription>
          </div>
          <Dialog open={campaignOpen} onOpenChange={setCampaignOpen}>
            <DialogTrigger asChild>
              <Button size="sm" variant="outline"><Megaphone className="mr-2 h-4 w-4" />Post a campaign</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Post a campaign</DialogTitle>
                <DialogDescription>Creators will see this brief and can apply.</DialogDescription>
              </DialogHeader>
              <form onSubmit={createCampaign} className="space-y-4">
                <div><Label htmlFor="c_brand">Brand name</Label>
                  <Input id="c_brand" required value={campaignForm.brand_name}
                    onChange={(e) => setCampaignForm({ ...campaignForm, brand_name: e.target.value })} /></div>
                <div><Label htmlFor="c_title">Campaign title</Label>
                  <Input id="c_title" required value={campaignForm.title}
                    onChange={(e) => setCampaignForm({ ...campaignForm, title: e.target.value })} /></div>
                <div><Label htmlFor="c_desc">Brief</Label>
                  <Textarea id="c_desc" value={campaignForm.description}
                    onChange={(e) => setCampaignForm({ ...campaignForm, description: e.target.value })} /></div>
                <div className="grid grid-cols-2 gap-3">
                  <div><Label htmlFor="c_niche">Niche</Label>
                    <Input id="c_niche" value={campaignForm.niche}
                      onChange={(e) => setCampaignForm({ ...campaignForm, niche: e.target.value })} /></div>
                  <div><Label htmlFor="c_budget">Budget (USD)</Label>
                    <Input id="c_budget" type="number" min="0" step="1" value={campaignForm.budget}
                      onChange={(e) => setCampaignForm({ ...campaignForm, budget: e.target.value })} /></div>
                </div>
                <div><Label htmlFor="c_min">Minimum followers</Label>
                  <Input id="c_min" type="number" min="0" value={campaignForm.min_followers}
                    onChange={(e) => setCampaignForm({ ...campaignForm, min_followers: e.target.value })} /></div>
                <Button type="submit" className="w-full" disabled={saving}>Post campaign</Button>
              </form>
            </DialogContent>
          </Dialog>
        </CardHeader>
        <CardContent>
          {campaigns.length === 0 ? (
            <p className="py-8 text-center text-muted-foreground">No open campaigns right now.</p>
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              {campaigns.map((c) => (
                <Card key={c.id}>
                  <CardHeader>
                    <div className="flex justify-between items-start gap-2">
                      <div>
                        <CardTitle className="text-base">{c.title}</CardTitle>
                        <CardDescription>{c.brand_name}{c.niche ? ` · ${c.niche}` : ""}</CardDescription>
                      </div>
                      <Badge variant="outline">{c.budget ? money(Number(c.budget)) : "Open budget"}</Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {c.description && <p className="text-sm text-muted-foreground">{c.description}</p>}
                    {c.min_followers > 0 && (
                      <p className="text-xs text-muted-foreground">Minimum {c.min_followers} followers</p>
                    )}
                    {c.brand_user_id === userId ? (
                      <Badge variant="outline">Your campaign</Badge>
                    ) : (
                      <Button size="sm" variant="outline" disabled={appliedIds.has(c.id)} onClick={() => apply(c)}>
                        {appliedIds.has(c.id) ? "Applied" : "Apply"}
                      </Button>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default BrandDealsTab;
