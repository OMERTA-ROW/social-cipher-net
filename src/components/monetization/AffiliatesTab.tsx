import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Card, CardContent, CardDescription, CardHeader, CardTitle,
} from "@/components/ui/card";
import {
  Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { Copy, Link2, Loader2, Plus, Trash2, PlugZap } from "lucide-react";
import { usePlatformFees, feePercentOf, money } from "@/hooks/usePlatformFees";

interface AffiliateLink {
  id: string;
  link_name: string;
  affiliate_url: string;
  merchant_name: string;
  link_type: string;
  description: string | null;
  click_count: number;
  conversion_count: number;
  earnings: number;
  short_code: string | null;
  post_id: string | null;
  is_active: boolean;
}

interface NetworkRow {
  id: string;
  network: string;
  account_label: string | null;
  status: string;
  last_synced_at: string | null;
}

const NETWORKS = ["Amazon Associates", "ShareASale", "Impact", "CJ Affiliate", "Rakuten", "Awin"];

const shortCode = () =>
  Array.from(crypto.getRandomValues(new Uint8Array(5)))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");

/**
 * Affiliates: trackable branded links, their real click/conversion analytics,
 * and connections to external affiliate networks.
 */
const AffiliatesTab = () => {
  const [links, setLinks] = useState<AffiliateLink[]>([]);
  const [networks, setNetworks] = useState<NetworkRow[]>([]);
  const [posts, setPosts] = useState<Array<{ id: string; content: string }>>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [linkOpen, setLinkOpen] = useState(false);
  const [networkOpen, setNetworkOpen] = useState(false);
  const { data: rates } = usePlatformFees();
  const feePercent = feePercentOf(rates, "affiliate_conversions");

  const [form, setForm] = useState({
    link_name: "",
    merchant_name: "",
    link_type: "affiliate",
    affiliate_url: "",
    description: "",
    post_id: "none",
  });
  const [networkForm, setNetworkForm] = useState({ network: NETWORKS[0], accountLabel: "", apiKey: "" });

  const load = useCallback(async () => {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setLoading(false); return; }

    const [linkRes, netRes, postRes] = await Promise.all([
      supabase
        .from("external_affiliate_links")
        .select("id, link_name, affiliate_url, merchant_name, link_type, description, click_count, conversion_count, earnings, short_code, post_id, is_active")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false }),
      supabase
        .from("affiliate_networks")
        .select("id, network, account_label, status, last_synced_at")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false }),
      supabase
        .from("posts")
        .select("id, content")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(25),
    ]);

    setLinks((linkRes.data ?? []) as AffiliateLink[]);
    setNetworks((netRes.data ?? []) as NetworkRow[]);
    setPosts((postRes.data ?? []).map((p: any) => ({ id: p.id, content: p.content ?? "" })));
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const createLink = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { toast.error("Sign in to create links"); setSaving(false); return; }

    const { error } = await supabase.from("external_affiliate_links").insert({
      user_id: user.id,
      link_name: form.link_name,
      merchant_name: form.merchant_name,
      link_type: form.link_type,
      affiliate_url: form.affiliate_url,
      description: form.description || null,
      post_id: form.post_id === "none" ? null : form.post_id,
      short_code: shortCode(),
    });
    setSaving(false);
    if (error) { toast.error(error.message); return; }
    toast.success("Affiliate link created");
    setForm({ link_name: "", merchant_name: "", link_type: "affiliate", affiliate_url: "", description: "", post_id: "none" });
    setLinkOpen(false);
    load();
  };

  const connectNetwork = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    const { data, error } = await supabase.functions.invoke("affiliate-network-connect", {
      body: networkForm,
    });
    setSaving(false);
    if (error || data?.error) { toast.error(data?.error || error?.message || "Could not connect"); return; }
    toast.success(`${networkForm.network} connected`);
    setNetworkForm({ network: NETWORKS[0], accountLabel: "", apiKey: "" });
    setNetworkOpen(false);
    load();
  };

  const removeLink = async (id: string) => {
    const { error } = await supabase.from("external_affiliate_links").delete().eq("id", id);
    if (error) { toast.error(error.message); return; }
    toast.success("Link removed");
    load();
  };

  const copyShort = (link: AffiliateLink) => {
    if (!link.short_code) return;
    navigator.clipboard.writeText(`${window.location.origin}/r/${link.short_code}`);
    toast.success("Branded link copied");
  };

  const totals = links.reduce(
    (acc, l) => ({
      clicks: acc.clicks + (l.click_count ?? 0),
      conversions: acc.conversions + (l.conversion_count ?? 0),
      earnings: acc.earnings + Number(l.earnings ?? 0),
    }),
    { clicks: 0, conversions: 0, earnings: 0 },
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap gap-3 justify-between items-start">
        <div>
          <h2 className="text-2xl font-bold">Affiliates</h2>
          <p className="text-muted-foreground">
            Branded trackable links, real click and conversion analytics, and external network commissions.
          </p>
        </div>
        <div className="flex gap-2">
          <Dialog open={networkOpen} onOpenChange={setNetworkOpen}>
            <DialogTrigger asChild>
              <Button variant="outline"><PlugZap className="mr-2 h-4 w-4" />Connect network</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Connect an affiliate network</DialogTitle>
                <DialogDescription>
                  Your API key is encrypted on the server and never shown again.
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={connectNetwork} className="space-y-4">
                <div>
                  <Label>Network</Label>
                  <Select value={networkForm.network} onValueChange={(v) => setNetworkForm({ ...networkForm, network: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {NETWORKS.map((n) => <SelectItem key={n} value={n}>{n}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="account_label">Account label</Label>
                  <Input id="account_label" value={networkForm.accountLabel}
                    onChange={(e) => setNetworkForm({ ...networkForm, accountLabel: e.target.value })}
                    placeholder="Publisher or tracking ID" />
                </div>
                <div>
                  <Label htmlFor="api_key">API key</Label>
                  <Input id="api_key" type="password" required value={networkForm.apiKey}
                    onChange={(e) => setNetworkForm({ ...networkForm, apiKey: e.target.value })} />
                </div>
                <Button type="submit" className="w-full" disabled={saving}>
                  {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Connect"}
                </Button>
              </form>
            </DialogContent>
          </Dialog>

          <Dialog open={linkOpen} onOpenChange={setLinkOpen}>
            <DialogTrigger asChild>
              <Button><Plus className="mr-2 h-4 w-4" />New link</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create an affiliate link</DialogTitle>
                <DialogDescription>
                  Any product, post or external URL. You get a branded short link to share.
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={createLink} className="space-y-4">
                <div>
                  <Label htmlFor="link_name">Name</Label>
                  <Input id="link_name" required value={form.link_name}
                    onChange={(e) => setForm({ ...form, link_name: e.target.value })} />
                </div>
                <div>
                  <Label htmlFor="merchant">Merchant</Label>
                  <Input id="merchant" required value={form.merchant_name}
                    onChange={(e) => setForm({ ...form, merchant_name: e.target.value })}
                    placeholder="Amazon, Walmart, your own store..." />
                </div>
                <div>
                  <Label>Type</Label>
                  <Select value={form.link_type} onValueChange={(v) => setForm({ ...form, link_type: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="affiliate">Affiliate link</SelectItem>
                      <SelectItem value="branded_deal">Branded deal</SelectItem>
                      <SelectItem value="conversion_tracking">Conversion tracking</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="url">Destination URL</Label>
                  <Input id="url" type="url" required value={form.affiliate_url}
                    onChange={(e) => setForm({ ...form, affiliate_url: e.target.value })} placeholder="https://..." />
                </div>
                <div>
                  <Label>Attach to a post (optional)</Label>
                  <Select value={form.post_id} onValueChange={(v) => setForm({ ...form, post_id: v })}>
                    <SelectTrigger><SelectValue placeholder="No post" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">No post</SelectItem>
                      {posts.map((p) => (
                        <SelectItem key={p.id} value={p.id}>
                          {(p.content || "Untitled post").slice(0, 48)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="desc">Notes (optional)</Label>
                  <Textarea id="desc" value={form.description}
                    onChange={(e) => setForm({ ...form, description: e.target.value })} />
                </div>
                <Button type="submit" className="w-full" disabled={saving}>
                  {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Create link"}
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm font-medium">Clicks</CardTitle></CardHeader>
          <CardContent><div className="text-2xl font-bold">{totals.clicks}</div></CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm font-medium">Conversions</CardTitle></CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totals.conversions}</div>
            <p className="text-xs text-muted-foreground">
              {totals.clicks > 0 ? `${((totals.conversions / totals.clicks) * 100).toFixed(1)}% conversion rate` : "No clicks yet"}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm font-medium">Net earnings</CardTitle></CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{money(totals.earnings)}</div>
            <p className="text-xs text-muted-foreground">After the {feePercent}% platform fee</p>
          </CardContent>
        </Card>
      </div>

      {networks.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Connected networks</CardTitle>
            <CardDescription>External commissions report into these totals.</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-2">
            {networks.map((n) => (
              <Badge key={n.id} variant="outline">
                {n.network}{n.account_label ? ` · ${n.account_label}` : ""}
              </Badge>
            ))}
          </CardContent>
        </Card>
      )}

      {loading ? (
        <div className="flex justify-center py-10"><Loader2 className="h-6 w-6 animate-spin" /></div>
      ) : links.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <Link2 className="h-10 w-10 text-muted-foreground mb-3" />
            <h3 className="font-semibold mb-1">No affiliate links yet</h3>
            <p className="text-muted-foreground">Create your first link to start tracking clicks and commissions.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {links.map((link) => {
            const rate = link.click_count ? (link.conversion_count / link.click_count) * 100 : 0;
            return (
              <Card key={link.id}>
                <CardHeader>
                  <div className="flex justify-between items-start gap-2">
                    <div>
                      <CardTitle className="text-lg">{link.link_name}</CardTitle>
                      <CardDescription>
                        {link.merchant_name} · {link.link_type.replace(/_/g, " ")}
                        {link.post_id ? " · attached to a post" : ""}
                      </CardDescription>
                    </div>
                    <Button variant="ghost" size="icon" onClick={() => removeLink(link.id)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  {link.description && <p className="text-sm text-muted-foreground">{link.description}</p>}
                  <div className="grid grid-cols-4 gap-2 text-center text-sm">
                    <div><div className="font-bold">{link.click_count}</div><div className="text-xs text-muted-foreground">Clicks</div></div>
                    <div><div className="font-bold">{link.conversion_count}</div><div className="text-xs text-muted-foreground">Conv.</div></div>
                    <div><div className="font-bold">{rate.toFixed(1)}%</div><div className="text-xs text-muted-foreground">Rate</div></div>
                    <div><div className="font-bold">{money(Number(link.earnings ?? 0))}</div><div className="text-xs text-muted-foreground">Earned</div></div>
                  </div>
                  <Button variant="outline" size="sm" className="w-full" onClick={() => copyShort(link)}>
                    <Copy className="mr-2 h-4 w-4" />
                    Copy branded link
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default AffiliatesTab;
