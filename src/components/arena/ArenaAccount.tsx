import { useEffect, useState, type ReactNode } from 'react';
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import Auth from '@/pages/Auth';
import RequireAuth from '@/components/auth/RequireAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

type Player = { user_id: string; display_name: string; avatar_selection: string; created_at: string; last_login: string | null; arena_status: string };

const loadPlayer = async (): Promise<Player | null> => {
  const { data, error } = await supabase.rpc('ensure_arena_player');
  if (error || !Array.isArray(data) || !data[0]) return null;
  return data[0] as Player;
};

function PlayerGate({ children }: { children: ReactNode }) {
  const [player, setPlayer] = useState<Player | null>(null);
  const [error, setError] = useState('');
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    let active = true;
    setError('');
    loadPlayer().then((p) => {
      if (!active) return;
      if (!p) setError('Your player account could not be loaded. Please try again.');
      else setPlayer(p);
    }).catch(() => { if (active) setError('Network error. Please try again.'); });
    return () => { active = false; };
  }, [attempt]);
  if (error) return <main className="p-6"><p role="alert">{error}</p><Button onClick={() => setAttempt(v => v + 1)}>Retry</Button></main>;
  if (!player) return <p role="status" className="p-6">Loading your player account…</p>;
  if (player.arena_status === 'suspended') return <p role="alert" className="p-6">Arena access is unavailable for this account.</p>;
  return <>{children}</>;
}

export function ArenaGate({ children }: { children: ReactNode }) {
  return <RequireAuth><PlayerGate>{children}</PlayerGate></RequireAuth>;
}

export function ArenaEntry() {
  return <RequireAuth><Navigate to="/cyber-arena/lobby" replace /></RequireAuth>;
}

export function ArenaAccountLinks() {
  const navigate = useNavigate();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const logout = async () => {
    setBusy(true); setError('');
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      navigate('/cyber-arena/login', { replace: true });
    } catch { setError('Logout failed. Please try again.'); }
    finally { setBusy(false); }
  };
  return <div className="flex flex-wrap items-center gap-2">
    <Button asChild size="sm" variant="outline"><Link to="/cyber-arena/profile">Player profile</Link></Button>
    <Button asChild size="sm" variant="outline"><Link to="/integrations">Account integrations</Link></Button>
    <Button size="sm" variant="outline" onClick={logout} disabled={busy}>{busy ? 'Signing out…' : 'Log out'}</Button>
    {error && <p role="alert">{error}</p>}
  </div>;
}

export function ArenaProfile() {
  const [player, setPlayer] = useState<Player | null>(null);
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const location = useLocation();
  useEffect(() => {
    let active = true;
    loadPlayer().then((p) => {
      if (!active) return;
      if (!p) setMessage('Profile could not be loaded. Refresh to try again.');
      else setPlayer(p);
    }).catch(() => { if (active) setMessage('Profile could not be loaded. Refresh to try again.'); });
    return () => { active = false; };
  }, []);
  // No URL parameter supplies an identity. Every read/write uses the auth user.
  if (location.search) return <Navigate to="/cyber-arena/profile" replace />;
  return <main className="mx-auto max-w-lg space-y-4 p-6">
    <h1 className="text-2xl font-bold">Arena player profile</h1>
    <ArenaAccountLinks />
    <Link to="/cyber-arena/lobby" className="text-primary underline">Back to lobby</Link>
    {message && <p role="status">{message}</p>}
    {player && <form className="space-y-4" onSubmit={async e => {
      e.preventDefault();
      const name = player.display_name.trim();
      if (!name) { setMessage('Display name is required.'); return; }
      setBusy(true); setMessage('');
      try {
        const { data: { user }, error: authError } = await supabase.auth.getUser();
        if (authError || !user || user.id !== player.user_id) throw new Error();
        const { data, error } = await supabase.from('arena_players').update({ display_name: name, avatar_selection: player.avatar_selection }).eq('user_id', user.id).select('user_id').single();
        if (error || !data) throw new Error();
        setMessage('Player profile saved.');
      } catch { setMessage('Could not save your profile. Please try again.'); }
      finally { setBusy(false); }
    }}>
      <Label htmlFor="arena-name">Display name</Label>
      <Input id="arena-name" value={player.display_name} minLength={1} maxLength={60} required onChange={e => setPlayer({ ...player, display_name: e.target.value })} />
      <Label htmlFor="arena-avatar">Avatar</Label>
      <select id="arena-avatar" className="w-full rounded border bg-background p-2" value={player.avatar_selection} onChange={e => setPlayer({ ...player, avatar_selection: e.target.value })}>
        <option value="pilot">Pilot</option><option value="explorer">Explorer</option><option value="engineer">Engineer</option>
      </select>
      <p className="text-sm">Member since {new Date(player.created_at).toLocaleDateString()}</p>
      <Button type="submit" disabled={busy}>{busy ? 'Saving…' : 'Save profile'}</Button>
    </form>}
  </main>;
}

export function ArenaReset() {
  const location = useLocation();
  const code = new URLSearchParams(location.search).get('code');
  if (code) return <Navigate to={`/auth/callback?type=recovery&next=${encodeURIComponent('/cyber-arena/reset-password')}&code=${encodeURIComponent(code)}`} replace />;
  return <Auth arena />;
}
