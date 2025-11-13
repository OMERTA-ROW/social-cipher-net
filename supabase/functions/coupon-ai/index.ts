import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { query, category } = await req.json();
    
    if (!query) {
      throw new Error('Query is required');
    }

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY not configured');
    }

    const systemPrompt = `You are a Coupon AI assistant for CyberLink Social marketplace. Your job is to help consumers find the best percentage deals and discounts.

When a user searches for products or categories, provide:
1. Relevant discount percentages (10% to 70% off)
2. Brief deal descriptions
3. Deal expiration timeframes
4. Product categories that match

Format your response as a JSON array of deals:
[
  {
    "title": "Product/Category Name",
    "discount": "percentage (e.g., 25%)",
    "description": "Brief description of the deal",
    "category": "product category",
    "expires": "timeframe (e.g., '24 hours', '3 days')",
    "code": "coupon code if applicable"
  }
]

Provide 3-5 relevant deals. Be creative but realistic with discount percentages and products.`;

    const userPrompt = category 
      ? `Find the best coupon deals for ${category} category. Search query: ${query}`
      : `Find the best coupon deals for: ${query}`;

    console.log('Coupon AI request:', { query, category });

    const aiResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
      }),
    });

    if (!aiResponse.ok) {
      if (aiResponse.status === 429) {
        return new Response(
          JSON.stringify({ error: 'Rate limit exceeded. Please try again later.' }),
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      if (aiResponse.status === 402) {
        return new Response(
          JSON.stringify({ error: 'Payment required. Please add credits to continue.' }),
          { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      throw new Error(`AI request failed: ${aiResponse.status}`);
    }

    const aiData = await aiResponse.json();
    const responseText = aiData.choices[0].message.content;
    
    // Parse JSON from response
    let deals;
    try {
      const jsonMatch = responseText.match(/\[[\s\S]*\]/);
      deals = JSON.parse(jsonMatch ? jsonMatch[0] : responseText);
    } catch (e) {
      console.error('Failed to parse AI response:', responseText);
      // Fallback response
      deals = [{
        title: "Search Results",
        discount: "10-30%",
        description: `Deals found for: ${query}`,
        category: category || "General",
        expires: "Limited time",
        code: "CYBER10"
      }];
    }

    console.log('Coupon AI response:', deals);

    return new Response(
      JSON.stringify({ deals }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );

  } catch (error) {
    console.error('Coupon AI error:', error);
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : 'Unknown error',
        deals: []
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});
