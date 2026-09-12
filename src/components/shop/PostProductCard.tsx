import { Link } from "react-router-dom";
import { Card } from "@/components/ui/card";
import ProductBuyBox from "@/components/shop/ProductBuyBox";
import { StoreProduct } from "@/lib/commerce";

/**
 * Shoppable row rendered inside a post — home feed only. Buyers add to cart
 * and check out without leaving the feed.
 */
const PostProductCard = ({ products }: { products: StoreProduct[] }) => {
  if (products.length === 0) return null;
  return (
    <div className="space-y-3">
      {products.map((product) => (
        <Card key={product.id} className="p-3 flex gap-3 border-primary/25 bg-secondary/30">
          {product.images[0] && (
            <Link to={`/product/${product.id}`} className="shrink-0">
              <img
                src={product.images[0]}
                alt={product.title}
                loading="lazy"
                className="w-20 h-20 object-cover rounded-md border border-border"
              />
            </Link>
          )}
          <div className="flex-1 min-w-0">
            <Link
              to={`/product/${product.id}`}
              className="text-sm font-semibold hover:text-primary truncate block"
            >
              {product.title}
            </Link>
            <div className="mt-2">
              <ProductBuyBox product={product} compact />
            </div>
          </div>
        </Card>
      ))}
    </div>
  );
};

export default PostProductCard;
