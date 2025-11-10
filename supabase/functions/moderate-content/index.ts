import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
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
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      { auth: { persistSession: false } }
    );

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) throw new Error('No authorization header');

    const { content_id, content_type, content_text, content_url } = await req.json();

    if (!content_id || !content_type) {
      throw new Error('Missing required fields: content_id and content_type');
    }

    console.log('Moderating content:', { content_id, content_type });

    // Call Lovable AI to analyze content
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) throw new Error('LOVABLE_API_KEY not configured');

    const moderationPrompt = `Analyze the following content ONLY for adult nudity and explicit sexual content. Do NOT flag violence, profanity, or other mature themes.

ONLY flag as adult content if it contains:
- Explicit nudity (genitals, breasts, buttocks in sexual context)
- Sexual acts or explicit sexual content
- Pornographic material

DO NOT flag:
- Violence, gore, or graphic violence
- Profanity, swear words, or offensive language
- Drug references or mature themes
- Suggestive content that isn't explicitly sexual
- Artistic nudity without sexual context

Content to analyze:
${content_text ? `Text: ${content_text}` : ''}
${content_url ? `URL/Media: ${content_url}` : ''}

Respond with a JSON object containing:
{
  "is_adult_content": boolean (true ONLY for explicit nudity/sexual content),
  "confidence_score": number (0-1),
  "flagged_categories": array (only use ["nudity"] or ["sexual_content"] if flagged, empty array otherwise),
  "explanation": string
}`;

    const aiResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'system', content: 'You are a content moderation AI that identifies ONLY adult nudity and explicit sexual content. You do NOT flag violence, profanity, or other mature themes. Always respond with valid JSON.' },
          { role: 'user', content: moderationPrompt }
        ],
      }),
    });

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      console.error('AI Gateway error:', aiResponse.status, errorText);
      throw new Error(`AI Gateway error: ${aiResponse.status}`);
    }

    const aiData = await aiResponse.json();
    console.log('AI response:', aiData);

    let moderationResult;
    try {
      const aiContent = aiData.choices[0].message.content;
      // Extract JSON from markdown code blocks if present
      const jsonMatch = aiContent.match(/```json\n?([\s\S]*?)\n?```/) || aiContent.match(/\{[\s\S]*\}/);
      moderationResult = JSON.parse(jsonMatch ? jsonMatch[1] || jsonMatch[0] : aiContent);
    } catch (e) {
      console.error('Failed to parse AI response:', e);
      // Fallback: assume safe content if AI parsing fails
      moderationResult = {
        is_adult_content: false,
        confidence_score: 0.5,
        flagged_categories: [],
        explanation: 'Failed to parse moderation result'
      };
    }

    // Store moderation result in database
    const { error: insertError } = await supabaseClient
      .from('content_moderation')
      .insert({
        content_id,
        content_type,
        content_text,
        content_url,
        is_adult_content: moderationResult.is_adult_content,
        moderation_score: {
          confidence: moderationResult.confidence_score,
          explanation: moderationResult.explanation
        },
        flagged_reasons: moderationResult.flagged_categories,
        reviewed_by_ai: true,
        reviewed_by_human: false
      });

    if (insertError) {
      console.error('Database insert error:', insertError);
      throw insertError;
    }

    console.log('Moderation complete:', moderationResult);

    return new Response(
      JSON.stringify({
        success: true,
        is_adult_content: moderationResult.is_adult_content,
        confidence_score: moderationResult.confidence_score,
        flagged_categories: moderationResult.flagged_categories
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error in moderate-content function:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
    );
  }
});