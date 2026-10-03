import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { safeReturnPath } from "@/lib/authRedirect";

/**
 * Landing page for email confirmation, password-reset and OAuth redirects.
 * Only a real session from the auth server moves the user forward.
 */
const AuthCallback = () => {
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    const url = new URL(window.location.href);
    const hash = new URLSearchParams(url.hash.replace(/^#/, ""));
    const type = hash.get("type") ?? url.searchParams.get("type");
    const next = safeReturnPath(url.searchParams.get("next") || "/dashboard");
    const errDesc = hash.get("error_description") ?? url.searchParams.get("error_description") ?? hash.get("error") ?? url.searchParams.get("error");

    if (errDesc) {
      const expired = /expired|invalid/i.test(errDesc);
      setError(expired ? "This link has expired or was already used. Request a new one." : "We couldn't complete sign-in. Please try again.");
      return;
    }
    if (type === "recovery") {
      navigate(`/reset-password${url.hash}`, { replace: true });
      return;
    }

    const finish = async () => {
      try {
        const code = url.searchParams.get("code");
        if (code) {
          const { error: exErr } = await supabase.auth.exchangeCodeForSession(code);
          if (exErr) throw exErr;
        }
        // Give hash-based tokens a moment to be picked up by the client.
        for (let i = 0; i < 10; i++) {
          const { data } = await supabase.auth.getUser();
          if (data.user) {
            if (active) navigate(next, { replace: true });
            return;
          }
          await new Promise((r) => setTimeout(r, 300));
        }
        if (active) setError("This link has expired or was already used. Sign in or request a new link.");
      } catch (e) {
        const msg = e instanceof Error ? e.message : "";
        if (!active) return;
        if (/fetch|network/i.test(msg)) setError("Network error. Check your connection and try again.");
        else setError("This link has expired or was already used. Sign in or request a new link.");
      }
    };
    finish();
    return () => { active = false; };
  }, [navigate]);

  return (
    <main className="flex min-h-screen items-center justify-center p-4">
      <div className="w-full max-w-md space-y-4 rounded-xl border border-primary/30 bg-card/80 p-6 text-center backdrop-blur">
        {error ? (
          <>
            <h1 className="text-lg font-semibold text-foreground">Sign-in link problem</h1>
            <p className="text-sm text-muted-foreground" role="alert">{error}</p>
            <div className="flex gap-2">
              <Button asChild className="flex-1"><Link to="/login">Sign in</Link></Button>
              <Button asChild variant="outline" className="flex-1"><Link to="/forgot-password">Reset password</Link></Button>
            </div>
          </>
        ) : (
          <>
            <Loader2 className="mx-auto h-6 w-6 animate-spin text-primary" />
            <p className="text-sm text-muted-foreground">Confirming your account…</p>
          </>
        )}
      </div>
    </main>
  );
};

export default AuthCallback;
