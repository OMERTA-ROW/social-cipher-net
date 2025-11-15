-- Add metadata column to store AI-generated viewpoint parameters
ALTER TABLE public.favorite_pov_views 
ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}'::jsonb;

-- Add index for faster metadata queries
CREATE INDEX IF NOT EXISTS idx_favorite_pov_metadata 
ON public.favorite_pov_views USING GIN(metadata);

-- Add comment for documentation
COMMENT ON COLUMN public.favorite_pov_views.metadata IS 'Stores AI-generated viewpoint parameters: camera position, effects, multiverse algorithms';