/**
 * First-login welcome flow.
 *
 * Progress is stored per member in the database, so the flow can be left and
 * resumed on any device. Optional steps can be skipped, every step can be
 * revisited with Back, and once it is finished the member is routed on and
 * never sent back here (no redirect loops).
 */

import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ArrowLeft, ArrowRight, Check, Loader2, Plug, Sparkles, UserRound } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import { ONBOARDING_STEPS, OPTIONAL_STEPS, useOnboarding } from "@/hooks/useOnboarding";
import { signInPath } from "@/lib/authRedirect";

const STEP_META = {
  profile: { title: "Your profile", icon: UserRound, blurb: "Pick the name other members see." },
  accounts: { title: "Connect accounts", icon: Plug, blurb: "Optional — link the services you post from." },
  explore: { title: "Where to start", icon: Sparkles, blurb: "A quick tour of the main areas." },
} as const;

const Onboarding = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { userId, progress, loading, saving, error, advance, back, finishNow, isComplete } = useOnboarding();

  const [displayName, setDisplayName] = useState("");
  const [bio, setBio] = useState("");
  const [profileLoading, setProfileLoading] = useState(true);
  const [profileError, setProfileError] = useState<string | null>(null);

  // Signed out members belong on the sign-in screen, not here.
  useEffect(() => {
    if (!loading && !userId) navigate(signInPath("/onboarding"), { replace: true });
  }, [loading, userId, navigate]);

  // Finished already? Go straight to the dashboard — never loop back.
  useEffect(() => {
    if (!loading && userId && isComplete) navigate("/dashboard", { replace: true });
  }, [loading, userId, isComplete, navigate]);

  useEffect(() => {
    let active = true;
    (async () => {
      if (!userId) return;
      setProfileLoading(true);
      const { data, error: readError } = await supabase
        .from("profiles")
        .select("display_name, bio")
        .eq("id", userId)
        .maybeSingle();
      if (!active) return;
      if (readError) setProfileError(readError.message);
      setDisplayName(data?.display_name ?? "");
      setBio(data?.bio ?? "");
      setProfileLoading(false);
    })();
    return () => {
      active = false;
    };
  }, [userId]);

  const saveProfile = async () => {
    if (!userId) return;
    if (displayName.trim().length < 2) {
      toast({ title: "Add a name", description: "Use at least 2 characters.", variant: "destructive" });
      return;
    }
    setProfileError(null);
    const { error: writeError } = await supabase
      .from("profiles")
      .update({ display_name: displayName.trim(), bio: bio.trim() || null })
      .eq("id", userId);
    if (writeError) {
      setProfileError(writeError.message);
      toast({ title: "Could not save", description: writeError.message, variant: "destructive" });
      return;
    }
    await advance("profile", "done");
  };

  const finish = async (outcome: "done" | "skipped") => {
    await advance("explore", outcome);
    navigate("/dashboard", { replace: true });
  };

  if (loading || (userId && profileLoading)) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center gap-2 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" /> Loading your setup…
      </div>
    );
  }
  if (!userId) return null;

  const step = progress.currentStep;
  const index = ONBOARDING_STEPS.indexOf(step);
  const Meta = STEP_META[step];
  const Icon = Meta.icon;
  const optional = OPTIONAL_STEPS.includes(step);

  return (
    <div className="mx-auto w-full max-w-2xl space-y-4">
      <div className="space-y-2">
        <Progress value={((index + 1) / ONBOARDING_STEPS.length) * 100} />
        <p className="text-xs text-muted-foreground">
          Step {index + 1} of {ONBOARDING_STEPS.length}
          {progress.skippedSteps.length > 0 && ` · ${progress.skippedSteps.length} skipped`}
        </p>
      </div>

      <Card className="border-primary/20 bg-card/80">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-xl">
            <Icon className="h-5 w-5 text-primary" /> {Meta.title}
          </CardTitle>
          <CardDescription>{Meta.blurb}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {(error || profileError) && (
            <p className="rounded-md border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
              {error ?? profileError}
            </p>
          )}

          {step === "profile" && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="onboard-name">Display name</Label>
                <Input
                  id="onboard-name"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder="How should we introduce you?"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="onboard-bio">Short bio (optional)</Label>
                <Textarea
                  id="onboard-bio"
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  rows={3}
                  placeholder="A line about what you do here."
                />
              </div>
            </div>
          )}

          {step === "accounts" && (
            <div className="space-y-3 text-sm text-muted-foreground">
              <p>
                Link the social or exchange accounts you want to use. Keys are stored on our
                servers only — we never ask for passwords, seed phrases or private keys, and
                services without a configured provider are shown as setup required.
              </p>
              <Button asChild variant="outline" className="hover:text-primary">
                <Link to="/connectors">Open the connections page</Link>
              </Button>
              <p className="text-xs">You can come back to this at any time from your account menu.</p>
            </div>
          )}

          {step === "explore" && (
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li><Link className="text-primary hover:underline" to="/dashboard">Dashboard</Link> — your activity, earnings and stats.</li>
              <li><Link className="text-primary hover:underline" to="/trading">Trading</Link> — live charts you can resize and expand.</li>
              <li><Link className="text-primary hover:underline" to="/exchange">Exchange</Link> — market data, linked accounts and fee estimates.</li>
              <li><Link className="text-primary hover:underline" to="/cyber-world">Cyber World</Link> — communities, creators and live rooms.</li>
            </ul>
          )}

          <div className="flex flex-wrap items-center gap-2 pt-2">
            <Button variant="ghost" onClick={() => back()} disabled={index === 0 || saving} className="hover:text-primary">
              <ArrowLeft className="mr-2 h-4 w-4" /> Back
            </Button>
            {optional && (
              <Button
                variant="ghost"
                className="hover:text-primary"
                disabled={saving}
                onClick={() => (step === "explore" ? finish("skipped") : advance(step, "skipped"))}
              >
                Skip for now
              </Button>
            )}
            <div className="ml-auto flex gap-2">
              {step !== "explore" && (
                <Button
                  onClick={() => (step === "profile" ? saveProfile() : advance(step, "done"))}
                  disabled={saving}
                >
                  {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Continue <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              )}
              {step === "explore" && (
                <Button onClick={() => finish("done")} disabled={saving}>
                  {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Check className="mr-2 h-4 w-4" />}
                  Finish setup
                </Button>
              )}
            </div>
          </div>

          <button
            type="button"
            className="text-xs text-muted-foreground underline-offset-2 hover:text-primary hover:underline"
            onClick={async () => {
              await finishNow();
              navigate("/dashboard", { replace: true });
            }}
          >
            Skip the whole setup
          </button>
        </CardContent>
      </Card>
    </div>
  );
};

export default Onboarding;
