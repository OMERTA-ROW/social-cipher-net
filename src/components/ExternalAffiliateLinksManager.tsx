import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { ExternalLink, Plus, Trash2 } from "lucide-react";

interface AffiliateLink {
  id: string;
  link_name: string;
  affiliate_url: string;
  merchant_name: string;
  link_type: string;
  description: string | null;
  click_count: number;
  is_active: boolean;
}

export const ExternalAffiliateLinksManager = () => {
  const [links, setLinks] = useState<AffiliateLink[]>([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const [formData, setFormData] = useState({
    link_name: "",
    affiliate_url: "",
    merchant_name: "",
    link_type: "affiliate",
    description: "",
  });

  useEffect(() => {
    fetchLinks();
  }, []);

  const fetchLinks = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data, error } = await supabase
      .from("external_affiliate_links")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    if (error) {
      toast({
        title: "Error",
        description: "Failed to load affiliate links",
        variant: "destructive",
      });
      return;
    }

    setLinks(data || []);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      toast({
        title: "Error",
        description: "You must be logged in",
        variant: "destructive",
      });
      setLoading(false);
      return;
    }

    const { error } = await supabase.from("external_affiliate_links").insert({
      user_id: user.id,
      ...formData,
    });

    if (error) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } else {
      toast({
        title: "Success",
        description: "Affiliate link added successfully",
      });
      setFormData({
        link_name: "",
        affiliate_url: "",
        merchant_name: "",
        link_type: "affiliate",
        description: "",
      });
      setIsDialogOpen(false);
      fetchLinks();
    }

    setLoading(false);
  };

  const handleDelete = async (id: string) => {
    const { error } = await supabase
      .from("external_affiliate_links")
      .delete()
      .eq("id", id);

    if (error) {
      toast({
        title: "Error",
        description: "Failed to delete link",
        variant: "destructive",
      });
    } else {
      toast({
        title: "Success",
        description: "Link deleted successfully",
      });
      fetchLinks();
    }
  };

  const handleCopyLink = (linkId: string) => {
    const trackingUrl = `${window.location.origin}/affiliate-redirect/${linkId}`;
    navigator.clipboard.writeText(trackingUrl);
    toast({
      title: "Copied!",
      description: "Tracking link copied to clipboard",
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">External Affiliate Links</h2>
          <p className="text-muted-foreground">
            Manage your Amazon, Walmart, luxury brand, and other affiliate links
          </p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Add Link
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add External Affiliate Link</DialogTitle>
              <DialogDescription>
                Add affiliate links from Amazon, Walmart, luxury brands, or any other merchant
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label htmlFor="link_name">Link Name</Label>
                <Input
                  id="link_name"
                  value={formData.link_name}
                  onChange={(e) =>
                    setFormData({ ...formData, link_name: e.target.value })
                  }
                  placeholder="e.g., Premium Watch Collection"
                  required
                />
              </div>

              <div>
                <Label htmlFor="merchant_name">Merchant</Label>
                <Input
                  id="merchant_name"
                  value={formData.merchant_name}
                  onChange={(e) =>
                    setFormData({ ...formData, merchant_name: e.target.value })
                  }
                  placeholder="e.g., Amazon, Walmart, Gucci, Louis Vuitton"
                  required
                />
              </div>

              <div>
                <Label htmlFor="link_type">Link Type</Label>
                <Select
                  value={formData.link_type}
                  onValueChange={(value) =>
                    setFormData({ ...formData, link_type: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="affiliate">Affiliate Link</SelectItem>
                    <SelectItem value="branded_deal">Branded Deal</SelectItem>
                    <SelectItem value="conversion_tracking">
                      Conversion Tracking
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="affiliate_url">Affiliate URL</Label>
                <Input
                  id="affiliate_url"
                  type="url"
                  value={formData.affiliate_url}
                  onChange={(e) =>
                    setFormData({ ...formData, affiliate_url: e.target.value })
                  }
                  placeholder="https://..."
                  required
                />
              </div>

              <div>
                <Label htmlFor="description">Description (Optional)</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) =>
                    setFormData({ ...formData, description: e.target.value })
                  }
                  placeholder="Add notes about this link..."
                />
              </div>

              <Button type="submit" disabled={loading} className="w-full">
                {loading ? "Adding..." : "Add Affiliate Link"}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {links.map((link) => (
          <Card key={link.id}>
            <CardHeader>
              <div className="flex justify-between items-start">
                <div>
                  <CardTitle className="text-lg">{link.link_name}</CardTitle>
                  <CardDescription>
                    {link.merchant_name} • {link.link_type.replace("_", " ")}
                  </CardDescription>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => handleDelete(link.id)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              {link.description && (
                <p className="text-sm text-muted-foreground">
                  {link.description}
                </p>
              )}
              <div className="flex items-center justify-between">
                <span className="text-sm">
                  Clicks: <span className="font-bold">{link.click_count}</span>
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleCopyLink(link.id)}
                >
                  <ExternalLink className="mr-2 h-4 w-4" />
                  Copy Tracking Link
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {links.length === 0 && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <ExternalLink className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">No affiliate links yet</h3>
            <p className="text-muted-foreground text-center mb-4">
              Start adding your Amazon, Walmart, luxury brand, and other affiliate links
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
};
