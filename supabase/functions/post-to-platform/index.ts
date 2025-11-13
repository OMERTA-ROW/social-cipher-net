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

    const { platform, content, mediaUrl } = await req.json();

    console.log(`Posting to ${platform} for user ${user.id}`);

    // Get platform connection
    const { data: connection, error: connError } = await supabaseClient
      .from('platform_connections')
      .select('*')
      .eq('user_id', user.id)
      .eq('platform', platform)
      .eq('is_active', true)
      .single();

    if (connError || !connection) {
      throw new Error('Platform not connected');
    }

    const accessToken = connection.metadata.access_token;
    let result;

    switch (platform) {
      case 'instagram':
        result = await postToInstagram(accessToken, content, mediaUrl);
        break;
      case 'twitter':
        result = await postToTwitter(accessToken, content, mediaUrl);
        break;
      case 'facebook':
        result = await postToFacebook(accessToken, content);
        break;
      case 'linkedin':
        result = await postToLinkedIn(accessToken, content);
        break;
      case 'reddit':
        result = await postToReddit(accessToken, content);
        break;
      case 'tiktok':
        result = await postToTikTok(accessToken, content, mediaUrl);
        break;
      default:
        throw new Error(`Posting not supported for ${platform}`);
    }

    return new Response(
      JSON.stringify({ success: true, result }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );

  } catch (error: any) {
    console.error('Error in post-to-platform:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'Failed to post' }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
    );
  }
});

async function postToInstagram(accessToken: string, content: string, mediaUrl?: string) {
  // Instagram requires media for posts
  if (!mediaUrl) {
    throw new Error('Instagram posts require media');
  }

  const response = await fetch(`https://graph.instagram.com/me/media`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      image_url: mediaUrl,
      caption: content,
    }),
  });

  return await response.json();
}

async function postToTwitter(accessToken: string, content: string, mediaUrl?: string) {
  const response = await fetch(`https://api.twitter.com/2/tweets`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      text: content,
    }),
  });

  return await response.json();
}

async function postToFacebook(accessToken: string, content: string) {
  const response = await fetch(`https://graph.facebook.com/me/feed`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      message: content,
    }),
  });

  return await response.json();
}

async function postToLinkedIn(accessToken: string, content: string) {
  const response = await fetch(`https://api.linkedin.com/v2/ugcPosts`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      author: 'urn:li:person:AUTHOR_ID',
      lifecycleState: 'PUBLISHED',
      specificContent: {
        'com.linkedin.ugc.ShareContent': {
          shareCommentary: {
            text: content,
          },
          shareMediaCategory: 'NONE',
        },
      },
      visibility: {
        'com.linkedin.ugc.MemberNetworkVisibility': 'PUBLIC',
      },
    }),
  });

  return await response.json();
}

async function postToReddit(accessToken: string, content: string) {
  const response = await fetch(`https://oauth.reddit.com/api/submit`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      sr: 'test',
      kind: 'self',
      title: content.substring(0, 100),
      text: content,
    }).toString(),
  });

  return await response.json();
}

async function postToTikTok(accessToken: string, content: string, mediaUrl?: string) {
  // TikTok posting requires video upload workflow
  throw new Error('TikTok posting requires video upload - not yet implemented');
}
