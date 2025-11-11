import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const PLATFORM_COMMISSION_RATE = 0.02; // 2% platform commission

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { 
      product_id, 
      seller_id, 
      affiliate_id,
      buyer_email, 
      amount,
      shipping_cost = 0 
    } = await req.json();

    if (!product_id || !seller_id || !buyer_email || !amount) {
      throw new Error('Missing required fields');
    }

    console.log('Processing sale:', { product_id, seller_id, amount });

    // Calculate commissions
    const totalAmount = parseFloat(amount) + parseFloat(shipping_cost);
    const platformCommission = totalAmount * PLATFORM_COMMISSION_RATE;
    
    // Affiliate gets 5% if present, seller gets the rest minus platform commission
    const affiliateCommission = affiliate_id ? totalAmount * 0.05 : 0;
    const sellerCommission = totalAmount - platformCommission - affiliateCommission;

    console.log('Commissions calculated:', {
      total: totalAmount,
      platform: platformCommission,
      seller: sellerCommission,
      affiliate: affiliateCommission
    });

    // Create sale record
    const { data: sale, error: saleError } = await supabaseClient
      .from('sales')
      .insert({
        product_id,
        seller_id,
        affiliate_id,
        buyer_email,
        amount,
        shipping_cost,
        platform_commission: platformCommission,
        platform_commission_rate: PLATFORM_COMMISSION_RATE,
        seller_commission: sellerCommission,
        affiliate_commission: affiliateCommission,
        status: 'completed'
      })
      .select()
      .single();

    if (saleError) {
      console.error('Failed to create sale:', saleError);
      throw saleError;
    }

    console.log('Sale created:', sale.id);

    // Record platform earnings
    const { error: earningsError } = await supabaseClient
      .from('platform_earnings')
      .insert({
        sale_id: sale.id,
        amount: platformCommission,
        commission_rate: PLATFORM_COMMISSION_RATE
      });

    if (earningsError) {
      console.error('Failed to record platform earnings:', earningsError);
      // Don't fail the sale, just log the error
    }

    return new Response(
      JSON.stringify({
        success: true,
        sale_id: sale.id,
        platform_commission: platformCommission,
        seller_commission: sellerCommission,
        affiliate_commission: affiliateCommission
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );

  } catch (error) {
    console.error('Sale processing error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});
