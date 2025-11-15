import { useState, useEffect, useRef } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Heart, MessageCircle, Share2, BadgeCheck, X, Volume2, VolumeX } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import StoryRing from "@/components/StoryRing";

interface ContentItem {
  id: string;
  type: 'video_post' | 'live_stream';
  user_id: string;
  content?: string;
  title?: string;
  media_url?: string;
  view_count: number;
  created_at: string;
  profiles: {
    display_name: string | null;
    username: string | null;
    is_verified: boolean;
    avatar_url: string | null;
  };
  viewer_count?: number;
  is_live?: boolean;
}

interface InfinityScrollFeedProps {
  onClose: () => void;
  initialVideoId?: string;
}

export const InfinityScrollFeed = ({ onClose, initialVideoId }: InfinityScrollFeedProps) => {
  const [items, setItems] = useState<ContentItem[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [isMuted, setIsMuted] = useState(false);
  const [lastClickTime, setLastClickTime] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    fetchContent();
  }, []);

  useEffect(() => {
    // Track view when video changes
    if (items.length > 0 && items[currentIndex]) {
      trackView(items[currentIndex]);
    }
  }, [currentIndex, items]);

  useEffect(() => {
    // Auto-play video when it changes
    if (videoRef.current) {
      videoRef.current.play().catch(err => console.log('Autoplay prevented:', err));
    }
  }, [currentIndex]);

  const fetchContent = async () => {
    try {
      // Fetch video posts
      const { data: videoPosts, error: postsError } = await supabase
        .from('posts')
        .select(`
          id,
          user_id,
          content,
          view_count,
          created_at,
          profiles!posts_user_id_fkey(display_name, username, is_verified, avatar_url),
          post_media(media_url, media_type)
        `)
        .eq('post_media.media_type', 'video')
        .order('created_at', { ascending: false })
        .limit(20);

      // Fetch live streams
      const { data: liveStreams, error: streamsError } = await supabase
        .from('live_streams')
        .select('*')
        .eq('is_live', true)
        .order('viewer_count', { ascending: false })
        .limit(10);

      if (postsError || streamsError) {
        throw postsError || streamsError;
      }

      // Fetch profiles for live streams
      const streamUserIds = (liveStreams || []).map(s => s.user_id);
      const { data: streamProfiles } = await supabase
        .from('profiles')
        .select('id, display_name, username, is_verified, avatar_url')
        .in('id', streamUserIds);

      const profilesMap = new Map(
        (streamProfiles || []).map(p => [p.id, p])
      );

      // Combine and format content
      const videoItems: ContentItem[] = (videoPosts || [])
        .filter(post => post.post_media && post.post_media.length > 0)
        .map(post => ({
          id: post.id,
          type: 'video_post' as const,
          user_id: post.user_id,
          content: post.content,
          media_url: post.post_media[0].media_url,
          view_count: post.view_count || 0,
          created_at: post.created_at,
          profiles: post.profiles
        }));

      const streamItems: ContentItem[] = (liveStreams || []).map(stream => {
        const profile = profilesMap.get(stream.user_id) || {
          display_name: null,
          username: null,
          is_verified: false,
          avatar_url: null
        };
        
        return {
          id: stream.id,
          type: 'live_stream' as const,
          user_id: stream.user_id,
          title: stream.title,
          viewer_count: stream.viewer_count || 0,
          view_count: stream.viewer_count || 0,
          is_live: stream.is_live,
          created_at: stream.created_at,
          profiles: profile
        };
      });

      // Interleave videos and live streams for variety
      const combined = [...streamItems, ...videoItems];
      setItems(combined);

      // Find initial video index if specified
      if (initialVideoId) {
        const index = combined.findIndex(item => item.id === initialVideoId);
        if (index !== -1) {
          setCurrentIndex(index);
        }
      }
    } catch (error) {
      console.error('Error fetching content:', error);
      toast.error('Failed to load content');
    } finally {
      setIsLoading(false);
    }
  };

  const trackView = async (item: ContentItem) => {
    if (item.type === 'video_post') {
      await supabase.from('post_views').insert({
        post_id: item.id,
        ip_address: 'infinity_scroll'
      });
    }
  };

  const handleScroll = (direction: 'up' | 'down') => {
    if (direction === 'down' && currentIndex < items.length - 1) {
      setCurrentIndex(prev => prev + 1);
    } else if (direction === 'up' && currentIndex > 0) {
      setCurrentIndex(prev => prev - 1);
    }
  };

  const handleDoubleClickBack = () => {
    const now = Date.now();
    if (now - lastClickTime < 500) {
      // Double click detected
      onClose();
    }
    setLastClickTime(now);
  };

  const handleWheel = (e: React.WheelEvent) => {
    if (Math.abs(e.deltaY) > 50) {
      if (e.deltaY > 0) {
        handleScroll('down');
      } else {
        handleScroll('up');
      }
    }
  };

  if (isLoading) {
    return (
      <div className="fixed inset-0 bg-black z-50 flex items-center justify-center">
        <div className="text-white">Loading content...</div>
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="fixed inset-0 bg-black z-50 flex items-center justify-center">
        <div className="text-white text-center">
          <p className="mb-4">No videos or live streams available</p>
          <Button onClick={onClose}>Close</Button>
        </div>
      </div>
    );
  }

  const currentItem = items[currentIndex];

  return (
    <div 
      ref={containerRef}
      className="fixed inset-0 bg-black z-50 overflow-hidden"
      onWheel={handleWheel}
      onClick={handleDoubleClickBack}
    >
      {/* Close button */}
      <Button
        variant="ghost"
        size="icon"
        className="absolute top-4 right-4 z-50 text-white hover:bg-white/20"
        onClick={(e) => {
          e.stopPropagation();
          onClose();
        }}
      >
        <X className="w-6 h-6" />
      </Button>

      {/* Mute/Unmute button */}
      <Button
        variant="ghost"
        size="icon"
        className="absolute top-4 right-16 z-50 text-white hover:bg-white/20"
        onClick={(e) => {
          e.stopPropagation();
          setIsMuted(!isMuted);
        }}
      >
        {isMuted ? <VolumeX className="w-6 h-6" /> : <Volume2 className="w-6 h-6" />}
      </Button>

      {/* Navigation hint */}
      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-50 text-white/60 text-sm">
        Scroll or swipe • Double-click to exit
      </div>

      {/* Content container */}
      <div className="h-full w-full flex items-center justify-center relative">
        {currentItem.type === 'video_post' && currentItem.media_url ? (
          <video
            ref={videoRef}
            src={currentItem.media_url}
            className="max-h-full max-w-full object-contain"
            loop
            muted={isMuted}
            playsInline
            autoPlay
          />
        ) : currentItem.type === 'live_stream' ? (
          <div className="text-center text-white">
            <div className="inline-flex items-center gap-2 bg-red-600 px-4 py-2 rounded-full mb-4">
              <div className="w-3 h-3 bg-white rounded-full animate-pulse" />
              <span className="font-bold">LIVE</span>
            </div>
            <h2 className="text-2xl font-bold mb-2">{currentItem.title}</h2>
            <p className="text-white/70">{currentItem.viewer_count} viewers</p>
            <Button className="mt-6" onClick={(e) => {
              e.stopPropagation();
              window.open(`/studio?stream=${currentItem.id}`, '_blank');
            }}>
              Join Stream
            </Button>
          </div>
        ) : null}

        {/* User info overlay */}
        <div className="absolute bottom-20 left-4 right-20 z-40">
          <div className="flex items-center gap-3 mb-3">
            <div className="relative">
              {currentItem.profiles?.avatar_url ? (
                <img
                  src={currentItem.profiles.avatar_url}
                  alt={currentItem.profiles.display_name || 'User'}
                  className="w-12 h-12 rounded-full"
                />
              ) : (
                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-primary to-purple-500" />
              )}
              <StoryRing 
                hasStory={false}
                author={currentItem.profiles?.display_name || currentItem.profiles?.username || 'Anonymous'}
              />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-white font-bold">
                  {currentItem.profiles?.display_name || currentItem.profiles?.username || 'Anonymous'}
                </span>
                {currentItem.profiles?.is_verified && (
                  <BadgeCheck className="w-4 h-4 text-blue-500 fill-current" />
                )}
              </div>
              {currentItem.type === 'live_stream' && (
                <span className="text-white/70 text-sm">{currentItem.viewer_count} watching</span>
              )}
            </div>
          </div>
          {currentItem.content && (
            <p className="text-white text-sm mb-2">{currentItem.content}</p>
          )}
        </div>

        {/* Interaction sidebar */}
        <div className="absolute right-4 bottom-32 z-40 flex flex-col gap-4">
          <button
            className="flex flex-col items-center gap-1 text-white"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="w-12 h-12 rounded-full bg-white/10 flex items-center justify-center hover:bg-white/20 transition-colors">
              <Heart className="w-6 h-6" />
            </div>
            <span className="text-xs">{currentItem.view_count}</span>
          </button>
          <button
            className="flex flex-col items-center gap-1 text-white"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="w-12 h-12 rounded-full bg-white/10 flex items-center justify-center hover:bg-white/20 transition-colors">
              <MessageCircle className="w-6 h-6" />
            </div>
            <span className="text-xs">0</span>
          </button>
          <button
            className="flex flex-col items-center gap-1 text-white"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="w-12 h-12 rounded-full bg-white/10 flex items-center justify-center hover:bg-white/20 transition-colors">
              <Share2 className="w-6 h-6" />
            </div>
            <span className="text-xs">Share</span>
          </button>
        </div>

        {/* Progress indicator */}
        <div className="absolute top-4 left-4 z-40 text-white/70 text-sm">
          {currentIndex + 1} / {items.length}
        </div>
      </div>
    </div>
  );
};
