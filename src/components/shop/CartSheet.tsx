import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { useCart } from "@/hooks/useCart";
import { linePrice } from "@/lib/commerce";
import { ShoppingBag, Trash2 } from "lucide-react";

const CartSheet = () => {
  const { open, setOpen, lines, total, setQuantity, remove, checkout } = useCart();

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetContent className="w-full sm:max-w-md flex flex-col">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <ShoppingBag className="w-4 h-4" /> Your cart
          </SheetTitle>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto py-4 space-y-4">
          {lines.length === 0 ? (
            <p className="text-sm text-muted-foreground">Your cart is empty.</p>
          ) : (
            lines.map((line) => (
              <div key={line.id} className="flex gap-3">
                {line.product?.images[0] && (
                  <img
                    src={line.product.images[0]}
                    alt={line.product.title}
                    loading="lazy"
                    className="w-16 h-16 object-cover rounded-md border border-border"
                  />
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{line.product?.title}</p>
                  {line.variant && (
                    <p className="text-xs text-muted-foreground">{line.variant.name}</p>
                  )}
                  <div className="flex items-center gap-2 mt-1">
                    <div className="flex items-center border border-border rounded-md">
                      <button
                        type="button"
                        className="px-2 text-muted-foreground hover:text-foreground"
                        onClick={() => setQuantity(line.id, line.quantity - 1)}
                      >
                        −
                      </button>
                      <span className="px-2 text-sm tabular-nums">{line.quantity}</span>
                      <button
                        type="button"
                        className="px-2 text-muted-foreground hover:text-foreground"
                        onClick={() => setQuantity(line.id, line.quantity + 1)}
                      >
                        +
                      </button>
                    </div>
                    <span className="text-sm text-primary font-medium">
                      ${linePrice(line).toFixed(2)}
                    </span>
                    <button
                      type="button"
                      className="ml-auto text-muted-foreground hover:text-destructive"
                      onClick={() => remove(line.id)}
                      aria-label="Remove item"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        <Separator />
        <div className="pt-4 space-y-3">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Total</span>
            <span className="font-semibold text-primary">${total.toFixed(2)}</span>
          </div>
          <Button className="w-full" disabled={lines.length === 0} onClick={() => checkout()}>
            Checkout
          </Button>
          <p className="text-xs text-muted-foreground">
            Shipping and taxes are calculated at checkout.
          </p>
        </div>
      </SheetContent>
    </Sheet>
  );
};

export default CartSheet;
