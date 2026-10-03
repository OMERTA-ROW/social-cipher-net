import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { markRecoveryVerified, safeReturnPath } from "@/lib/authRedirect";
import { isIntegrationReturn, storeIntegrationResult, takeIntegrationReturn } from "@/lib/integrationStatus";

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

    // Account-integration return (provider consent). Never treated as sign-in:
    // the server verifies state, owner, expiry and replay before storing anything.
    if (isIntegrationReturn(url.searchParams)) {
      const back = takeIntegrationReturn();
      window.history.replaceState(null, "", "/auth/callback");
      (async () => {
        try {
          const { data: u } = await supabase.auth.getUser();
          if (!u.user) {
            storeIntegrationResult({ serviceId: null, ok: false, message: "Your CyberLink session ended before the connection finished. Sign in and try again." });
          } else {
            const { data, error: fnErr } = await supabase.functions.invoke("connector-oauth", {
              body: { action: "callback", state: url.searchParams.get("state"), code: url.searchParams.get("code"), error: url.searchParams.get("error") },
            });
            let message = data?.error as string | undefined;
            if (fnErr && !message) {
              try { message = (await (fnErr as { context?: Response }).context?.json())?.error; } catch { /* keep generic */ }
            }
            storeIntegrationResult(data?.ok
              ? { serviceId: data.service_id ?? null, ok: true, message: `Connected${data.account_name ? ` as ${data.account_name}` : ""}.` }
              : { serviceId: data?.service_id ?? null, ok: false, message: message ?? "The connection could not be completed. Nothing was changed." });
          }
        } catch {
          storeIntegrationResult({ serviceId: null, ok: false, message: "Network error while finishing the connection. Nothing was changed." });
        }
        if (active) navigate(back, { replace: true });
      })();
      return () => { active = false; };
    }

    if (errDesc) {
      const expired = /expired|invalid/i.test(errDesc);
      setError(expired ? "This link has expired or was already used. Request a new one." : "We couldn't complete sign-in. Please try again.");
      return;
    }
    // Implicit-flow recovery tokens live in the hash; the reset page's auth
    // client consumes them and emits PASSWORD_RECOVERY. PKCE recovery (?code=)
    // is exchanged below first so the code is never dropped.
    if (type === "recovery" && hash.get("access_token") && !url.searchParams.get("code")) {
      navigate(`/reset-password${url.hash}`, { replace: true });
      return;
    }
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY") markRecoveryVerified();
    });

    const finish = async () => {
      try {
        const code = url.searchParams.get("code");
        if (code) {
          const { error: exErr } = await supabase.auth.exchangeCodeForSession(code);
          if (exErr) throw exErr;
          if (type === "recovery") {
            markRecoveryVerified();
            if (active) navigate("/reset-password", { replace: true });
            return;
          }
        } else if (type === "recovery") {
          throw new Error("expired: recovery link missing its code");
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
    return () => { active = false; subscription.unsubscribe(); };
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
