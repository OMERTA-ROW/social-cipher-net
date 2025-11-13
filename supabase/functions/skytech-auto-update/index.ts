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

    const { action } = await req.json();

    if (action === 'check_updates') {
      // Check for pending updates
      const { data: updates, error: fetchError } = await supabaseClient
        .from('skytech_app_updates')
        .select('*')
        .eq('is_applied', false)
        .order('created_at', { ascending: false });

      if (fetchError) throw fetchError;

      return new Response(
        JSON.stringify({ updates: updates || [] }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200,
        }
      );
    }

    if (action === 'apply_update') {
      const { update_id } = await req.json();

      // Check if user is admin
      const { data: roles } = await supabaseClient
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id);

      if (!roles?.some(r => r.role === 'admin')) {
        throw new Error('Admin access required');
      }

      // Get update details
      const { data: update, error: fetchError } = await supabaseClient
        .from('skytech_app_updates')
        .select('*')
        .eq('id', update_id)
        .single();

      if (fetchError) throw fetchError;

      // Mark as applied
      const { error: updateError } = await supabaseClient
        .from('skytech_app_updates')
        .update({
          is_applied: true,
          applied_at: new Date().toISOString()
        })
        .eq('id', update_id);

      if (updateError) throw updateError;

      return new Response(
        JSON.stringify({ 
          success: true, 
          message: 'Update applied successfully',
          changes: update.changes 
        }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200,
        }
      );
    }

    if (action === 'discover_updates') {
      // Use AI to suggest updates and new features
      const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');

      // Get current platform configs
      const { data: platforms } = await supabaseClient
        .from('skytech_platform_configs')
        .select('platform_name, display_name');

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
              content: 'You are SkyTech AI update system. Analyze current integrations and suggest improvements, new features, or security updates.'
            },
            {
              role: 'user',
              content: `Current integrations: ${JSON.stringify(platforms)}. Suggest 3 high-priority updates or new integrations that would benefit users. Return as JSON array with: title, description, update_type (feature/integration/security/enhancement), version.`
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

    throw new Error('Invalid action');

  } catch (error: any) {
    console.error('Error in skytech-auto-update:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'Operation failed' }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
    );
  }
});
