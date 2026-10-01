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
    const { data } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!active) return;
      revision += 1;
      setUserId(session?.user.id ?? null);
      setResolved(true);
    });
    const requestRevision = revision;
    supabase.auth.getUser().then(({ data }) => {
      if (!active || requestRevision !== revision) return;
      setUserId(data.user?.id ?? null);
      setResolved(true);
    });
    return () => {
      active = false;
      data.subscription.unsubscribe();
    };
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
    return <Navigate to={signInPath(`${location.pathname}${location.search}`)} replace />;
  }
  return <>{children}</>;
};

export default RequireAuth;