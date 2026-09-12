import { useCallback, useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Trash2 } from "lucide-react";

interface Props {
  productId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

/** Sizes, colours and other options plus their own price, stock and images. */
const ProductOptionsDialog = ({ productId, open, onOpenChange }: Props) => {
  const [variants, setVariants] = useState<any[]>([]);
  const [images, setImages] = useState<any[]>([]);
  const [variantForm, setVariantForm] = useState({ name: "", price: "", stock: "" });
  const [imageUrl, setImageUrl] = useState("");
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    if (!productId) return;
    const [{ data: v }, { data: i }] = await Promise.all([
      supabase
        .from("product_variants")
        .select("*")
        .eq("product_id", productId)
        .order("display_order", { ascending: true }),
      supabase
        .from("product_images")
        .select("*")
        .eq("product_id", productId)
        .order("display_order", { ascending: true }),
    ]);
    setVariants(v ?? []);
    setImages(i ?? []);
  }, [productId]);

  useEffect(() => {
    if (open) load();
  }, [load, open]);

  const addVariant = async () => {
    if (!productId || !variantForm.name.trim() || !variantForm.price) {
      toast.error("Give the option a name and a price");
      return;
    }
    setBusy(true);
    const { error } = await supabase.from("product_variants").insert({
      product_id: productId,
      name: variantForm.name.trim(),
      price: parseFloat(variantForm.price),
      stock_quantity: parseInt(variantForm.stock) || 0,
      display_order: variants.length,
    });
    setBusy(false);
    if (error) {
      toast.error("Could not add that option");
      return;
    }
    setVariantForm({ name: "", price: "", stock: "" });
    load();
  };

  const addImage = async () => {
    if (!productId || !imageUrl.trim()) return;
    setBusy(true);
    const { error } = await supabase.from("product_images").insert({
      product_id: productId,
      image_url: imageUrl.trim(),
      display_order: images.length,
    });
    setBusy(false);
    if (error) {
      toast.error("Could not add that image");
      return;
    }
    setImageUrl("");
    load();
  };

  const removeRow = async (table: "product_variants" | "product_images", id: string) => {
    await supabase.from(table).delete().eq("id", id);
    load();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Options and images</DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          <section className="space-y-3">
            <h3 className="text-sm font-semibold">Options (sizes, colours, editions)</h3>
            {variants.map((v) => (
              <div key={v.id} className="flex items-center gap-2 text-sm">
                <span className="flex-1 truncate">{v.name}</span>
                <span className="text-primary">${Number(v.price).toFixed(2)}</span>
                <span className="text-muted-foreground text-xs">{v.stock_quantity} in stock</span>
                <button
                  type="button"
                  onClick={() => removeRow("product_variants", v.id)}
                  aria-label="Remove option"
                  className="text-muted-foreground hover:text-destructive"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
            <div className="grid grid-cols-3 gap-2">
              <div className="space-y-1">
                <Label htmlFor="v-name" className="text-xs">Name</Label>
                <Input
                  id="v-name"
                  value={variantForm.name}
                  placeholder="Large / Black"
                  onChange={(e) => setVariantForm({ ...variantForm, name: e.target.value })}
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="v-price" className="text-xs">Price</Label>
                <Input
                  id="v-price"
                  type="number"
                  step="0.01"
                  value={variantForm.price}
                  onChange={(e) => setVariantForm({ ...variantForm, price: e.target.value })}
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="v-stock" className="text-xs">Stock</Label>
                <Input
                  id="v-stock"
                  type="number"
                  value={variantForm.stock}
                  onChange={(e) => setVariantForm({ ...variantForm, stock: e.target.value })}
                />
              </div>
            </div>
            <Button size="sm" onClick={addVariant} disabled={busy}>
              Add option
            </Button>
          </section>

          <section className="space-y-3">
            <h3 className="text-sm font-semibold">Extra images</h3>
            <div className="flex flex-wrap gap-2">
              {images.map((img) => (
                <div key={img.id} className="relative">
                  <img
                    src={img.image_url}
                    alt=""
                    loading="lazy"
                    className="w-16 h-16 object-cover rounded-md border border-border"
                  />
                  <button
                    type="button"
                    onClick={() => removeRow("product_images", img.id)}
                    aria-label="Remove image"
                    className="absolute -top-2 -right-2 bg-background border border-border rounded-full p-1 text-muted-foreground hover:text-destructive"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
              ))}
            </div>
            <div className="flex gap-2">
              <Input
                value={imageUrl}
                placeholder="https://..."
                onChange={(e) => setImageUrl(e.target.value)}
              />
              <Button size="sm" onClick={addImage} disabled={busy}>
                Add
              </Button>
            </div>
          </section>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ProductOptionsDialog;
