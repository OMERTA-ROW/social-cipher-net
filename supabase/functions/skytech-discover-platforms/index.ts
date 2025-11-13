import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

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

    const authHeader = req.headers.get('Authorization')!;
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser(token);

    if (userError || !user) {
      throw new Error('Unauthorized');
    }

    // Check if user is admin
    const { data: roles } = await supabaseClient
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id);

    if (!roles?.some(r => r.role === 'admin')) {
      throw new Error('Admin access required');
    }

    const { action, platformData } = await req.json();

    if (action === 'discover') {
      // Use AI to discover new social media platforms and their OAuth configs
      const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
      
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
              content: 'You are SkyTech AI, an intelligent system that discovers and configures new social media platform integrations. Return platform configurations in JSON format.'
            },
            {
              role: 'user',
              content: 'Discover the latest social media and streaming platforms that have public APIs and OAuth support. Return a JSON array of platforms with: platform_name, display_name, description, platform_type (social/streaming/affiliate), required_scopes (array), and any known OAuth endpoints.'
            }
          ],
        }),
      });

      const aiData = await aiResponse.json();
      const suggestions = aiData.choices[0].message.content;

      return new Response(
        JSON.stringify({ suggestions }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200,
        }
      );
    }

    if (action === 'add_platform') {
      const { error: insertError } = await supabaseClient
        .from('skytech_platform_configs')
        .insert(platformData);

      if (insertError) throw insertError;

      return new Response(
        JSON.stringify({ success: true, message: 'Platform added successfully' }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200,
        }
      );
    }

    if (action === 'update_platform') {
      const { id, ...updates } = platformData;
      
      const { error: updateError } = await supabaseClient
        .from('skytech_platform_configs')
        .update(updates)
        .eq('id', id);

      if (updateError) throw updateError;

      return new Response(
        JSON.stringify({ success: true, message: 'Platform updated successfully' }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200,
        }
      );
    }

    throw new Error('Invalid action');

  } catch (error: any) {
    console.error('Error in skytech-discover-platforms:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'Operation failed' }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
    );
  }
});
