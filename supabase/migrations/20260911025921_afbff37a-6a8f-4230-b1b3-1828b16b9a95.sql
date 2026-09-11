CREATE TABLE IF NOT EXISTS public.stream_ingest (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users ON DELETE CASCADE UNIQUE,
  stream_key TEXT NOT NULL UNIQUE,
  status TEXT NOT NULL DEFAULT 'offline',
  last_source TEXT,
  last_seen_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT ON public.stream_ingest TO authenticated;
GRANT ALL ON public.stream_ingest TO service_role;
ALTER TABLE public.stream_ingest ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own ingest settings" ON public.stream_ingest;
CREATE POLICY "Users can view their own ingest settings"
ON public.stream_ingest FOR SELECT TO authenticated
USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS stream_ingest_key_idx ON public.stream_ingest (stream_key);

DROP TRIGGER IF EXISTS update_stream_ingest_updated_at ON public.stream_ingest;
CREATE TRIGGER update_stream_ingest_updated_at
BEFORE UPDATE ON public.stream_ingest
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();