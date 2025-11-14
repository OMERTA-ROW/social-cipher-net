import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const LOVABLE_AI_URL = 'https://ai.gateway.lovable.dev/v1/chat/completions';

interface EcosystemTask {
  type: 'monitor' | 'enhance' | 'update' | 'protect' | 'analyze' | 'trends';
  priority: 'low' | 'medium' | 'high' | 'critical';
  data: any;
}

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

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY not configured');
    }

    const { action, task } = await req.json();

    console.log(`🤖 CyberLink AI Ecosystem: ${action}`);

    switch (action) {
      case 'self_monitor': {
        // Monitor system health, security, performance
        const systemMetrics = await gatherSystemMetrics(supabaseClient);
        const analysis = await analyzeWithAI(LOVABLE_API_KEY, {
          task: 'system_monitoring',
          metrics: systemMetrics,
          prompt: `Analyze this system health data and identify any issues, anomalies, or optimization opportunities:
          
          ${JSON.stringify(systemMetrics, null, 2)}
          
          Provide a comprehensive analysis with:
          1. Current system status (healthy/warning/critical)
          2. Identified issues or anomalies
          3. Performance metrics assessment
          4. Security concerns
          5. Recommended actions`
        });

        // Log monitoring results
        await logEcosystemEvent(supabaseClient, 'self_monitor', analysis, 'medium');

        return new Response(
          JSON.stringify({
            success: true,
            action: 'self_monitor',
            status: analysis.status || 'analyzed',
            analysis,
            timestamp: new Date().toISOString()
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      case 'self_enhance': {
        // Analyze patterns and suggest enhancements
        const usagePatterns = await analyzeUsagePatterns(supabaseClient);
        const enhancement = await analyzeWithAI(LOVABLE_API_KEY, {
          task: 'system_enhancement',
          patterns: usagePatterns,
          prompt: `Based on these usage patterns and system data, suggest specific enhancements to improve:
          
          ${JSON.stringify(usagePatterns, null, 2)}
          
          Provide:
          1. Top 5 enhancement opportunities
          2. Expected impact of each enhancement
          3. Implementation complexity (low/medium/high)
          4. Priority ranking
          5. Specific action items`
        });

        await logEcosystemEvent(supabaseClient, 'self_enhance', enhancement, 'high');

        return new Response(
          JSON.stringify({
            success: true,
            action: 'self_enhance',
            enhancements: enhancement,
            timestamp: new Date().toISOString()
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      case 'auto_update': {
        // Check for updates and apply them
        const currentVersion = await getCurrentVersion(supabaseClient);
        const updateCheck = await analyzeWithAI(LOVABLE_API_KEY, {
          task: 'update_assessment',
          currentVersion,
          prompt: `Analyze the current system version and determine if updates are needed:
          
          Current Version: ${JSON.stringify(currentVersion)}
          
          Assess:
          1. Security updates needed
          2. Feature updates available
          3. Bug fixes pending
          4. Performance improvements
          5. Update priority and risk level`
        });

        await logEcosystemEvent(supabaseClient, 'auto_update', updateCheck, 'high');

        return new Response(
          JSON.stringify({
            success: true,
            action: 'auto_update',
            updateAssessment: updateCheck,
            timestamp: new Date().toISOString()
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      case 'self_protect': {
        // Analyze threats and implement protections
        const threats = await detectThreats(supabaseClient);
        const protection = await analyzeWithAI(LOVABLE_API_KEY, {
          task: 'threat_protection',
          threats,
          prompt: `Analyze detected threats and recommend protection measures:
          
          ${JSON.stringify(threats, null, 2)}
          
          Provide:
          1. Threat severity assessment
          2. Immediate action items
          3. Long-term protection strategy
          4. Security recommendations
          5. Prevention measures`
        });

        await logEcosystemEvent(supabaseClient, 'self_protect', protection, 'critical');

        return new Response(
          JSON.stringify({
            success: true,
            action: 'self_protect',
            protection,
            timestamp: new Date().toISOString()
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      case 'viral_trends': {
        // Analyze viral trends across platforms
        const trendData = await gatherViralTrends(supabaseClient);
        const trendAnalysis = await analyzeWithAI(LOVABLE_API_KEY, {
          task: 'viral_trends_analysis',
          trends: trendData,
          prompt: `Analyze these viral trends and social media patterns:
          
          ${JSON.stringify(trendData, null, 2)}
          
          Provide comprehensive analysis including:
          1. Top trending topics and hashtags across all platforms
          2. YouTube algorithm insights and trending video patterns
          3. TikTok algorithm insights and viral content patterns
          4. Snapchat trends and engagement patterns
          5. Red Note (小红书) algorithm insights for Chinese market
          6. Facebook algorithm insights and engagement strategies
          7. Instagram algorithm insights and Reels optimization
          8. Twitch algorithm insights and live streaming strategies
          9. Celebrity algorithm insights - trending celebrities, mentions, and influence patterns
          10. Consistency algorithm insights - posting frequency, schedule reliability, engagement patterns
          11. Infinity Loop algorithm insights - content retention, scroll behavior, session optimization
          12. Cross-platform trend correlations
          13. Predicted upcoming trends by platform
          14. Content strategy recommendations per platform
          15. Optimal posting/streaming times and formats for each platform
          16. Viral potential score for current content
          17. Celebrity collaboration opportunities
          18. Consistency score and improvement recommendations
          19. Infinity loop optimization strategies
          20. Localization strategies for different markets
          21. Action items for maximizing reach globally`
        });

        await logEcosystemEvent(supabaseClient, 'viral_trends', trendAnalysis, 'high');

        return new Response(
          JSON.stringify({
            success: true,
            action: 'viral_trends',
            analysis: trendAnalysis,
            trendData,
            timestamp: new Date().toISOString()
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      case 'full_analysis': {
        // Comprehensive ecosystem analysis
        const fullReport = await generateFullReport(supabaseClient, LOVABLE_API_KEY);

        return new Response(
          JSON.stringify({
            success: true,
            action: 'full_analysis',
            report: fullReport,
            timestamp: new Date().toISOString()
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      default:
        return new Response(
          JSON.stringify({ error: 'Unknown action' }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
        );
    }
  } catch (error) {
    console.error('CyberLink AI Ecosystem error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});

async function analyzeWithAI(apiKey: string, data: any) {
  const response = await fetch(LOVABLE_AI_URL, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'google/gemini-2.5-flash',
      messages: [
        {
          role: 'system',
          content: 'You are CyberLink AI, an advanced AI ecosystem manager. Provide detailed, actionable analysis in JSON format.'
        },
        {
          role: 'user',
          content: data.prompt
        }
      ],
      temperature: 0.7,
      max_tokens: 2000
    })
  });

  if (!response.ok) {
    throw new Error(`AI analysis failed: ${response.status}`);
  }

  const result = await response.json();
  return result.choices[0].message.content;
}

async function gatherSystemMetrics(supabase: any) {
  const [users, posts, transactions, securityEvents] = await Promise.all([
    supabase.from('profiles').select('id', { count: 'exact', head: true }),
    supabase.from('posts').select('id', { count: 'exact', head: true }),
    supabase.from('wallet_transactions').select('id', { count: 'exact', head: true }),
    supabase.from('security_audit_log').select('*').gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()).limit(100)
  ]);

  return {
    totalUsers: users.count || 0,
    totalPosts: posts.count || 0,
    totalTransactions: transactions.count || 0,
    recentSecurityEvents: securityEvents.data?.length || 0,
    timestamp: new Date().toISOString()
  };
}

async function analyzeUsagePatterns(supabase: any) {
  const [recentPosts, recentTransactions, activeUsers] = await Promise.all([
    supabase.from('posts').select('*').gte('created_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()),
    supabase.from('wallet_transactions').select('*').gte('created_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()),
    supabase.from('profiles').select('id').gte('updated_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
  ]);

  return {
    weeklyPosts: recentPosts.data?.length || 0,
    weeklyTransactions: recentTransactions.data?.length || 0,
    dailyActiveUsers: activeUsers.data?.length || 0,
    timestamp: new Date().toISOString()
  };
}

async function detectThreats(supabase: any) {
  const criticalEvents = await supabase
    .from('security_audit_log')
    .select('*')
    .eq('severity', 'critical')
    .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString());

  return {
    criticalThreats: criticalEvents.data?.length || 0,
    threats: criticalEvents.data || [],
    timestamp: new Date().toISOString()
  };
}

async function getCurrentVersion(supabase: any) {
  return {
    version: '1.0.0',
    lastUpdate: new Date().toISOString(),
    features: ['mining', 'streaming', 'marketplace', 'ai_assistant']
  };
}

async function logEcosystemEvent(supabase: any, action: string, data: any, priority: string) {
  await supabase
    .from('security_audit_log')
    .insert({
      event_type: 'ai_ecosystem_' + action,
      metadata: {
        action,
        data,
        priority,
        ecosystem_version: '1.0.0',
        timestamp: new Date().toISOString()
      }
    });
}

async function gatherViralTrends(supabase: any) {
  // Gather trending content from posts and live streams
  const [trendingPosts, topHashtags, platformActivity, liveStreams] = await Promise.all([
    supabase
      .from('posts')
      .select('id, content, view_count, click_count, created_at, media_type')
      .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
      .order('view_count', { ascending: false })
      .limit(50),
    supabase
      .from('posts')
      .select('content')
      .gte('created_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString())
      .limit(500),
    supabase
      .from('platform_connections')
      .select('platform, metadata')
      .eq('is_active', true),
    supabase
      .from('live_streams')
      .select('id, title, viewer_count, is_live, started_at, ended_at')
      .gte('started_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
      .order('viewer_count', { ascending: false })
      .limit(30)
  ]);

  // Extract hashtags and analyze patterns
  const hashtagCounts: { [key: string]: number } = {};
  const celebrityMentions: { [key: string]: number } = {};
  
  if (topHashtags.data) {
    topHashtags.data.forEach((post: any) => {
      const hashtags = post.content.match(/#\w+/g) || [];
      hashtags.forEach((tag: string) => {
        hashtagCounts[tag] = (hashtagCounts[tag] || 0) + 1;
      });
      
      // Detect celebrity mentions (basic pattern matching for @mentions)
      const mentions = post.content.match(/@\w+/g) || [];
      mentions.forEach((mention: string) => {
        celebrityMentions[mention] = (celebrityMentions[mention] || 0) + 1;
      });
    });
  }

  const sortedHashtags = Object.entries(hashtagCounts)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 20)
    .map(([tag, count]) => ({ tag, count }));

  const topCelebrityMentions = Object.entries(celebrityMentions)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 15)
    .map(([mention, count]) => ({ mention, count }));

  // Analyze consistency patterns
  const postingDates = trendingPosts.data?.map((post: any) => new Date(post.created_at)) || [];
  const consistencyMetrics = analyzeConsistency(postingDates);

  // Analyze infinity loop engagement (posts + live streams)
  const infinityLoopMetrics = analyzeInfinityLoop(
    trendingPosts.data || [], 
    liveStreams.data || []
  );

  return {
    trendingContent: trendingPosts.data || [],
    liveStreams: liveStreams.data || [],
    topHashtags: sortedHashtags,
    platformActivity: platformActivity.data || [],
    celebrityTrends: {
      topMentions: topCelebrityMentions,
      totalCelebrityMentions: Object.keys(celebrityMentions).length,
    },
    consistencyAnalysis: consistencyMetrics,
    infinityLoopAnalysis: infinityLoopMetrics,
    metrics: {
      totalTrendingPosts: trendingPosts.data?.length || 0,
      totalLiveStreams: liveStreams.data?.length || 0,
      activeLiveStreams: liveStreams.data?.filter((s: any) => s.is_live).length || 0,
      uniqueHashtags: Object.keys(hashtagCounts).length,
      activePlatforms: platformActivity.data?.length || 0,
    },
    algorithms: {
      youtube: {
        focus: 'Watch time, CTR, engagement velocity, session time',
        recommendations: 'Long-form content, strong thumbnails, early engagement'
      },
      tiktok: {
        focus: 'Completion rate, re-watches, shares, comment velocity',
        recommendations: 'Hook in first 3s, trending sounds, duets enabled'
      },
      snapchat: {
        focus: 'Story completion, screenshot rate, chat replies',
        recommendations: 'Authentic content, behind-scenes, interactive elements'
      },
      rednote: {
        focus: 'Engagement rate, save rate, authentic lifestyle content, community interaction',
        recommendations: 'High-quality lifestyle photos, detailed captions, trending topics in Chinese market'
      },
      facebook: {
        focus: 'Meaningful interactions, watch time, shares, comment depth',
        recommendations: 'Conversation-starting content, groups engagement, video content, live streams'
      },
      instagram: {
        focus: 'Engagement rate, saves, shares, story completion, reels views',
        recommendations: 'Reels with trending audio, carousel posts, story interactions, consistent posting'
      },
      twitch: {
        focus: 'Average viewers, concurrent viewers, chat activity, subscription rate, bits/donations',
        recommendations: 'Consistent streaming schedule, interactive chat engagement, community building, raids and hosts'
      },
      celebrity: {
        focus: 'Celebrity mentions, influencer collaborations, brand partnerships, viral moments, trending celebrities',
        recommendations: 'Celebrity tie-ins, trending celebrity hashtags, influencer partnerships, celebrity-inspired content'
      },
      consistency: {
        focus: 'Posting frequency, schedule reliability, content cadence, audience expectation management',
        recommendations: 'Regular posting schedule, consistent content themes, predictable upload times, sustained engagement'
      },
      infinity_loop: {
        focus: 'Content retention, scroll depth, session duration, recommendation accuracy, auto-play engagement, next-content transition',
        recommendations: 'Hook within 3 seconds, seamless transitions, personalized recommendations, optimized content length, strategic cliffhangers'
      }
    },
    timestamp: new Date().toISOString()
  };
}

function analyzeInfinityLoop(posts: any[], liveStreams: any[] = []) {
  if (posts.length === 0 && liveStreams.length === 0) {
    return {
      score: 0,
      engagementRate: 0,
      averageRetention: 0,
      loopEfficiency: 'insufficient_data',
      recommendation: 'Need content data to analyze infinity loop performance',
      contentBreakdown: { posts: 0, liveStreams: 0, videos: 0, text: 0 }
    };
  }

  // Categorize posts by media type
  const videoPosts = posts.filter((p: any) => p.media_type === 'video');
  const textPosts = posts.filter((p: any) => !p.media_type || p.media_type === 'text');
  
  // Calculate engagement metrics for posts
  const totalViews = posts.reduce((sum, post) => sum + (post.view_count || 0), 0);
  const totalClicks = posts.reduce((sum, post) => sum + (post.click_count || 0), 0);
  
  // Calculate live stream engagement
  const totalStreamViews = liveStreams.reduce((sum, stream) => sum + (stream.viewer_count || 0), 0);
  const activeLiveStreams = liveStreams.filter((s: any) => s.is_live).length;
  
  // Calculate session duration for live streams (estimated)
  const avgStreamDuration = liveStreams
    .filter((s: any) => s.ended_at)
    .reduce((sum, s) => {
      const duration = new Date(s.ended_at).getTime() - new Date(s.started_at).getTime();
      return sum + duration / (1000 * 60); // minutes
    }, 0) / (liveStreams.filter((s: any) => s.ended_at).length || 1);
  
  // Combined engagement rate
  const totalEngagements = totalClicks + (totalStreamViews * 0.5); // Stream views count as 0.5 engagement
  const totalImpressions = totalViews + totalStreamViews;
  const engagementRate = totalImpressions > 0 ? (totalEngagements / totalImpressions) * 100 : 0;

  // Calculate average retention (views per content piece)
  const totalContent = posts.length + liveStreams.length;
  const avgViewsPerContent = totalImpressions / totalContent;

  // Estimate scroll depth and session continuation
  // Posts with high click rates indicate users are staying in the loop
  const highEngagementPosts = posts.filter(post => {
    const rate = (post.click_count || 0) / (post.view_count || 1);
    return rate > 0.1; // 10% engagement threshold
  });

  const loopEfficiency = (highEngagementPosts.length / posts.length) * 100;

  // Calculate infinity loop score (0-100)
  const score = Math.min(100, 
    (engagementRate * 0.4) + 
    (Math.min(loopEfficiency, 100) * 0.4) + 
    (Math.min((avgViewsPerContent / 100), 1) * 20)
  );

  let rating: string;
  let recommendation: string;

  if (score >= 80) {
    rating = 'viral_loop';
    recommendation = 'Excellent infinity loop! Content is keeping users engaged. Maintain hooks and transitions.';
  } else if (score >= 60) {
    rating = 'strong_loop';
    recommendation = 'Good engagement loop. Improve content hooks and optimize video length for better retention.';
  } else if (score >= 40) {
    rating = 'moderate_loop';
    recommendation = 'Average loop performance. Add stronger hooks, improve transitions, optimize for quick consumption.';
  } else {
    rating = 'weak_loop';
    recommendation = 'Loop needs improvement. Focus on: instant hooks, shorter content, seamless transitions, personalized recommendations.';
  }

  return {
    score: Math.round(score),
    engagementRate: Math.round(engagementRate * 100) / 100,
    averageRetention: Math.round(avgViewsPerContent),
    loopEfficiency: rating,
    recommendation,
    totalContent: totalContent,
    totalPosts: posts.length,
    totalLiveStreams: liveStreams.length,
    activeLiveStreams,
    totalViews,
    totalClicks,
    totalStreamViews,
    avgStreamDuration: Math.round(avgStreamDuration * 10) / 10,
    highEngagementPostsCount: highEngagementPosts.length,
    contentBreakdown: {
      posts: posts.length,
      liveStreams: liveStreams.length,
      videos: videoPosts.length,
      text: textPosts.length
    },
    insights: {
      hookEffectiveness: engagementRate > 5 ? 'strong' : engagementRate > 2 ? 'moderate' : 'weak',
      contentLength: 'Optimize for 15-60 second videos for maximum loop retention',
      transitionQuality: loopEfficiency > 50 ? 'smooth' : 'needs_work',
      recommendationAccuracy: 'Personalize content based on user behavior and preferences',
      liveStreamPerformance: activeLiveStreams > 0 ? 'engaging_live_audience' : 'consider_live_streaming',
      contentMixStrategy: 'Balance posts, videos, text, and live streams for optimal infinity loop'
    }
  };
}

function analyzeConsistency(dates: Date[]) {
  if (dates.length < 2) {
    return {
      score: 0,
      averageGapHours: 0,
      consistencyRating: 'insufficient_data',
      recommendation: 'Need more posts to analyze consistency'
    };
  }

  // Sort dates
  const sortedDates = dates.sort((a, b) => a.getTime() - b.getTime());
  
  // Calculate gaps between posts in hours
  const gaps: number[] = [];
  for (let i = 1; i < sortedDates.length; i++) {
    const gapMs = sortedDates[i].getTime() - sortedDates[i - 1].getTime();
    gaps.push(gapMs / (1000 * 60 * 60)); // Convert to hours
  }

  // Calculate average and standard deviation
  const avgGap = gaps.reduce((sum, gap) => sum + gap, 0) / gaps.length;
  const variance = gaps.reduce((sum, gap) => sum + Math.pow(gap - avgGap, 2), 0) / gaps.length;
  const stdDev = Math.sqrt(variance);
  
  // Calculate consistency score (0-100, higher is more consistent)
  const coefficientOfVariation = stdDev / avgGap;
  const score = Math.max(0, Math.min(100, 100 * (1 - coefficientOfVariation)));

  let rating: string;
  let recommendation: string;

  if (score >= 80) {
    rating = 'excellent';
    recommendation = 'Maintain your excellent posting schedule';
  } else if (score >= 60) {
    rating = 'good';
    recommendation = 'Try to reduce variation in posting times for better consistency';
  } else if (score >= 40) {
    rating = 'fair';
    recommendation = 'Establish a more regular posting schedule to improve engagement';
  } else {
    rating = 'needs_improvement';
    recommendation = 'Create and stick to a consistent posting schedule for better algorithm performance';
  }

  return {
    score: Math.round(score),
    averageGapHours: Math.round(avgGap * 10) / 10,
    consistencyRating: rating,
    recommendation,
    totalPosts: dates.length,
    timeSpanDays: Math.round((sortedDates[sortedDates.length - 1].getTime() - sortedDates[0].getTime()) / (1000 * 60 * 60 * 24))
  };
}

async function generateFullReport(supabase: any, apiKey: string) {
  const metrics = await gatherSystemMetrics(supabase);
  const patterns = await analyzeUsagePatterns(supabase);
  const threats = await detectThreats(supabase);
  const trends = await gatherViralTrends(supabase);

  const report = await analyzeWithAI(apiKey, {
    task: 'full_ecosystem_report',
    prompt: `Generate a comprehensive CyberLink AI Ecosystem report:
    
    System Metrics: ${JSON.stringify(metrics)}
    Usage Patterns: ${JSON.stringify(patterns)}
    Security Threats: ${JSON.stringify(threats)}
    Viral Trends: ${JSON.stringify(trends)}
    
    Provide a complete analysis covering:
    1. Executive Summary
    2. System Health Status
    3. Performance Analysis
    4. Security Assessment
    5. Viral Trends & Algorithm Insights
    6. Enhancement Opportunities
    7. Update Recommendations
    8. Protection Strategy
    9. Content Strategy Recommendations
    10. Action Items (prioritized)`
  });

  return report;
}
