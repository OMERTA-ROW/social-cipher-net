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

    const { content_id, content_type, content_text, content_url } = await req.json();

    if (!content_id || !content_type) {
      throw new Error('Missing required fields: content_id and content_type');
    }

    // Use Lovable AI to analyze content
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY not configured');
    }

    const moderationPrompt = `Analyze this content for adult/NSFW material. Consider:
- Sexual content or nudity
- Violence or gore
- Hate speech or discrimination
- Drug/alcohol references inappropriate for minors
- Other content inappropriate for users under 18

Content to analyze:
${content_text || 'No text content'}
${content_url ? `URL: ${content_url}` : ''}

Respond ONLY with a JSON object (no markdown, no code blocks):
{
  "is_adult_content": boolean,
  "confidence": number (0-1),
  "flagged_reasons": array of strings,
  "explanation": string
}`;

    console.log('Sending content for moderation...');
    
    const aiResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { 
            role: 'system', 
            content: 'You are a content moderation AI. Analyze content and return ONLY valid JSON, no markdown formatting.' 
          },
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
    const aiContent = aiData.choices[0].message.content;
    
    console.log('AI Response:', aiContent);

    // Parse AI response - handle potential markdown code blocks
    let moderationResult;
    try {
      // Remove markdown code blocks if present
      const cleanedContent = aiContent.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      moderationResult = JSON.parse(cleanedContent);
    } catch (parseError) {
      console.error('Failed to parse AI response:', aiContent);
      throw new Error('Invalid AI response format');
    }

    // Store moderation result
    const { error: insertError } = await supabaseClient
      .from('content_moderation')
      .insert({
        content_id,
        content_type,
        content_text,
        content_url,
        is_adult_content: moderationResult.is_adult_content || false,
        moderation_score: {
          confidence: moderationResult.confidence,
          explanation: moderationResult.explanation,
        },
        flagged_reasons: moderationResult.flagged_reasons || [],
      });

    if (insertError) {
      console.error('Database insert error:', insertError);
      throw insertError;
    }

    return new Response(
      JSON.stringify({
        success: true,
        is_adult_content: moderationResult.is_adult_content,
        confidence: moderationResult.confidence,
        flagged_reasons: moderationResult.flagged_reasons,
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