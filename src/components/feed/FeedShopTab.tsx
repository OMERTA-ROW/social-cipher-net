import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { StoreProduct, fetchCategories, fetchStorefront } from "@/lib/commerce";
import { useCart } from "@/hooks/useCart";
import { Search, ShoppingBag, Store as StoreIcon } from "lucide-react";

const FeedShopTab = () => {
  const [products, setProducts] = useState<StoreProduct[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [category, setCategory] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { add, setOpen, count } = useCart();

  useEffect(() => {
    fetchCategories().then(setCategories).catch(() => setCategories([]));
  }, []);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError(null);
    fetchStorefront({ category, search: query || null })
      .then((rows) => active && setProducts(rows))
      .catch(() => active && setError("Products could not be loaded right now."))
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
  }, [category, query]);

  const featured = useMemo(() => products.slice(0, 3), [products]);

  return (
    <div className="space-y-6">
      <Card className="relative overflow-hidden border-primary/30 bg-gradient-to-br from-primary/15 via-background to-accent/10 p-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold">Cyber Link Shop</h2>
            <p className="text-sm text-muted-foreground">
              Apparel, gear and creator goods sold direct by the people who make them.
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => setOpen(true)}>
              <ShoppingBag className="w-4 h-4 mr-2" />
              Cart{count > 0 ? ` (${count})` : ""}
            </Button>
            <Button size="sm" asChild>
              <Link to="/seller-dashboard">
                <StoreIcon className="w-4 h-4 mr-2" />
                Sell here
              </Link>
            </Button>
          </div>
        </div>

        {featured.length > 0 && (
          <div className="mt-5 grid grid-cols-3 gap-3">
            {featured.map((p) => (
              <Link key={p.id} to={`/product/${p.id}`} className="group">
                <div className="aspect-[4/3] overflow-hidden rounded-lg border border-border bg-secondary/40">
                  {p.images[0] ? (
                    <img
                      src={p.images[0]}
                      alt={p.title}
                      loading="lazy"
                      className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                    />
                  ) : null}
                </div>
                <p className="mt-1 text-xs truncate">{p.title}</p>
              </Link>
            ))}
          </div>
        )}
      </Card>

      <div className="flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && setQuery(search.trim())}
            placeholder="Search products"
            className="pl-9"
          />
        </div>
        <Button variant="secondary" onClick={() => setQuery(search.trim())}>
          Search
        </Button>
      </div>

      {categories.length > 0 && (
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setCategory(null)}
            className={`px-3 py-1 rounded-full text-xs border transition-colors ${
              category === null
                ? "border-primary text-primary bg-primary/10"
                : "border-border text-muted-foreground hover:border-primary/50"
            }`}
          >
            All
          </button>
          {categories.map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => setCategory(c)}
              className={`px-3 py-1 rounded-full text-xs border transition-colors ${
                category === c
                  ? "border-primary text-primary bg-primary/10"
                  : "border-border text-muted-foreground hover:border-primary/50"
              }`}
            >
              {c}
            </button>
          ))}
        </div>
      )}

      {loading ? (
        <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton key={i} className="h-64 w-full rounded-lg" />
          ))}
        </div>
      ) : error ? (
        <Card className="p-6 text-sm text-muted-foreground">{error}</Card>
      ) : products.length === 0 ? (
        <Card className="p-6 text-sm text-muted-foreground">
          No products listed yet. Open your own store to be the first.
        </Card>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4">
          {products.map((product) => {
            const soldOut =
              product.stock_quantity !== null &&
              product.stock_quantity !== undefined &&
              product.stock_quantity <= 0 &&
              product.variants.length === 0;
            return (
              <Card
                key={product.id}
                className="group overflow-hidden border-border/60 hover:border-primary/50 transition-colors"
              >
                <Link to={`/product/${product.id}`}>
                  <div className="aspect-square bg-secondary/40 overflow-hidden">
                    {product.images[0] ? (
                      <img
                        src={product.images[0]}
                        alt={product.title}
                        loading="lazy"
                        className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-muted-foreground text-xs">
                        No image
                      </div>
                    )}
                  </div>
                </Link>
                <div className="p-3 space-y-2">
                  <Link
                    to={`/product/${product.id}`}
                    className="block text-sm font-medium truncate hover:text-primary"
                  >
                    {product.title}
                  </Link>
                  <div className="flex items-center justify-between">
                    <span className="text-primary font-semibold">
                      ${product.price.toFixed(2)}
                    </span>
                    {product.category && (
                      <Badge variant="secondary" className="text-[10px]">
                        {product.category}
                      </Badge>
                    )}
                  </div>
                  {product.variants.length > 0 ? (
                    <Button size="sm" variant="outline" className="w-full" asChild>
                      <Link to={`/product/${product.id}`}>Choose options</Link>
                    </Button>
                  ) : (
                    <Button
                      size="sm"
                      className="w-full"
                      disabled={soldOut}
                      onClick={() => add(product.id, null, 1)}
                    >
                      {soldOut ? "Sold out" : "Add to cart"}
                    </Button>
                  )}
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default FeedShopTab;
