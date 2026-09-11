import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { supabase } from "@/integrations/supabase/client";
import { Globe, Gamepad2, Clapperboard, Store } from "lucide-react";

interface ShopProduct {
  id: string;
  title: string;
  description: string | null;
  price: number;
  image_url: string | null;
  category: string | null;
}

const SECTIONS = [
  { label: "Cyber World", path: "/cyber-world", icon: Globe },
  { label: "Cyber Arena", path: "/cyber-arena", icon: Gamepad2 },
  { label: "Studio", path: "/studio", icon: Clapperboard },
];

const FeedShopTab = () => {
  const navigate = useNavigate();
  const [products, setProducts] = useState<ShopProduct[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    (async () => {
      const { data } = await supabase
        .from("products")
        .select("id, title, description, price, image_url, category")
        .eq("status", "active")
        .order("created_at", { ascending: false })
        .limit(24);
      if (!active) return;
      setProducts((data as ShopProduct[]) || []);
      setLoading(false);
    })();
    return () => { active = false; };
  }, []);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        {SECTIONS.map(({ label, path, icon: Icon }) => (
          <Button key={path} size="sm" variant="outline" onClick={() => navigate(path)}>
            <Icon className="w-4 h-4 mr-2" />
            {label}
          </Button>
        ))}
        <Button size="sm" variant="outline" onClick={() => navigate("/affiliate")}>
          <Store className="w-4 h-4 mr-2" />
          All listings
        </Button>
      </div>

      {loading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[0, 1, 2].map((i) => <Skeleton key={i} className="h-48 w-full" />)}
        </div>
      ) : products.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground border border-dashed border-border rounded-lg">
          No listings available yet. Explore Cyber World, Cyber Arena or Studio to get started.
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {products.map((product) => (
            <Card
              key={product.id}
              className="cursor-pointer hover:border-primary/50 transition-colors overflow-hidden"
              onClick={() => navigate("/affiliate")}
            >
              {product.image_url && (
                <img
                  src={product.image_url}
                  alt={product.title}
                  loading="lazy"
                  className="w-full h-32 object-cover"
                />
              )}
              <CardContent className="p-4 space-y-1">
                <p className="font-semibold truncate">{product.title}</p>
                {product.description && (
                  <p className="text-sm text-muted-foreground line-clamp-2">{product.description}</p>
                )}
                <p className="text-primary font-semibold">${Number(product.price).toFixed(2)}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default FeedShopTab;
