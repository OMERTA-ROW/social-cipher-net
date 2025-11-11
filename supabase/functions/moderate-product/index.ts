import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { product_id, title, description, category, image_url } = await req.json();

    if (!product_id || !title) {
      throw new Error('Missing required fields: product_id and title');
    }

    console.log('Moderating product:', { product_id, title });

    // Construct moderation prompt
    const moderationPrompt = `You are a strict content moderator for CyberLink Social, an e-commerce platform. Analyze this product listing and determine if it should be BLOCKED.

CRITICAL VIOLATIONS (MUST BLOCK):
1. Illegal items (drugs, weapons, stolen goods, counterfeit items)
2. Harmful products (unsafe items, recalled products)
3. Unauthorized branded goods (fake designer items, unauthorized resale)
4. Dangerous materials or chemicals
5. Adult content or explicit material
6. Fraudulent or scam products
7. Products that violate intellectual property
8. Items that promote harm or violence

PRODUCT DETAILS:
Title: ${title}
Description: ${description || 'N/A'}
Category: ${category || 'N/A'}
Image URL: ${image_url || 'N/A'}

Analyze this product and respond in JSON format:
{
  "should_block": boolean,
  "violation_type": ["array", "of", "violations"],
  "reason": "Brief explanation",
  "confidence_score": 0.0-1.0
}

Be extremely strict. Block anything suspicious or potentially harmful.`;

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY not configured');
    }

    // Call Lovable AI for moderation
    const aiResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'system', content: 'You are a strict content moderator. Always respond with valid JSON only.' },
          { role: 'user', content: moderationPrompt }
        ],
      }),
    });

    if (!aiResponse.ok) {
      throw new Error(`AI moderation failed: ${aiResponse.status}`);
    }

    const aiData = await aiResponse.json();
    const responseText = aiData.choices[0].message.content;
    
    // Parse AI response (handle markdown formatting)
    let moderationResult;
    try {
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      moderationResult = JSON.parse(jsonMatch ? jsonMatch[0] : responseText);
    } catch (e) {
      console.error('Failed to parse AI response:', responseText);
      throw new Error('Failed to parse moderation response');
    }

    console.log('Moderation result:', moderationResult);

    // If product should be blocked, update database
    if (moderationResult.should_block) {
      console.log('BLOCKING PRODUCT:', product_id);
      
      const { error: updateError } = await supabaseClient
        .from('products')
        .update({
          is_blocked: true,
          blocked_reason: moderationResult.reason,
          moderation_score: moderationResult,
          status: 'inactive'
        })
        .eq('id', product_id);

      if (updateError) {
        console.error('Failed to block product:', updateError);
        throw updateError;
      }

      return new Response(
        JSON.stringify({
          success: true,
          blocked: true,
          reason: moderationResult.reason,
          violation_type: moderationResult.violation_type
        }),
        {
          status: 403,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    // Product is safe, update with moderation data
    const { error: updateError } = await supabaseClient
      .from('products')
      .update({
        is_blocked: false,
        moderation_score: moderationResult
      })
      .eq('id', product_id);

    if (updateError) {
      console.error('Failed to update product moderation:', updateError);
    }

    return new Response(
      JSON.stringify({
        success: true,
        blocked: false,
        confidence_score: moderationResult.confidence_score
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );

  } catch (error) {
    console.error('Product moderation error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});
