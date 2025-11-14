-- Create security definer function to check if user is admin of a stream (if not exists)
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

-- Drop existing policies
DROP POLICY IF EXISTS "Users can update their own participation" ON public.live_stream_participants;
DROP POLICY IF EXISTS "Admins can view all participants" ON public.live_stream_participants;
DROP POLICY IF EXISTS "Users can view participants of public streams" ON public.live_stream_participants;

-- Create updated policies
CREATE POLICY "Users and admins can update participation" 
ON public.live_stream_participants
FOR UPDATE
USING (
  auth.uid() = user_id 
  OR is_stream_admin(auth.uid(), stream_id)
);

CREATE POLICY "Everyone can view active participants"
ON public.live_stream_participants
FOR SELECT
USING (
  is_active = true OR is_stream_admin(auth.uid(), stream_id)
);