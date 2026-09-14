import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import Navigation from "@/components/Navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { Loader2, Plus } from "lucide-react";
import { money } from "@/hooks/usePlatformFees";
import { signInPath } from "@/lib/authRedirect";

const PLACEMENTS = ["feed", "discovery", "shop", "market", "stream", "theater"];

interface CampaignRow {
  id: string;
  name: string;
  placements: string[];
  interests: string[];
  min_audience: number;
  budget_cents: number;
  spent_cents: number;
  cpc_cents: number;
  cpm_cents: number;
  status: string;
}

/** Self-serve advertiser portal: account, campaigns, creative and live spend. */
const Advertise = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [advertiser, setAdvertiser] = useState<any>(null);
  const [campaigns, setCampaigns] = useState<CampaignRow[]>([]);
  const [stats, setStats] = useState<Record<string, { impressions: number; clicks: number }>>({});
  const [campaignOpen, setCampaignOpen] = useState(false);
  const [creativeFor, setCreativeFor] = useState<string | null>(null);

  const [signup, setSignup] = useState({ company_name: "", contact_email: "", website: "" });
  const [campaignForm, setCampaignForm] = useState({
    name: "", placements: ["feed"], interests: "", min_audience: "0",
    budget: "", cpc: "0.25", cpm: "5",
  });
  const [creativeForm, setCreativeForm] = useState({ headline: "", body: "", image_url: "", cta_label: "Learn more", cta_url: "" });

  const load = useCallback(async () => {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { navigate(signInPath()); return; }

    const { data: adv } = await supabase.from("ad_advertisers").select("*").eq("user_id", user.id).maybeSingle();
    setAdvertiser(adv);
    if (adv) {
      const { data: camps } = await supabase
        .from("ad_campaigns").select("*").eq("advertiser_id", adv.id).order("created_at", { ascending: false });
      setCampaigns((camps ?? []) as CampaignRow[]);

      const ids = (camps ?? []).map((c: any) => c.id);
      if (ids.length) {
        const [imp, clk] = await Promise.all([
          supabase.from("ad_impressions").select("campaign_id").in("campaign_id", ids),
          supabase.from("ad_clicks").select("campaign_id").in("campaign_id", ids),
        ]);
        const next: Record<string, { impressions: number; clicks: number }> = {};
        ids.forEach((id: string) => { next[id] = { impressions: 0, clicks: 0 }; });
        (imp.data ?? []).forEach((r: any) => { next[r.campaign_id].impressions += 1; });
        (clk.data ?? []).forEach((r: any) => { next[r.campaign_id].clicks += 1; });
        setStats(next);
      }
    }
    setLoading(false);
  }, [navigate]);

  useEffect(() => { load(); }, [load]);

  const createAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { error } = await supabase.from("ad_advertisers").insert({ user_id: user.id, ...signup });
    setSaving(false);
    if (error) { toast.error(error.message); return; }
    toast.success("Advertiser account created");
    load();
  };

  const createCampaign = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    const { error } = await supabase.from("ad_campaigns").insert({
      advertiser_id: advertiser.id,
      name: campaignForm.name,
      placements: campaignForm.placements,
      interests: campaignForm.interests.split(",").map((i) => i.trim()).filter(Boolean),
      min_audience: Number(campaignForm.min_audience || 0),
      budget_cents: Math.round(Number(campaignForm.budget || 0) * 100),
      cpc_cents: Math.round(Number(campaignForm.cpc || 0) * 100),
      cpm_cents: Math.round(Number(campaignForm.cpm || 0) * 100),
      status: "draft",
    });
    setSaving(false);
    if (error) { toast.error(error.message); return; }
    toast.success("Campaign created as a draft");
    setCampaignOpen(false);
    load();
  };

  const addCreative = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!creativeFor) return;
    setSaving(true);
    const { error } = await supabase.from("ad_creatives").insert({
      campaign_id: creativeFor,
      headline: creativeForm.headline,
      body: creativeForm.body || null,
      image_url: creativeForm.image_url || null,
      cta_label: creativeForm.cta_label,
      cta_url: creativeForm.cta_url,
    });
    setSaving(false);
    if (error) { toast.error(error.message); return; }
    toast.success("Creative added");
    setCreativeForm({ headline: "", body: "", image_url: "", cta_label: "Learn more", cta_url: "" });
    setCreativeFor(null);
  };

  const setStatus = async (campaign: CampaignRow, status: string) => {
    const { error } = await supabase.from("ad_campaigns").update({ status }).eq("id", campaign.id);
    if (error) { toast.error(error.message); return; }
    load();
  };

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center"><Loader2 className="h-6 w-6 animate-spin" /></div>;
  }

  return (
    <div className="min-h-screen bg-transparent">
      <Navigation />
      <div className="container mx-auto px-4 py-8 space-y-6">
        <div>
          <h1 className="text-4xl font-bold mb-2">Advertise on Cyber Link</h1>
          <p className="text-muted-foreground">
            Native placements in the feed, Discovery, Shop, Market, live streams and the movie theater.
          </p>
        </div>

        {!advertiser ? (
          <Card className="max-w-xl">
            <CardHeader>
              <CardTitle>Create your advertiser account</CardTitle>
              <CardDescription>One account holds all of your campaigns.</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={createAccount} className="space-y-4">
                <div><Label htmlFor="company">Company</Label>
                  <Input id="company" required value={signup.company_name}
                    onChange={(e) => setSignup({ ...signup, company_name: e.target.value })} /></div>
                <div><Label htmlFor="email">Contact email</Label>
                  <Input id="email" type="email" value={signup.contact_email}
                    onChange={(e) => setSignup({ ...signup, contact_email: e.target.value })} /></div>
                <div><Label htmlFor="website">Website</Label>
                  <Input id="website" type="url" value={signup.website}
                    onChange={(e) => setSignup({ ...signup, website: e.target.value })} /></div>
                <Button type="submit" disabled={saving} className="w-full">Create account</Button>
              </form>
            </CardContent>
          </Card>
        ) : (
          <>
            <div className="flex justify-between items-center">
              <h2 className="text-2xl font-semibold">{advertiser.company_name}</h2>
              <Dialog open={campaignOpen} onOpenChange={setCampaignOpen}>
                <DialogTrigger asChild><Button><Plus className="mr-2 h-4 w-4" />New campaign</Button></DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>New campaign</DialogTitle>
                    <DialogDescription>Set placements, targeting, budget and rates.</DialogDescription>
                  </DialogHeader>
                  <form onSubmit={createCampaign} className="space-y-4">
                    <div><Label htmlFor="c_name">Campaign name</Label>
                      <Input id="c_name" required value={campaignForm.name}
                        onChange={(e) => setCampaignForm({ ...campaignForm, name: e.target.value })} /></div>
                    <div>
                      <Label>Placements</Label>
                      <div className="grid grid-cols-3 gap-2 mt-2">
                        {PLACEMENTS.map((p) => (
                          <label key={p} className="flex items-center gap-2 text-sm capitalize">
                            <Checkbox
                              checked={campaignForm.placements.includes(p)}
                              onCheckedChange={(checked) =>
                                setCampaignForm({
                                  ...campaignForm,
                                  placements: checked
                                    ? [...campaignForm.placements, p]
                                    : campaignForm.placements.filter((x) => x !== p),
                                })
                              }
                            />
                            {p}
                          </label>
                        ))}
                      </div>
                    </div>
                    <div><Label htmlFor="c_int">Interests (comma separated)</Label>
                      <Input id="c_int" value={campaignForm.interests}
                        onChange={(e) => setCampaignForm({ ...campaignForm, interests: e.target.value })} /></div>
                    <div className="grid grid-cols-3 gap-3">
                      <div><Label htmlFor="c_budget">Budget $</Label>
                        <Input id="c_budget" type="number" min="1" step="1" required value={campaignForm.budget}
                          onChange={(e) => setCampaignForm({ ...campaignForm, budget: e.target.value })} /></div>
                      <div><Label htmlFor="c_cpc">CPC $</Label>
                        <Input id="c_cpc" type="number" min="0" step="0.01" value={campaignForm.cpc}
                          onChange={(e) => setCampaignForm({ ...campaignForm, cpc: e.target.value })} /></div>
                      <div><Label htmlFor="c_cpm">CPM $</Label>
                        <Input id="c_cpm" type="number" min="0" step="0.01" value={campaignForm.cpm}
                          onChange={(e) => setCampaignForm({ ...campaignForm, cpm: e.target.value })} /></div>
                    </div>
                    <div><Label htmlFor="c_aud">Minimum audience size</Label>
                      <Input id="c_aud" type="number" min="0" value={campaignForm.min_audience}
                        onChange={(e) => setCampaignForm({ ...campaignForm, min_audience: e.target.value })} /></div>
                    <Button type="submit" className="w-full" disabled={saving}>Create campaign</Button>
                  </form>
                </DialogContent>
              </Dialog>
            </div>

            {campaigns.length === 0 ? (
              <Card><CardContent className="py-12 text-center text-muted-foreground">
                No campaigns yet. Create one to get started.
              </CardContent></Card>
            ) : (
              <div className="grid gap-4 md:grid-cols-2">
                {campaigns.map((c) => {
                  const s = stats[c.id] ?? { impressions: 0, clicks: 0 };
                  return (
                    <Card key={c.id}>
                      <CardHeader>
                        <div className="flex justify-between items-start gap-2">
                          <div>
                            <CardTitle className="text-lg">{c.name}</CardTitle>
                            <CardDescription className="capitalize">{c.placements.join(", ")}</CardDescription>
                          </div>
                          <Badge variant="outline" className="capitalize">{c.status}</Badge>
                        </div>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        <div className="grid grid-cols-4 gap-2 text-center text-sm">
                          <div><div className="font-bold">{s.impressions}</div><div className="text-xs text-muted-foreground">Impr.</div></div>
                          <div><div className="font-bold">{s.clicks}</div><div className="text-xs text-muted-foreground">Clicks</div></div>
                          <div><div className="font-bold">{money(c.spent_cents / 100)}</div><div className="text-xs text-muted-foreground">Spent</div></div>
                          <div><div className="font-bold">{money(c.budget_cents / 100)}</div><div className="text-xs text-muted-foreground">Budget</div></div>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          <Dialog open={creativeFor === c.id} onOpenChange={(open) => setCreativeFor(open ? c.id : null)}>
                            <DialogTrigger asChild><Button size="sm" variant="outline">Add creative</Button></DialogTrigger>
                            <DialogContent>
                              <DialogHeader>
                                <DialogTitle>Add creative</DialogTitle>
                                <DialogDescription>It renders as a labelled Sponsored post.</DialogDescription>
                              </DialogHeader>
                              <form onSubmit={addCreative} className="space-y-4">
                                <div><Label htmlFor="cr_head">Headline</Label>
                                  <Input id="cr_head" required value={creativeForm.headline}
                                    onChange={(e) => setCreativeForm({ ...creativeForm, headline: e.target.value })} /></div>
                                <div><Label htmlFor="cr_body">Body</Label>
                                  <Textarea id="cr_body" value={creativeForm.body}
                                    onChange={(e) => setCreativeForm({ ...creativeForm, body: e.target.value })} /></div>
                                <div><Label htmlFor="cr_img">Image URL</Label>
                                  <Input id="cr_img" type="url" value={creativeForm.image_url}
                                    onChange={(e) => setCreativeForm({ ...creativeForm, image_url: e.target.value })} /></div>
                                <div className="grid grid-cols-2 gap-3">
                                  <div><Label htmlFor="cr_cta">Button label</Label>
                                    <Input id="cr_cta" value={creativeForm.cta_label}
                                      onChange={(e) => setCreativeForm({ ...creativeForm, cta_label: e.target.value })} /></div>
                                  <div><Label htmlFor="cr_url">Destination URL</Label>
                                    <Input id="cr_url" type="url" required value={creativeForm.cta_url}
                                      onChange={(e) => setCreativeForm({ ...creativeForm, cta_url: e.target.value })} /></div>
                                </div>
                                <Button type="submit" className="w-full" disabled={saving}>Save creative</Button>
                              </form>
                            </DialogContent>
                          </Dialog>
                          {c.status !== "running" ? (
                            <Button size="sm" onClick={() => setStatus(c, "running")}>Start</Button>
                          ) : (
                            <Button size="sm" variant="outline" onClick={() => setStatus(c, "paused")}>Pause</Button>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default Advertise;
