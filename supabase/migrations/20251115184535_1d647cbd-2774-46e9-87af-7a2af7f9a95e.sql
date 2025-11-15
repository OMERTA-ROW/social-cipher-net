-- Create table for favorite POV views
CREATE TABLE public.favorite_pov_views (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  pov_index INTEGER NOT NULL,
  pov_name TEXT NOT NULL,
  custom_name TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  CONSTRAINT favorite_pov_views_user_id_fkey FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE CASCADE
);

-- Enable Row Level Security
ALTER TABLE public.favorite_pov_views ENABLE ROW LEVEL SECURITY;

-- Create policies for user access
CREATE POLICY "Users can view their own favorite POVs" 
ON public.favorite_pov_views 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own favorite POVs" 
ON public.favorite_pov_views 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own favorite POVs" 
ON public.favorite_pov_views 
FOR DELETE 
USING (auth.uid() = user_id);

-- Create index for faster queries
CREATE INDEX idx_favorite_pov_views_user_id ON public.favorite_pov_views(user_id);