import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useCart } from "@/hooks/useCart";
import { StoreProduct } from "@/lib/commerce";
import { ShoppingCart, Zap } from "lucide-react";

interface Props {
  product: StoreProduct;
  compact?: boolean;
}

/** Variant picker + quantity + add-to-cart / buy-now for one product. */
const ProductBuyBox = ({ product, compact = false }: Props) => {
  const { add, checkout } = useCart();
  const [variantId, setVariantId] = useState<string | null>(product.variants[0]?.id ?? null);
  const [quantity, setQuantity] = useState(1);

  const variant = product.variants.find((v) => v.id === variantId) ?? null;
  const price = variant ? variant.price : product.price;
  const stock = variant ? variant.stock_quantity : product.stock_quantity;
  const soldOut = stock !== null && stock !== undefined && stock <= 0;

  return (
    <div className="space-y-3">
      {product.variants.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {product.variants.map((v) => (
            <button
              key={v.id}
              type="button"
              onClick={() => setVariantId(v.id)}
              className={`px-3 py-1 rounded-md border text-sm transition-colors ${
                v.id === variantId
                  ? "border-primary text-primary bg-primary/10"
                  : "border-border text-muted-foreground hover:border-primary/50"
              }`}
            >
              {v.name}
            </button>
          ))}
        </div>
      )}

      <div className="flex items-center gap-3 flex-wrap">
        <span className="text-lg font-semibold text-primary">${price.toFixed(2)}</span>
        {soldOut ? (
          <Badge variant="secondary">Sold out</Badge>
        ) : stock !== null && stock !== undefined && stock <= 5 ? (
          <Badge variant="secondary">{stock} left</Badge>
        ) : null}
        {!compact && (
          <div className="flex items-center border border-border rounded-md ml-auto">
            <button
              type="button"
              className="px-2 text-muted-foreground hover:text-foreground"
              onClick={() => setQuantity((q) => Math.max(1, q - 1))}
            >
              −
            </button>
            <span className="px-3 text-sm tabular-nums">{quantity}</span>
            <button
              type="button"
              className="px-2 text-muted-foreground hover:text-foreground"
              onClick={() => setQuantity((q) => Math.min(99, q + 1))}
            >
              +
            </button>
          </div>
        )}
      </div>

      <div className="flex gap-2">
        <Button
          size="sm"
          variant="outline"
          className="flex-1"
          disabled={soldOut}
          onClick={() => add(product.id, variantId, quantity)}
        >
          <ShoppingCart className="w-4 h-4 mr-2" />
          Add to cart
        </Button>
        <Button
          size="sm"
          className="flex-1"
          disabled={soldOut}
          onClick={() =>
            checkout([{ product_id: product.id, variant_id: variantId, quantity }])
          }
        >
          <Zap className="w-4 h-4 mr-2" />
          Buy now
        </Button>
      </div>
    </div>
  );
};

export default ProductBuyBox;
