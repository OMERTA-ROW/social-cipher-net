import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import AppShell from "@/components/layout/AppShell";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Store, StoreProduct, fetchStore, fetchStorefront } from "@/lib/commerce";
import { useCart } from "@/hooks/useCart";

const StorePage = () => {
  const { slug } = useParams<{ slug: string }>();
  const [store, setStore] = useState<Store | null>(null);
  const [products, setProducts] = useState<StoreProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const { add } = useCart();

  useEffect(() => {
    if (!slug) return;
    let alive = true;
    setLoading(true);
    fetchStore(slug)
      .then(async (s) => {
        if (!alive) return;
        setStore(s);
        if (s) setProducts(await fetchStorefront({ sellerId: s.user_id }).catch(() => []));
      })
      .finally(() => alive && setLoading(false));
    return () => {
      alive = false;
    };
  }, [slug]);

  if (loading) {
    return (
      <AppShell>
        <Skeleton className="h-48 w-full rounded-lg" />
      </AppShell>
    );
  }

  if (!store) {
    return (
      <AppShell>
        <Card className="p-6 text-sm text-muted-foreground">This store does not exist.</Card>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <Card className="overflow-hidden">
        <div className="h-40 bg-gradient-to-r from-primary/25 via-background to-accent/20">
          {store.banner_url && (
            <img src={store.banner_url} alt="" className="w-full h-full object-cover" />
          )}
        </div>
        <div className="p-5 flex items-center gap-4">
          {store.logo_url && (
            <img
              src={store.logo_url}
              alt={store.business_name}
              className="w-16 h-16 rounded-lg object-cover border border-border -mt-12 bg-background"
            />
          )}
          <div>
            <h1 className="text-2xl font-bold">{store.business_name}</h1>
            {store.tagline && <p className="text-sm text-muted-foreground">{store.tagline}</p>}
          </div>
        </div>
      </Card>

      {store.business_description && (
        <p className="mt-4 text-sm text-muted-foreground whitespace-pre-wrap">
          {store.business_description}
        </p>
      )}

      <div className="mt-6 grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4">
        {products.length === 0 ? (
          <Card className="col-span-full p-6 text-sm text-muted-foreground">
            This store has no live products yet.
          </Card>
        ) : (
          products.map((product) => (
            <Card key={product.id} className="overflow-hidden">
              <Link to={`/product/${product.id}`}>
                <div className="aspect-square bg-secondary/40">
                  {product.images[0] && (
                    <img
                      src={product.images[0]}
                      alt={product.title}
                      loading="lazy"
                      className="w-full h-full object-cover"
                    />
                  )}
                </div>
              </Link>
              <div className="p-3 space-y-2">
                <Link to={`/product/${product.id}`} className="block text-sm truncate hover:text-primary">
                  {product.title}
                </Link>
                <div className="text-primary font-semibold">${product.price.toFixed(2)}</div>
                {product.variants.length > 0 ? (
                  <Button size="sm" variant="outline" className="w-full" asChild>
                    <Link to={`/product/${product.id}`}>Choose options</Link>
                  </Button>
                ) : (
                  <Button size="sm" className="w-full" onClick={() => add(product.id, null, 1)}>
                    Add to cart
                  </Button>
                )}
              </div>
            </Card>
          ))
        )}
      </div>
    </AppShell>
  );
};

export default StorePage;
