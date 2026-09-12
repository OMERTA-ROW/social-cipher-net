CREATE OR REPLACE FUNCTION public.fulfill_paid_order(_order_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _buyer uuid;
  _status text;
  _item record;
BEGIN
  SELECT buyer_id, status INTO _buyer, _status
  FROM public.orders WHERE id = _order_id FOR UPDATE;

  IF _buyer IS NULL THEN RETURN false; END IF;
  IF _status <> 'pending' THEN RETURN false; END IF;

  FOR _item IN SELECT product_id, variant_id, quantity FROM public.order_items WHERE order_id = _order_id LOOP
    IF _item.variant_id IS NOT NULL THEN
      UPDATE public.product_variants
        SET stock_quantity = GREATEST(COALESCE(stock_quantity, 0) - _item.quantity, 0)
        WHERE id = _item.variant_id AND stock_quantity IS NOT NULL;
    END IF;
    UPDATE public.products
      SET stock_quantity = GREATEST(COALESCE(stock_quantity, 0) - _item.quantity, 0)
      WHERE id = _item.product_id AND stock_quantity IS NOT NULL;
  END LOOP;

  UPDATE public.orders SET status = 'paid' WHERE id = _order_id;

  DELETE FROM public.cart_items
  WHERE cart_id IN (SELECT id FROM public.carts WHERE user_id = _buyer);

  RETURN true;
END;
$$;

REVOKE ALL ON FUNCTION public.fulfill_paid_order(uuid) FROM public, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.fulfill_paid_order(uuid) TO service_role;