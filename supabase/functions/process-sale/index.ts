import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const PLATFORM_COMMISSION_RATE = 0.02; // 2% platform commission
const AFFILIATE_COMMISSION_RATE = 0.05;

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    status,
  });

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      { auth: { persistSession: false } }
    );

    // --- Require an authenticated buyer ---
    const authHeader = req.headers.get('Authorization') ?? '';
    const jwt = authHeader.replace('Bearer ', '').trim();
    if (!jwt) return json({ error: 'Unauthorized' }, 401);

    const { data: userData, error: userError } = await supabaseClient.auth.getUser(jwt);
    const buyer = userData?.user;
    if (userError || !buyer) return json({ error: 'Unauthorized' }, 401);

    const body = await req.json().catch(() => ({}));
    const product_id = typeof body.product_id === 'string' ? body.product_id.trim() : '';
    const affiliate_id = typeof body.affiliate_id === 'string' ? body.affiliate_id.trim() : null;
    const quantityRaw = Number(body.quantity ?? 1);

    if (!UUID_RE.test(product_id)) return json({ error: 'Invalid product_id' }, 400);
    if (affiliate_id && !UUID_RE.test(affiliate_id)) return json({ error: 'Invalid affiliate_id' }, 400);

    const quantity = Number.isFinite(quantityRaw) ? Math.floor(quantityRaw) : 1;
    if (quantity < 1 || quantity > 100) return json({ error: 'Invalid quantity' }, 400);

    // Buyer email always comes from the verified session, never the client body
    const buyer_email = buyer.email ?? '';
    if (!EMAIL_RE.test(buyer_email)) return json({ error: 'Account has no verified email' }, 400);

    // --- Pricing is derived server-side from the product record ---
    const { data: product, error: productError } = await supabaseClient
      .from('products')
      .select('id, seller_id, price, shipping_cost, status, is_blocked, stock_quantity')
      .eq('id', product_id)
      .maybeSingle();

    if (productError || !product) return json({ error: 'Product not found' }, 404);
    if (product.is_blocked || (product.status && product.status !== 'active')) {
      return json({ error: 'Product is not available for purchase' }, 400);
    }
    if (product.stock_quantity !== null && product.stock_quantity < quantity) {
      return json({ error: 'Insufficient stock' }, 400);
    }

    const unitPrice = Number(product.price);
    const shipping_cost = Number(product.shipping_cost ?? 0);
    if (!Number.isFinite(unitPrice) || unitPrice <= 0) {
      return json({ error: 'Product pricing is invalid' }, 400);
    }

    const amount = unitPrice * quantity;
    const totalAmount = amount + shipping_cost;
    const platformCommission = totalAmount * PLATFORM_COMMISSION_RATE;
    const affiliateCommission = affiliate_id ? totalAmount * AFFILIATE_COMMISSION_RATE : 0;
    const sellerCommission = totalAmount - platformCommission - affiliateCommission;

    const { data: sale, error: saleError } = await supabaseClient
      .from('sales')
      .insert({
        product_id,
        seller_id: product.seller_id,
        affiliate_id,
        buyer_email,
        amount,
        shipping_cost,
        platform_commission: platformCommission,
        platform_commission_rate: PLATFORM_COMMISSION_RATE,
        seller_commission: sellerCommission,
        affiliate_commission: affiliateCommission,
        status: 'completed',
      })
      .select()
      .single();

    if (saleError) {
      console.error('Failed to create sale:', saleError);
      return json({ error: 'Failed to create sale' }, 400);
    }

    const { error: earningsError } = await supabaseClient
      .from('platform_earnings')
      .insert({
        sale_id: sale.id,
        amount: platformCommission,
        commission_rate: PLATFORM_COMMISSION_RATE,
      });

    if (earningsError) {
      console.error('Failed to record platform earnings:', earningsError);
    }

    return json({
      success: true,
      sale_id: sale.id,
      amount,
      shipping_cost,
      platform_commission: platformCommission,
      seller_commission: sellerCommission,
      affiliate_commission: affiliateCommission,
    });
  } catch (error) {
    console.error('Sale processing error:', error);
    return json({ error: 'Sale processing failed' }, 500);
  }
});
