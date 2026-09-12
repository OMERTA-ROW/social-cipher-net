import { supabase } from "@/integrations/supabase/client";

export interface ProductVariant {
  id: string;
  product_id: string;
  name: string;
  options: Record<string, string>;
  price: number;
  stock_quantity: number;
  sku: string | null;
  display_order: number;
}

export interface StoreProduct {
  id: string;
  seller_id: string;
  title: string;
  description: string | null;
  price: number;
  image_url: string | null;
  category: string | null;
  shipping_cost: number | null;
  stock_quantity: number | null;
  status: string | null;
  images: string[];
  variants: ProductVariant[];
}

export interface Store {
  id: string;
  user_id: string;
  slug: string | null;
  business_name: string;
  business_description: string | null;
  tagline: string | null;
  banner_url: string | null;
  logo_url: string | null;
}

const PRODUCT_SELECT = `
  id, seller_id, title, description, price, image_url, category, shipping_cost,
  stock_quantity, status,
  product_images(image_url, display_order),
  product_variants(id, product_id, name, options, price, stock_quantity, sku, display_order)
`;

const mapProduct = (row: any): StoreProduct => ({
  id: row.id,
  seller_id: row.seller_id,
  title: row.title,
  description: row.description,
  price: Number(row.price ?? 0),
  image_url: row.image_url,
  category: row.category,
  shipping_cost: row.shipping_cost === null ? null : Number(row.shipping_cost),
  stock_quantity: row.stock_quantity,
  status: row.status,
  images: [
    ...(row.image_url ? [row.image_url] : []),
    ...((row.product_images ?? []) as any[])
      .sort((a, b) => (a.display_order ?? 0) - (b.display_order ?? 0))
      .map((i) => i.image_url),
  ],
  variants: ((row.product_variants ?? []) as any[])
    .sort((a, b) => (a.display_order ?? 0) - (b.display_order ?? 0))
    .map((v) => ({
      ...v,
      price: Number(v.price ?? 0),
      options: (v.options ?? {}) as Record<string, string>,
    })),
});

export async function fetchStorefront(options: {
  category?: string | null;
  search?: string | null;
  sellerId?: string | null;
  limit?: number;
} = {}): Promise<StoreProduct[]> {
  let query = supabase
    .from("products")
    .select(PRODUCT_SELECT)
    .eq("status", "active")
    .order("created_at", { ascending: false })
    .limit(options.limit ?? 48);
  if (options.category) query = query.eq("category", options.category);
  if (options.sellerId) query = query.eq("seller_id", options.sellerId);
  if (options.search) query = query.ilike("title", `%${options.search}%`);
  const { data, error } = await query;
  if (error) throw error;
  return (data ?? []).map(mapProduct);
}

export async function fetchProduct(productId: string): Promise<StoreProduct | null> {
  const { data, error } = await supabase
    .from("products")
    .select(PRODUCT_SELECT)
    .eq("id", productId)
    .maybeSingle();
  if (error) throw error;
  return data ? mapProduct(data) : null;
}

export async function fetchCategories(): Promise<string[]> {
  const { data } = await supabase
    .from("products")
    .select("category")
    .eq("status", "active")
    .not("category", "is", null)
    .limit(500);
  return Array.from(new Set((data ?? []).map((r: any) => r.category as string))).sort();
}

export async function fetchStore(slugOrUserId: string): Promise<Store | null> {
  const columns = "id, user_id, slug, business_name, business_description, tagline, banner_url, logo_url";
  const bySlug = await supabase.from("seller_profiles").select(columns).eq("slug", slugOrUserId).maybeSingle();
  if (bySlug.data) return bySlug.data as Store;
  const byUser = await supabase.from("seller_profiles").select(columns).eq("user_id", slugOrUserId).maybeSingle();
  return (byUser.data as Store) ?? null;
}

/** Products attached to a set of posts, for shoppable posts on the home feed. */
export async function fetchPostProducts(
  postIds: string[],
): Promise<Map<string, StoreProduct[]>> {
  const map = new Map<string, StoreProduct[]>();
  if (postIds.length === 0) return map;
  const { data, error } = await supabase
    .from("post_products")
    .select(`post_id, display_order, products(${PRODUCT_SELECT})`)
    .in("post_id", postIds)
    .order("display_order", { ascending: true });
  if (error) return map;
  for (const row of (data ?? []) as any[]) {
    if (!row.products) continue;
    const list = map.get(row.post_id) ?? [];
    list.push(mapProduct(row.products));
    map.set(row.post_id, list);
  }
  return map;
}

export async function attachProductToPost(postId: string, productId: string) {
  const { error } = await supabase.from("post_products").insert({ post_id: postId, product_id: productId });
  if (error) throw error;
}

/* ----------------------------- cart ----------------------------- */

export interface CartLine {
  id: string;
  product_id: string;
  variant_id: string | null;
  quantity: number;
  product: StoreProduct | null;
  variant: ProductVariant | null;
}

async function ensureCart(userId: string): Promise<string> {
  const { data: existing } = await supabase
    .from("carts")
    .select("id")
    .eq("user_id", userId)
    .maybeSingle();
  if (existing?.id) return existing.id as string;
  const { data, error } = await supabase
    .from("carts")
    .insert({ user_id: userId })
    .select("id")
    .single();
  if (error) throw error;
  return data.id as string;
}

export async function getCartLines(userId: string): Promise<CartLine[]> {
  const cartId = await ensureCart(userId);
  const { data, error } = await supabase
    .from("cart_items")
    .select(`id, product_id, variant_id, quantity, products(${PRODUCT_SELECT})`)
    .eq("cart_id", cartId)
    .order("created_at", { ascending: true });
  if (error) throw error;
  return ((data ?? []) as any[]).map((row) => {
    const product = row.products ? mapProduct(row.products) : null;
    return {
      id: row.id,
      product_id: row.product_id,
      variant_id: row.variant_id,
      quantity: row.quantity,
      product,
      variant: product?.variants.find((v) => v.id === row.variant_id) ?? null,
    };
  });
}

export async function addToCart(
  userId: string,
  productId: string,
  variantId: string | null,
  quantity = 1,
) {
  const cartId = await ensureCart(userId);
  const { data: existing } = await supabase
    .from("cart_items")
    .select("id, quantity")
    .eq("cart_id", cartId)
    .eq("product_id", productId)
    .is("variant_id", variantId === null ? null : undefined)
    .maybeSingle();

  if (existing?.id && variantId === null) {
    const { error } = await supabase
      .from("cart_items")
      .update({ quantity: (existing.quantity ?? 1) + quantity })
      .eq("id", existing.id);
    if (error) throw error;
    return;
  }

  if (variantId) {
    const { data: variantRow } = await supabase
      .from("cart_items")
      .select("id, quantity")
      .eq("cart_id", cartId)
      .eq("variant_id", variantId)
      .maybeSingle();
    if (variantRow?.id) {
      const { error } = await supabase
        .from("cart_items")
        .update({ quantity: (variantRow.quantity ?? 1) + quantity })
        .eq("id", variantRow.id);
      if (error) throw error;
      return;
    }
  }

  const { error } = await supabase
    .from("cart_items")
    .insert({ cart_id: cartId, product_id: productId, variant_id: variantId, quantity });
  if (error) throw error;
}

export async function updateCartQuantity(itemId: string, quantity: number) {
  if (quantity <= 0) return removeCartItem(itemId);
  const { error } = await supabase.from("cart_items").update({ quantity }).eq("id", itemId);
  if (error) throw error;
}

export async function removeCartItem(itemId: string) {
  const { error } = await supabase.from("cart_items").delete().eq("id", itemId);
  if (error) throw error;
}

export const linePrice = (line: CartLine) =>
  (line.variant ? line.variant.price : line.product?.price ?? 0) * line.quantity;

export const cartTotal = (lines: CartLine[]) =>
  lines.reduce((sum, line) => sum + linePrice(line), 0);

/** Server-side checkout: prices, stock and totals are resolved on the server. */
export async function startCheckout(
  items: Array<{ product_id: string; variant_id?: string | null; quantity: number }>,
) {
  const { data, error } = await supabase.functions.invoke("create-store-checkout", {
    body: { items },
  });
  if (error) throw error;
  if (!data?.url) throw new Error(data?.error || "Checkout could not be started");
  return data.url as string;
}
