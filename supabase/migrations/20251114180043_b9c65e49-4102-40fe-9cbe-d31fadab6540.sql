-- Add admin and moderation fields to live_stream_participants
ALTER TABLE public.live_stream_participants
ADD COLUMN is_admin BOOLEAN DEFAULT false,
ADD COLUMN is_muted BOOLEAN DEFAULT false,
ADD COLUMN is_blocked BOOLEAN DEFAULT false,
ADD COLUMN muted_by UUID REFERENCES auth.users(id),
ADD COLUMN blocked_by UUID REFERENCES auth.users(id),
ADD COLUMN muted_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN blocked_at TIMESTAMP WITH TIME ZONE;

-- Create index for faster admin queries
CREATE INDEX idx_stream_participants_admin ON public.live_stream_participants(stream_id, is_admin) WHERE is_admin = true;
CREATE INDEX idx_stream_participants_blocked ON public.live_stream_participants(stream_id, is_blocked) WHERE is_blocked = true;

-- Create security definer function to check if user is admin of a stream
CREATE OR REPLACE FUNCTION public.is_stream_admin(_user_id uuid, _stream_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM live_stream_participants
    WHERE stream_id = _stream_id
      AND user_id = _user_id
      AND (is_admin = true OR is_host = true)
      AND is_active = true
  )
$$;

-- Update RLS policy to allow admins to manage participants
DROP POLICY IF EXISTS "Users can update their own participation" ON public.live_stream_participants;

CREATE POLICY "Users can update their own participation" 
ON public.live_stream_participants
FOR UPDATE
USING (
  auth.uid() = user_id 
  OR is_stream_admin(auth.uid(), stream_id)
);

-- Add policy to allow admins to view all participants including blocked ones
CREATE POLICY "Admins can view all participants"
ON public.live_stream_participants
FOR SELECT
USING (
  is_stream_admin(auth.uid(), stream_id)
  OR (is_blocked = false AND is_active = true)
);

-- Update existing view policy
DROP POLICY IF EXISTS "Users can view participants of public streams" ON public.live_stream_participants;

-- Comment on columns for documentation
COMMENT ON COLUMN public.live_stream_participants.is_admin IS 'Whether the participant has admin privileges in the stream';
COMMENT ON COLUMN public.live_stream_participants.is_muted IS 'Whether the participant is muted (cannot send audio)';
COMMENT ON COLUMN public.live_stream_participants.is_blocked IS 'Whether the participant is blocked from the stream';
COMMENT ON COLUMN public.live_stream_participants.muted_by IS 'User ID of the admin who muted this participant';
COMMENT ON COLUMN public.live_stream_participants.blocked_by IS 'User ID of the admin who blocked this participant';