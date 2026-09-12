import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { slugify } from "@/lib/social";
import { toast } from "sonner";
import { ExternalLink } from "lucide-react";

interface Props {
  sellerProfile: any;
  onSaved?: () => void;
}

/** Storefront branding: the public face of a seller's store page. */
const StoreSettingsCard = ({ sellerProfile, onSaved }: Props) => {
  const [form, setForm] = useState({
    slug: "",
    tagline: "",
    banner_url: "",
    logo_url: "",
    business_description: "",
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setForm({
      slug: sellerProfile?.slug ?? "",
      tagline: sellerProfile?.tagline ?? "",
      banner_url: sellerProfile?.banner_url ?? "",
      logo_url: sellerProfile?.logo_url ?? "",
      business_description: sellerProfile?.business_description ?? "",
    });
  }, [sellerProfile]);

  const save = async () => {
    setSaving(true);
    const slug = form.slug ? slugify(form.slug) : null;
    const { error } = await supabase
      .from("seller_profiles")
      .update({
        slug,
        tagline: form.tagline || null,
        banner_url: form.banner_url || null,
        logo_url: form.logo_url || null,
        business_description: form.business_description || null,
      })
      .eq("id", sellerProfile.id);
    setSaving(false);
    if (error) {
      toast.error(
        error.message.includes("duplicate")
          ? "That store address is already taken"
          : "Could not save your store",
      );
      return;
    }
    toast.success("Store updated");
    onSaved?.();
  };

  return (
    <Card className="p-6 space-y-4">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-lg font-semibold">Storefront</h2>
        <Button variant="outline" size="sm" asChild>
          <Link to={`/store/${sellerProfile?.slug ?? sellerProfile?.id}`}>
            <ExternalLink className="w-4 h-4 mr-2" />
            View store
          </Link>
        </Button>
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        <div className="space-y-1">
          <Label htmlFor="s-slug">Store address</Label>
          <Input
            id="s-slug"
            value={form.slug}
            placeholder="my-store"
            onChange={(e) => setForm({ ...form, slug: e.target.value })}
          />
        </div>
        <div className="space-y-1">
          <Label htmlFor="s-tagline">Tagline</Label>
          <Input
            id="s-tagline"
            value={form.tagline}
            onChange={(e) => setForm({ ...form, tagline: e.target.value })}
          />
        </div>
        <div className="space-y-1">
          <Label htmlFor="s-logo">Logo image link</Label>
          <Input
            id="s-logo"
            value={form.logo_url}
            placeholder="https://..."
            onChange={(e) => setForm({ ...form, logo_url: e.target.value })}
          />
        </div>
        <div className="space-y-1">
          <Label htmlFor="s-banner">Banner image link</Label>
          <Input
            id="s-banner"
            value={form.banner_url}
            placeholder="https://..."
            onChange={(e) => setForm({ ...form, banner_url: e.target.value })}
          />
        </div>
      </div>

      <div className="space-y-1">
        <Label htmlFor="s-about">About your store</Label>
        <Textarea
          id="s-about"
          rows={3}
          value={form.business_description}
          onChange={(e) => setForm({ ...form, business_description: e.target.value })}
        />
      </div>

      <Button onClick={save} disabled={saving}>
        {saving ? "Saving..." : "Save store"}
      </Button>
    </Card>
  );
};

export default StoreSettingsCard;
