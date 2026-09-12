import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  CartLine,
  addToCart as addToCartApi,
  cartTotal,
  getCartLines,
  removeCartItem as removeCartItemApi,
  startCheckout,
  updateCartQuantity as updateCartQuantityApi,
} from "@/lib/commerce";

interface CartContextValue {
  lines: CartLine[];
  count: number;
  total: number;
  loading: boolean;
  open: boolean;
  setOpen: (open: boolean) => void;
  refresh: () => Promise<void>;
  add: (productId: string, variantId: string | null, quantity?: number) => Promise<void>;
  setQuantity: (itemId: string, quantity: number) => Promise<void>;
  remove: (itemId: string) => Promise<void>;
  checkout: (
    items?: Array<{ product_id: string; variant_id?: string | null; quantity: number }>,
  ) => Promise<void>;
}

const CartContext = createContext<CartContextValue | null>(null);

export const CartProvider = ({ children }: { children: React.ReactNode }) => {
  const [lines, setLines] = useState<CartLine[]>([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => setUserId(user?.id ?? null));
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) =>
      setUserId(session?.user?.id ?? null),
    );
    return () => sub.subscription.unsubscribe();
  }, []);

  const refresh = useCallback(async () => {
    if (!userId) {
      setLines([]);
      return;
    }
    setLoading(true);
    try {
      setLines(await getCartLines(userId));
    } catch {
      setLines([]);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const add = useCallback(
    async (productId: string, variantId: string | null, quantity = 1) => {
      if (!userId) {
        toast.error("Sign in to add items to your cart");
        return;
      }
      try {
        await addToCartApi(userId, productId, variantId, quantity);
        await refresh();
        toast.success("Added to cart");
        setOpen(true);
      } catch (error: any) {
        toast.error(error.message || "Could not add that item");
      }
    },
    [refresh, userId],
  );

  const setQuantity = useCallback(
    async (itemId: string, quantity: number) => {
      await updateCartQuantityApi(itemId, quantity);
      await refresh();
    },
    [refresh],
  );

  const remove = useCallback(
    async (itemId: string) => {
      await removeCartItemApi(itemId);
      await refresh();
    },
    [refresh],
  );

  const checkout = useCallback(
    async (items?: Array<{ product_id: string; variant_id?: string | null; quantity: number }>) => {
      if (!userId) {
        toast.error("Sign in to check out");
        return;
      }
      const payload =
        items ??
        lines.map((l) => ({
          product_id: l.product_id,
          variant_id: l.variant_id,
          quantity: l.quantity,
        }));
      if (payload.length === 0) {
        toast.error("Your cart is empty");
        return;
      }
      try {
        const url = await startCheckout(payload);
        window.open(url, "_blank");
      } catch (error: any) {
        toast.error(error.message || "Checkout is unavailable right now");
      }
    },
    [lines, userId],
  );

  const value = useMemo<CartContextValue>(
    () => ({
      lines,
      count: lines.reduce((n, l) => n + l.quantity, 0),
      total: cartTotal(lines),
      loading,
      open,
      setOpen,
      refresh,
      add,
      setQuantity,
      remove,
      checkout,
    }),
    [add, checkout, lines, loading, open, refresh, remove, setQuantity],
  );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
};

export const useCart = () => {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart must be used inside CartProvider");
  return ctx;
};
