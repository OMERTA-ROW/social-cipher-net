import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { signOAuthState } from "../_shared/oauthState.ts";

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

    const { platform } = await req.json();

    console.log(`Initiating OAuth flow for ${platform} for user ${user.id}`);

    // Get OAuth configuration from SkyTech config
    const { data: platformConfig, error: configError } = await supabaseClient
      .from('skytech_platform_configs')
      .select('oauth_config, required_scopes, display_name')
      .eq('platform_name', platform)
      .eq('is_active', true)
      .single();

    let config;

    if (configError || !platformConfig) {
      // Fallback to hardcoded configs
      const oauthConfigs: { [key: string]: any } = {
      instagram: {
        client_id: Deno.env.get('INSTAGRAM_CLIENT_ID'),
        auth_url: 'https://api.instagram.com/oauth/authorize',
        scope: 'user_profile,user_media',
      },
      twitter: {
        client_id: Deno.env.get('TWITTER_CLIENT_ID'),
        auth_url: 'https://twitter.com/i/oauth2/authorize',
        scope: 'tweet.read users.read',
      },
      youtube: {
        client_id: Deno.env.get('YOUTUBE_CLIENT_ID'),
        auth_url: 'https://accounts.google.com/o/oauth2/v2/auth',
        scope: 'https://www.googleapis.com/auth/youtube.readonly',
      },
      twitch: {
        client_id: Deno.env.get('TWITCH_CLIENT_ID'),
        auth_url: 'https://id.twitch.tv/oauth2/authorize',
        scope: 'user:read:email channel:read:subscriptions',
      },
      reddit: {
        client_id: Deno.env.get('REDDIT_CLIENT_ID'),
        auth_url: 'https://www.reddit.com/api/v1/authorize',
        scope: 'identity read',
      },
      facebook: {
        client_id: Deno.env.get('FACEBOOK_APP_ID'),
        auth_url: 'https://www.facebook.com/v18.0/dialog/oauth',
        scope: 'public_profile,email',
      },
      tiktok: {
        client_id: Deno.env.get('TIKTOK_CLIENT_KEY'),
        auth_url: 'https://www.tiktok.com/v2/auth/authorize',
        scope: 'user.info.basic,video.list',
      },
      linkedin: {
        client_id: Deno.env.get('LINKEDIN_CLIENT_ID'),
        auth_url: 'https://www.linkedin.com/oauth/v2/authorization',
        scope: 'openid profile email',
      },
      };

      config = oauthConfigs[platform];
      if (!config) {
        throw new Error(`Unsupported platform: ${platform}`);
      }
    } else {
      // Use dynamic config from SkyTech
      config = {
        client_id: platformConfig.oauth_config?.client_id || Deno.env.get(`${platform.toUpperCase()}_CLIENT_ID`),
        auth_url: platformConfig.oauth_config?.auth_url,
        scope: platformConfig.required_scopes?.join(' ') || '',
      };
    }

    // Store pending connection - update if exists, insert if new
    const { error: insertError } = await supabaseClient
      .from('platform_connections')
      .upsert(
        {
          user_id: user.id,
          platform,
          is_active: false,
          metadata: { pending_auth: true },
          updated_at: new Date().toISOString(),
        },
        {
          onConflict: 'user_id,platform',
          ignoreDuplicates: false,
        }
      );

    if (insertError) throw insertError;

    // Build OAuth URL
    const redirectUri = `${Deno.env.get('SUPABASE_URL')}/functions/v1/social-oauth-callback`;
    const state = await signOAuthState(user.id, platform);
    
    const authUrl = `${config.auth_url}?client_id=${config.client_id}&redirect_uri=${encodeURIComponent(redirectUri)}&scope=${encodeURIComponent(config.scope)}&state=${encodeURIComponent(state)}&response_type=code`;

    return new Response(
      JSON.stringify({ 
        success: true, 
        auth_url: authUrl,
        message: `Redirecting to ${platform} OAuth...` 
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );

  } catch (error: any) {
    console.error('Error in connect-social-platform:', error);
    return new Response(
      JSON.stringify({ 
        error: error.message || 'Failed to initiate OAuth flow' 
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
    );
  }
});
