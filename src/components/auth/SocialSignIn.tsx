import { useState } from "react";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { lovable } from "@/integrations/lovable/index";
import { safeReturnPath } from "@/lib/authRedirect";

const SOCIAL_NEXT_KEY = "cl_social_next";

/** Remembered destination for after social sign-in (same-origin path only). */
export const takeSocialNext = (): string | null => {
  try {
    const v = sessionStorage.getItem(SOCIAL_NEXT_KEY);
    sessionStorage.removeItem(SOCIAL_NEXT_KEY);
    return v ? safeReturnPath(v) : null;
  } catch { return null; }
};

const GoogleMark = () => (
  <svg viewBox="0 0 24 24" className="mr-2 h-4 w-4" aria-hidden="true">
    <path fill="currentColor" d="M21.35 11.1H12v2.98h5.35c-.23 1.4-1.66 4.1-5.35 4.1-3.22 0-5.85-2.66-5.85-5.95S8.78 6.28 12 6.28c1.83 0 3.06.78 3.76 1.45l2.56-2.47C16.68 3.74 14.55 2.8 12 2.8 6.92 2.8 2.8 6.92 2.8 12s4.12 9.2 9.2 9.2c5.31 0 8.83-3.73 8.83-8.98 0-.6-.07-1.06-.15-1.52Z" />
  </svg>
);

/**
 * Continue with Google uses the configured managed sign-in provider; account
 * matching is done by the auth server from the provider-verified identity.
 * Unsupported providers are omitted until the backend supports them.
 */
const SocialSignIn = ({ nextPath }: { nextPath: string }) => {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const google = async () => {
    setError(null);
    setBusy(true);
    try { sessionStorage.setItem(SOCIAL_NEXT_KEY, safeReturnPath(nextPath)); } catch { /* storage blocked */ }
    try {
      const result = await lovable.auth.signInWithOAuth("google", { redirect_uri: window.location.origin + "/auth/callback" });
      if (result.error) {
        const msg = String((result.error as { message?: string }).message ?? result.error);
        setError(/cancel|closed|denied/i.test(msg) ? "Google sign-in was cancelled." : "Google sign-in could not be completed. Please try again.");
        setBusy(false);
        return;
      }
      if (result.redirected) return; // browser is leaving for Google
      // Session set in place: the sign-in page's auth listener routes onward.
    } catch {
      setError("Google sign-in could not start. Check your connection and try again.");
      setBusy(false);
    }
  };

  return (
    <div className="space-y-2">
      <Button type="button" variant="outline" className="w-full" onClick={google} disabled={busy} aria-busy={busy}>
        {busy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" /> : <GoogleMark />}
        Continue with Google
      </Button>
      {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
      <div className="flex items-center gap-2 py-1 text-xs text-muted-foreground" aria-hidden="true">
        <span className="h-px flex-1 bg-border" /> or use email <span className="h-px flex-1 bg-border" />
      </div>
    </div>
  );
};

export default SocialSignIn;
