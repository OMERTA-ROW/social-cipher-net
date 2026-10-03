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

const GitHubMark = () => (
  <svg viewBox="0 0 24 24" className="mr-2 h-4 w-4" aria-hidden="true">
    <path fill="currentColor" d="M12 .5a11.5 11.5 0 0 0-3.64 22.41c.58.1.79-.25.79-.56v-2c-3.2.7-3.88-1.37-3.88-1.37-.53-1.33-1.28-1.69-1.28-1.69-1.05-.71.08-.7.08-.7 1.16.08 1.77 1.19 1.77 1.19 1.03 1.77 2.7 1.26 3.36.96.1-.75.4-1.26.73-1.55-2.55-.29-5.24-1.28-5.24-5.69 0-1.26.45-2.29 1.19-3.1-.12-.29-.52-1.46.11-3.05 0 0 .97-.31 3.17 1.18a11 11 0 0 1 5.77 0c2.2-1.49 3.17-1.18 3.17-1.18.63 1.59.23 2.76.11 3.05.74.81 1.19 1.84 1.19 3.1 0 4.42-2.7 5.4-5.26 5.68.41.36.78 1.06.78 2.14v3.17c0 .31.21.67.8.56A11.5 11.5 0 0 0 12 .5Z" />
  </svg>
);

/**
 * Continue with Google uses the configured managed sign-in provider; account
 * matching is done by the auth server from the provider-verified identity.
 * GitHub sign-in is not offered by the configured backend, so its button
 * explains that instead of starting a fake flow.
 */
const SocialSignIn = ({ nextPath }: { nextPath: string }) => {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [githubInfo, setGithubInfo] = useState(false);

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
      <Button type="button" variant="outline" className="w-full" aria-describedby={githubInfo ? "github-unavailable" : undefined} onClick={() => setGithubInfo(true)}>
        <GitHubMark /> Continue with GitHub
      </Button>
      {githubInfo && (
        <p id="github-unavailable" role="status" className="text-xs text-muted-foreground">
          GitHub sign-in isn't available: this site's sign-in service doesn't support GitHub. Use Google or email instead.
        </p>
      )}
      {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
      <div className="flex items-center gap-2 py-1 text-xs text-muted-foreground" aria-hidden="true">
        <span className="h-px flex-1 bg-border" /> or use email <span className="h-px flex-1 bg-border" />
      </div>
    </div>
  );
};

export default SocialSignIn;
