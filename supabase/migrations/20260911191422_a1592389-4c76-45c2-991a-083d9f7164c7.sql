
REVOKE ALL ON FUNCTION public.log_security_event(uuid, text, text, jsonb) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.guard_owner_column() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.enforce_participant_privileges() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.is_stream_owner(uuid, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_stream_owner(uuid, uuid) TO authenticated;
