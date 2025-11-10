-- Create platform connections table
CREATE TABLE IF NOT EXISTS public.platform_connections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  platform TEXT NOT NULL,
  platform_user_id TEXT,
  platform_username TEXT,
  access_token TEXT,
  refresh_token TEXT,
  token_expires_at TIMESTAMPTZ,
  is_active BOOLEAN DEFAULT true,
  stream_key TEXT,
  rtmp_url TEXT,
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, platform)
);

-- Enable RLS
ALTER TABLE public.platform_connections ENABLE ROW LEVEL SECURITY;

-- Users can manage their own connections
CREATE POLICY "Users can manage own platform connections"
ON public.platform_connections
FOR ALL
USING (auth.uid() = user_id);

-- Create live streams table
CREATE TABLE IF NOT EXISTS public.live_streams (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  category TEXT,
  thumbnail_url TEXT,
  is_live BOOLEAN DEFAULT false,
  viewer_count INTEGER DEFAULT 0,
  started_at TIMESTAMPTZ,
  ended_at TIMESTAMPTZ,
  platforms TEXT[] DEFAULT '{}',
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.live_streams ENABLE ROW LEVEL SECURITY;

-- Users can view all live streams
CREATE POLICY "Anyone can view live streams"
ON public.live_streams
FOR SELECT
USING (is_live = true);

-- Users can manage their own streams
CREATE POLICY "Users can manage own streams"
ON public.live_streams
FOR ALL
USING (auth.uid() = user_id);

-- Create chat messages table for unified chat
CREATE TABLE IF NOT EXISTS public.stream_chat_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  stream_id UUID REFERENCES public.live_streams(id) ON DELETE CASCADE,
  platform TEXT NOT NULL,
  platform_message_id TEXT,
  username TEXT NOT NULL,
  message TEXT NOT NULL,
  user_avatar TEXT,
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.stream_chat_messages ENABLE ROW LEVEL SECURITY;

-- Anyone can view chat messages for live streams
CREATE POLICY "Anyone can view stream chat"
ON public.stream_chat_messages
FOR SELECT
USING (true);

-- Enable realtime for chat
ALTER PUBLICATION supabase_realtime ADD TABLE public.stream_chat_messages;

-- Add updated_at triggers
CREATE TRIGGER update_platform_connections_updated_at
  BEFORE UPDATE ON public.platform_connections
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_live_streams_updated_at
  BEFORE UPDATE ON public.live_streams
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();