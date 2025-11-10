-- Create profiles table with encryption support
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username TEXT UNIQUE,
  display_name TEXT,
  avatar_url TEXT,
  bio TEXT,
  is_private BOOLEAN DEFAULT false,
  two_factor_enabled BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Privacy policies - users can only see public profiles or their own
CREATE POLICY "Users can view public profiles"
ON public.profiles
FOR SELECT
USING (is_private = false OR auth.uid() = id);

-- Users can update their own profile
CREATE POLICY "Users can update own profile"
ON public.profiles
FOR UPDATE
USING (auth.uid() = id);

-- Users can insert their own profile
CREATE POLICY "Users can insert own profile"
ON public.profiles
FOR INSERT
WITH CHECK (auth.uid() = id);

-- Create security audit log
CREATE TABLE IF NOT EXISTS public.security_audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL,
  ip_address TEXT,
  user_agent TEXT,
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS on audit log
ALTER TABLE public.security_audit_log ENABLE ROW LEVEL SECURITY;

-- Users can only view their own audit logs
CREATE POLICY "Users can view own audit logs"
ON public.security_audit_log
FOR SELECT
USING (auth.uid() = user_id);

-- Admins can view all audit logs
CREATE POLICY "Admins can view all audit logs"
ON public.security_audit_log
FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));

-- Create privacy settings table
CREATE TABLE IF NOT EXISTS public.privacy_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  show_email BOOLEAN DEFAULT false,
  show_activity BOOLEAN DEFAULT true,
  allow_messages BOOLEAN DEFAULT true,
  allow_tags BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.privacy_settings ENABLE ROW LEVEL SECURITY;

-- Users can manage their own privacy settings
CREATE POLICY "Users can manage own privacy settings"
ON public.privacy_settings
FOR ALL
USING (auth.uid() = user_id);

-- Auto-create profile and privacy settings on user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, username, display_name)
  VALUES (
    NEW.id,
    NEW.raw_user_meta_data->>'username',
    NEW.raw_user_meta_data->>'display_name'
  );
  
  INSERT INTO public.privacy_settings (user_id)
  VALUES (NEW.id);
  
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- Add updated_at trigger for profiles
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Add updated_at trigger for privacy_settings
CREATE TRIGGER update_privacy_settings_updated_at
  BEFORE UPDATE ON public.privacy_settings
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();