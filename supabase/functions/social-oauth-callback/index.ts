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
    const url = new URL(req.url);
    const code = url.searchParams.get('code');
    const state = url.searchParams.get('state');

    if (!code || !state) {
      throw new Error('Missing code or state parameter');
    }

    const { user_id, platform } = JSON.parse(atob(state));

    console.log(`Processing OAuth callback for ${platform} and user ${user_id}`);

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Exchange code for access token
    const tokenConfigs: { [key: string]: any } = {
      instagram: {
        client_id: Deno.env.get('INSTAGRAM_CLIENT_ID'),
        client_secret: Deno.env.get('INSTAGRAM_CLIENT_SECRET'),
        token_url: 'https://api.instagram.com/oauth/access_token',
      },
      twitter: {
        client_id: Deno.env.get('TWITTER_CLIENT_ID'),
        client_secret: Deno.env.get('TWITTER_CLIENT_SECRET'),
        token_url: 'https://api.twitter.com/2/oauth2/token',
      },
      youtube: {
        client_id: Deno.env.get('YOUTUBE_CLIENT_ID'),
        client_secret: Deno.env.get('YOUTUBE_CLIENT_SECRET'),
        token_url: 'https://oauth2.googleapis.com/token',
      },
      twitch: {
        client_id: Deno.env.get('TWITCH_CLIENT_ID'),
        client_secret: Deno.env.get('TWITCH_CLIENT_SECRET'),
        token_url: 'https://id.twitch.tv/oauth2/token',
      },
      reddit: {
        client_id: Deno.env.get('REDDIT_CLIENT_ID'),
        client_secret: Deno.env.get('REDDIT_CLIENT_SECRET'),
        token_url: 'https://www.reddit.com/api/v1/access_token',
      },
      facebook: {
        client_id: Deno.env.get('FACEBOOK_APP_ID'),
        client_secret: Deno.env.get('FACEBOOK_APP_SECRET'),
        token_url: 'https://graph.facebook.com/v18.0/oauth/access_token',
      },
      tiktok: {
        client_id: Deno.env.get('TIKTOK_CLIENT_KEY'),
        client_secret: Deno.env.get('TIKTOK_CLIENT_SECRET'),
        token_url: 'https://open-api.tiktok.com/oauth/access_token/',
      },
      linkedin: {
        client_id: Deno.env.get('LINKEDIN_CLIENT_ID'),
        client_secret: Deno.env.get('LINKEDIN_CLIENT_SECRET'),
        token_url: 'https://www.linkedin.com/oauth/v2/accessToken',
      },
    };

    const config = tokenConfigs[platform];
    if (!config) {
      throw new Error(`Unsupported platform: ${platform}`);
    }

    const redirectUri = `${Deno.env.get('SUPABASE_URL')}/functions/v1/social-oauth-callback`;

    // Exchange authorization code for access token
    const tokenResponse = await fetch(config.token_url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        client_id: config.client_id,
        client_secret: config.client_secret,
        code,
        redirect_uri: redirectUri,
        grant_type: 'authorization_code',
      }).toString(),
    });

    if (!tokenResponse.ok) {
      const error = await tokenResponse.text();
      throw new Error(`Token exchange failed: ${error}`);
    }

    const tokenData = await tokenResponse.json();

    // Update platform connection with access token
    const { error: updateError } = await supabaseClient
      .from('platform_connections')
      .update({
        is_active: true,
        metadata: {
          access_token: tokenData.access_token,
          refresh_token: tokenData.refresh_token,
          expires_at: tokenData.expires_in 
            ? new Date(Date.now() + tokenData.expires_in * 1000).toISOString()
            : null,
          token_type: tokenData.token_type,
        },
      })
      .eq('user_id', user_id)
      .eq('platform', platform);

    if (updateError) throw updateError;

    console.log(`Successfully connected ${platform} for user ${user_id}`);

    // Redirect back to the app
    const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
    const redirectUrl = supabaseUrl.replace('/functions/v1', '') + `/studio?connected=${platform}`;
    
    return new Response(null, {
      status: 302,
      headers: {
        ...corsHeaders,
        'Location': redirectUrl,
      },
    });

  } catch (error: any) {
    console.error('Error in social-oauth-callback:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'OAuth callback failed' }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
    );
  }
});
