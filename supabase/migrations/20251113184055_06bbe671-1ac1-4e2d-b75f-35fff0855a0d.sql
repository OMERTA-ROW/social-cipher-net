-- Create SkyTech configuration tables
CREATE TABLE IF NOT EXISTS public.skytech_platform_configs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  platform_name TEXT NOT NULL UNIQUE,
  platform_type TEXT NOT NULL CHECK (platform_type IN ('social', 'affiliate', 'trading', 'streaming')),
  oauth_config JSONB,
  api_config JSONB,
  is_active BOOLEAN NOT NULL DEFAULT true,
  auto_enabled BOOLEAN NOT NULL DEFAULT false,
  icon_url TEXT,
  display_name TEXT NOT NULL,
  description TEXT,
  required_scopes TEXT[],
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.skytech_app_updates (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  update_type TEXT NOT NULL CHECK (update_type IN ('feature', 'integration', 'security', 'enhancement')),
  title TEXT NOT NULL,
  description TEXT,
  changes JSONB NOT NULL,
  version TEXT NOT NULL,
  is_applied BOOLEAN NOT NULL DEFAULT false,
  auto_apply BOOLEAN NOT NULL DEFAULT false,
  applied_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.skytech_affiliate_programs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  program_name TEXT NOT NULL UNIQUE,
  network_name TEXT,
  commission_rate DECIMAL(5,2),
  tracking_url TEXT,
  api_config JSONB,
  is_active BOOLEAN NOT NULL DEFAULT true,
  auto_enabled BOOLEAN NOT NULL DEFAULT false,
  logo_url TEXT,
  description TEXT,
  categories TEXT[],
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.skytech_platform_configs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.skytech_app_updates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.skytech_affiliate_programs ENABLE ROW LEVEL SECURITY;

-- Admin-only policies
CREATE POLICY "Only admins can manage platform configs"
  ON public.skytech_platform_configs
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "Only admins can manage app updates"
  ON public.skytech_app_updates
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "Only admins can manage affiliate programs"
  ON public.skytech_affiliate_programs
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

-- Everyone can view active configs
CREATE POLICY "Everyone can view active platform configs"
  ON public.skytech_platform_configs
  FOR SELECT
  USING (is_active = true);

CREATE POLICY "Everyone can view active affiliate programs"
  ON public.skytech_affiliate_programs
  FOR SELECT
  USING (is_active = true);

-- Triggers for updated_at
CREATE TRIGGER update_skytech_platform_configs_updated_at
  BEFORE UPDATE ON public.skytech_platform_configs
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_skytech_affiliate_programs_updated_at
  BEFORE UPDATE ON public.skytech_affiliate_programs
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Insert default social media platforms
INSERT INTO public.skytech_platform_configs (platform_name, platform_type, display_name, description, required_scopes, auto_enabled) VALUES
('instagram', 'social', 'Instagram', 'Share photos and stories', ARRAY['user_profile', 'user_media'], true),
('twitter', 'social', 'Twitter/X', 'Post tweets and engage', ARRAY['tweet.read', 'tweet.write', 'users.read'], true),
('youtube', 'social', 'YouTube', 'Upload videos and engage', ARRAY['youtube.upload', 'youtube.readonly'], true),
('tiktok', 'social', 'TikTok', 'Share short videos', ARRAY['user.info.basic', 'video.list', 'video.upload'], true),
('twitch', 'streaming', 'Twitch', 'Live streaming platform', ARRAY['user:read:email', 'channel:manage:broadcast'], true),
('facebook', 'social', 'Facebook', 'Connect with friends and pages', ARRAY['public_profile', 'pages_manage_posts'], true),
('linkedin', 'social', 'LinkedIn', 'Professional networking', ARRAY['r_liteprofile', 'w_member_social'], true),
('reddit', 'social', 'Reddit', 'Community discussions', ARRAY['identity', 'submit', 'read'], true)
ON CONFLICT (platform_name) DO NOTHING;