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

    const { platform, postId, comment } = await req.json();

    console.log(`Commenting on ${platform} post ${postId} for user ${user.id}`);

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
        result = await commentOnInstagram(accessToken, postId, comment);
        break;
      case 'twitter':
        result = await commentOnTwitter(accessToken, postId, comment);
        break;
      case 'facebook':
        result = await commentOnFacebook(accessToken, postId, comment);
        break;
      case 'youtube':
        result = await commentOnYouTube(accessToken, postId, comment);
        break;
      case 'reddit':
        result = await commentOnReddit(accessToken, postId, comment);
        break;
      default:
        throw new Error(`Commenting not supported for ${platform}`);
    }

    return new Response(
      JSON.stringify({ success: true, result }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );

  } catch (error: any) {
    console.error('Error in comment-on-platform:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'Failed to comment' }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
    );
  }
});

async function commentOnInstagram(accessToken: string, postId: string, comment: string) {
  const response = await fetch(`https://graph.instagram.com/${postId}/comments`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      message: comment,
    }),
  });

  return await response.json();
}

async function commentOnTwitter(accessToken: string, tweetId: string, comment: string) {
  const response = await fetch(`https://api.twitter.com/2/tweets`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      text: comment,
      reply: {
        in_reply_to_tweet_id: tweetId,
      },
    }),
  });

  return await response.json();
}

async function commentOnFacebook(accessToken: string, postId: string, comment: string) {
  const response = await fetch(`https://graph.facebook.com/${postId}/comments`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      message: comment,
    }),
  });

  return await response.json();
}

async function commentOnYouTube(accessToken: string, videoId: string, comment: string) {
  const response = await fetch(`https://www.googleapis.com/youtube/v3/commentThreads`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      snippet: {
        videoId: videoId,
        topLevelComment: {
          snippet: {
            textOriginal: comment,
          },
        },
      },
    }),
  });

  return await response.json();
}

async function commentOnReddit(accessToken: string, postId: string, comment: string) {
  const response = await fetch(`https://oauth.reddit.com/api/comment`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      thing_id: postId,
      text: comment,
    }).toString(),
  });

  return await response.json();
}
