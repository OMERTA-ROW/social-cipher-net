import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import AppShell from "@/components/layout/AppShell";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import ProductBuyBox from "@/components/shop/ProductBuyBox";
import CommentsPanel from "@/components/comments/CommentsPanel";
import { Store, StoreProduct, fetchProduct, fetchStore } from "@/lib/commerce";

const ProductDetail = () => {
  const { productId } = useParams<{ productId: string }>();
  const [product, setProduct] = useState<StoreProduct | null>(null);
  const [store, setStore] = useState<Store | null>(null);
  const [loading, setLoading] = useState(true);
  const [active, setActive] = useState(0);

  useEffect(() => {
    if (!productId) return;
    let alive = true;
    setLoading(true);
    fetchProduct(productId)
      .then(async (p) => {
        if (!alive) return;
        setProduct(p);
        if (p) setStore(await fetchStore(p.seller_id).catch(() => null));
      })
      .finally(() => alive && setLoading(false));
    return () => {
      alive = false;
    };
  }, [productId]);

  if (loading) {
    return (
      <AppShell>
        <div className="grid md:grid-cols-2 gap-8">
          <Skeleton className="aspect-square w-full rounded-lg" />
          <div className="space-y-4">
            <Skeleton className="h-8 w-2/3" />
            <Skeleton className="h-24 w-full" />
          </div>
        </div>
      </AppShell>
    );
  }

  if (!product) {
    return (
      <AppShell>
        <Card className="p-6 text-sm text-muted-foreground">
          This product is no longer available.
        </Card>
      </AppShell>
    );
  }

  return (
    <AppShell title={product.title} description={store?.business_name ? `Sold by ${store.business_name}` : undefined}>
      <div className="grid md:grid-cols-2 gap-8">
        <div className="space-y-3">
          <div className="aspect-square rounded-lg overflow-hidden border border-border bg-secondary/40">
            {product.images[active] ? (
              <img
                src={product.images[active]}
                alt={product.title}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-muted-foreground text-sm">
                No image
              </div>
            )}
          </div>
          {product.images.length > 1 && (
            <div className="flex gap-2 overflow-x-auto">
              {product.images.map((src, i) => (
                <button
                  key={src + i}
                  type="button"
                  onClick={() => setActive(i)}
                  className={`w-16 h-16 shrink-0 rounded-md overflow-hidden border ${
                    i === active ? "border-primary" : "border-border"
                  }`}
                >
                  <img src={src} alt="" loading="lazy" className="w-full h-full object-cover" />
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="space-y-5">
          <div>
            {store && (
              <Link
                to={`/store/${store.slug ?? store.id}`}
                className="text-sm text-muted-foreground hover:text-primary"
              >
                {store.business_name}
              </Link>
            )}
            {product.category && (
              <Badge variant="secondary" className="mt-2">
                {product.category}
              </Badge>
            )}
          </div>

          <ProductBuyBox product={product} />

          {product.description && (
            <p className="text-sm text-muted-foreground whitespace-pre-wrap leading-relaxed">
              {product.description}
            </p>
          )}

          {product.shipping_cost !== null && product.shipping_cost !== undefined && (
            <p className="text-xs text-muted-foreground">
              Shipping: ${product.shipping_cost.toFixed(2)}
            </p>
          )}
        </div>
      </div>

      <Card className="mt-8 p-4">
        <h2 className="text-lg font-semibold mb-3">Comments</h2>
        <CommentsPanel subjectType="product" subjectId={product.id} title={product.title} />
      </Card>
    </AppShell>
  );
};

export default ProductDetail;
