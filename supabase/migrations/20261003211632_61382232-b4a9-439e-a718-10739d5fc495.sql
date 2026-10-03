CREATE TABLE IF NOT EXISTS public.arena_players (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name text NOT NULL DEFAULT 'Player' CHECK (char_length(display_name) BETWEEN 1 AND 60),
  avatar_selection text NOT NULL DEFAULT 'pilot' CHECK (avatar_selection IN ('pilot','explorer','engineer')),
  created_at timestamptz NOT NULL DEFAULT now(),
  last_login timestamptz,
  arena_status text NOT NULL DEFAULT 'member' CHECK (arena_status IN ('member','suspended'))
);
REVOKE ALL ON public.arena_players FROM anon, authenticated;
GRANT SELECT ON public.arena_players TO authenticated;
GRANT UPDATE(display_name, avatar_selection) ON public.arena_players TO authenticated;
GRANT ALL ON public.arena_players TO service_role;
ALTER TABLE public.arena_players ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS arena_players_read_own ON public.arena_players;
CREATE POLICY arena_players_read_own ON public.arena_players FOR SELECT TO authenticated USING (user_id = auth.uid());
DROP POLICY IF EXISTS arena_players_update_own ON public.arena_players;
CREATE POLICY arena_players_update_own ON public.arena_players FOR UPDATE TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
REVOKE ALL ON FUNCTION public.ensure_arena_player() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.ensure_arena_player() TO authenticated;
REVOKE ALL ON FUNCTION public.create_arena_player_on_signup() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON public.platform_connections FROM anon, authenticated;