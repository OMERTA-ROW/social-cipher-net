-- Create gifts catalog table
CREATE TABLE IF NOT EXISTS public.gifts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  price DECIMAL(10,2) NOT NULL,
  icon_url TEXT,
  animation_type TEXT NOT NULL DEFAULT 'float',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create stream gifts table for tracking gifts sent during streams
CREATE TABLE IF NOT EXISTS public.stream_gifts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  stream_id UUID NOT NULL REFERENCES public.live_streams(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL,
  receiver_id UUID NOT NULL,
  gift_id UUID NOT NULL REFERENCES public.gifts(id),
  message TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.gifts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stream_gifts ENABLE ROW LEVEL SECURITY;

-- Gifts are viewable by everyone
CREATE POLICY "Gifts are viewable by everyone"
  ON public.gifts FOR SELECT
  USING (true);

-- Stream gifts are viewable by everyone
CREATE POLICY "Stream gifts are viewable by everyone"
  ON public.stream_gifts FOR SELECT
  USING (true);

-- Authenticated users can send gifts
CREATE POLICY "Authenticated users can send gifts"
  ON public.stream_gifts FOR INSERT
  WITH CHECK (auth.uid() = sender_id);

-- Add some default gifts
INSERT INTO public.gifts (name, description, price, icon_url, animation_type) VALUES
  ('Heart', 'Send some love', 0.99, '❤️', 'float'),
  ('Star', 'You''re a star!', 1.99, '⭐', 'sparkle'),
  ('Fire', 'That''s fire!', 2.99, '🔥', 'flame'),
  ('Diamond', 'Premium gift', 4.99, '💎', 'shine'),
  ('Crown', 'Royal treatment', 9.99, '👑', 'royal'),
  ('Rocket', 'To the moon!', 14.99, '🚀', 'launch');

-- Enable realtime for stream_gifts
ALTER PUBLICATION supabase_realtime ADD TABLE public.stream_gifts;