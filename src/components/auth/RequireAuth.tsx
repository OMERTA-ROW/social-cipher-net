import { useEffect, useState, type ReactNode } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { signInPath } from "@/lib/authRedirect";

export type AuthGateState = "checking" | "signed-in" | "signed-out";

export const authGateState = (resolved: boolean, userId: string | null): AuthGateState =>
  !resolved ? "checking" : userId ? "signed-in" : "signed-out";

const RequireAuth = ({ children }: { children: ReactNode }) => {
  const location = useLocation();
  const [resolved, setResolved] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    let revision = 0;
    const verify = async () => {
      const request = ++revision;
      let timer: ReturnType<typeof setTimeout> | undefined;
      try {
        const result = await Promise.race([
          supabase.auth.getUser(),
          new Promise<never>((_, reject) => { timer = setTimeout(() => reject(new Error("timeout")), 12000); }),
        ]);
        if (active && request === revision) {
          setUserId(result.error ? null : result.data.user?.id ?? null);
          setResolved(true);
        }
      } catch {
        if (active && request === revision) { setUserId(null); setResolved(true); }
      } finally {
        if (timer) clearTimeout(timer);
      }
    };
    const { data } = supabase.auth.onAuthStateChange((event) => {
      if (!active) return;
      if (event === "SIGNED_OUT") { revision++; setUserId(null); setResolved(true); }
      // Token refreshes re-verify silently; only a user change blanks the page.
      else if (event === "SIGNED_IN" || event === "USER_UPDATED") queueMicrotask(() => { if (active) void verify(); });
    });
    void verify();
    return () => { active = false; revision++; data.subscription.unsubscribe(); };
  }, []);

  const state = authGateState(resolved, userId);
  if (state === "checking") {
    return (
      <div className="flex min-h-screen items-center justify-center gap-2 text-sm text-muted-foreground">
        <Loader2 className="h-5 w-5 animate-spin text-primary" /> Restoring your account…
      </div>
    );
  }
  if (state === "signed-out") {
    const here = `${location.pathname}${location.search}`;
    return <Navigate to={location.pathname.startsWith("/cyber-arena") ? `/cyber-arena/login?next=${encodeURIComponent(here)}` : signInPath(here)} replace />;
  }
  return <>{children}</>;
};

export default RequireAuth;
