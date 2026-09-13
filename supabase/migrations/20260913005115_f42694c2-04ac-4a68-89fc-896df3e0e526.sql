CREATE OR REPLACE FUNCTION public.start_dm_thread(_peer uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _me uuid := auth.uid();
  _thread uuid;
BEGIN
  IF _me IS NULL THEN
    RAISE EXCEPTION 'Sign in first';
  END IF;
  IF _peer IS NULL OR _peer = _me THEN
    RAISE EXCEPTION 'Choose someone else to message';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE id = _peer) THEN
    RAISE EXCEPTION 'That account does not exist';
  END IF;
  IF public.is_blocked(_me, _peer) THEN
    RAISE EXCEPTION 'You cannot message this account';
  END IF;

  SELECT p1.thread_id INTO _thread
  FROM public.dm_participants p1
  JOIN public.dm_participants p2 ON p2.thread_id = p1.thread_id AND p2.user_id = _peer
  WHERE p1.user_id = _me
  LIMIT 1;

  IF _thread IS NOT NULL THEN
    RETURN _thread;
  END IF;

  INSERT INTO public.dm_threads (created_by, source_platform)
  VALUES (_me, 'cyberlink')
  RETURNING id INTO _thread;

  INSERT INTO public.dm_participants (thread_id, user_id)
  VALUES (_thread, _me), (_thread, _peer);

  RETURN _thread;
END;
$$;

REVOKE ALL ON FUNCTION public.start_dm_thread(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.start_dm_thread(uuid) TO authenticated;