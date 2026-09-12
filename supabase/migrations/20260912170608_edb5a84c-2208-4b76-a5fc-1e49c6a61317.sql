DROP VIEW IF EXISTS public.theater_events_public;

CREATE TABLE public.theater_event_catalog (
  id uuid PRIMARY KEY REFERENCES public.theater_events(id) ON DELETE CASCADE,
  host_id uuid NOT NULL,
  title text NOT NULL,
  description text,
  poster_url text,
  starts_at timestamptz NOT NULL,
  capacity integer,
  status text NOT NULL,
  is_live boolean NOT NULL,
  format text,
  is_open boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL,
  updated_at timestamptz NOT NULL
);
GRANT SELECT ON public.theater_event_catalog TO anon, authenticated;
GRANT ALL ON public.theater_event_catalog TO service_role;
ALTER TABLE public.theater_event_catalog ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Theater schedule is public"
ON public.theater_event_catalog FOR SELECT
TO anon, authenticated
USING (true);

INSERT INTO public.theater_event_catalog (
  id, host_id, title, description, poster_url, starts_at, capacity, status, is_live, format, is_open, created_at, updated_at
)
SELECT id, host_id, title, description, poster_url, starts_at, capacity, status, is_live, format, is_open, created_at, updated_at
FROM public.theater_events;

CREATE OR REPLACE FUNCTION public.sync_theater_event_catalog()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    DELETE FROM public.theater_event_catalog WHERE id = OLD.id;
    RETURN OLD;
  END IF;

  INSERT INTO public.theater_event_catalog (
    id, host_id, title, description, poster_url, starts_at, capacity, status, is_live, format, is_open, created_at, updated_at
  ) VALUES (
    NEW.id, NEW.host_id, NEW.title, NEW.description, NEW.poster_url, NEW.starts_at, NEW.capacity,
    NEW.status, NEW.is_live, NEW.format, NEW.is_open, NEW.created_at, NEW.updated_at
  )
  ON CONFLICT (id) DO UPDATE SET
    host_id = EXCLUDED.host_id,
    title = EXCLUDED.title,
    description = EXCLUDED.description,
    poster_url = EXCLUDED.poster_url,
    starts_at = EXCLUDED.starts_at,
    capacity = EXCLUDED.capacity,
    status = EXCLUDED.status,
    is_live = EXCLUDED.is_live,
    format = EXCLUDED.format,
    is_open = EXCLUDED.is_open,
    updated_at = EXCLUDED.updated_at;
  RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION public.sync_theater_event_catalog() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.sync_theater_event_catalog() TO service_role;

CREATE TRIGGER trg_sync_theater_event_catalog
AFTER INSERT OR UPDATE OR DELETE ON public.theater_events
FOR EACH ROW EXECUTE FUNCTION public.sync_theater_event_catalog();