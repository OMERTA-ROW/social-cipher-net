import { useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { toast } from "sonner";
import AppShell from "@/components/layout/AppShell";
import FeedShopTab from "@/components/feed/FeedShopTab";
import { supabase } from "@/integrations/supabase/client";
import { useCart } from "@/hooks/useCart";

const Shop = () => {
  const [params, setParams] = useSearchParams();
  const { refresh } = useCart();

  // Coming back from checkout: the server re-checks payment with Stripe before
  // anything is marked paid, stock is reduced or the cart is emptied.
  useEffect(() => {
    const state = params.get("order");
    const orderId = params.get("order_id");
    if (!state) return;

    if (state === "cancelled") {
      toast.info("Checkout cancelled — your cart is still here");
    } else if (state === "success" && orderId) {
      (async () => {
        const { data, error } = await supabase.functions.invoke("verify-store-order", {
          body: { orderId },
        });
        if (error) {
          toast.error("We could not confirm your payment yet. Check back shortly.");
        } else if (data?.status === "paid") {
          toast.success("Payment confirmed — your order is on its way");
          await refresh();
        } else {
          toast.info("Payment is still processing");
        }
      })();
    }

    params.delete("order");
    params.delete("order_id");
    setParams(params, { replace: true });
  }, [params, setParams, refresh]);

  return (
    <AppShell>
      <div className="space-y-6">
        <FeedShopTab />
      </div>
    </AppShell>
  );
};

export default Shop;
