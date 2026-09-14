import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  EMPTY_PROGRESS,
  ONBOARDING_STEPS,
  OPTIONAL_STEPS,
  type OnboardingProgress,
  type OnboardingStep,
  coerceStep,
  coerceSteps,
  nextProgress,
  previousStep,
} from "@/lib/onboarding";

export { ONBOARDING_STEPS, OPTIONAL_STEPS };
export type { OnboardingProgress, OnboardingStep };

/** Has this member finished (or fully skipped) the welcome flow? */
export const fetchOnboardingComplete = async (userId: string): Promise<boolean> => {
  const { data, error } = await supabase
    .from("onboarding_progress")
    .select("completed_at")
    .eq("user_id", userId)
    .maybeSingle();
  // A read failure must never trap someone in onboarding.
  if (error) return true;
  return Boolean(data?.completed_at);
};

export const useOnboarding = () => {
  const [userId, setUserId] = useState<string | null>(null);
  const [progress, setProgress] = useState<OnboardingProgress>(EMPTY_PROGRESS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    const { data: { user } } = await supabase.auth.getUser();
    setUserId(user?.id ?? null);
    if (!user) {
      setProgress(EMPTY_PROGRESS);
      setLoading(false);
      return;
    }
    const { data, error: readError } = await supabase
      .from("onboarding_progress")
      .select("current_step, completed_steps, skipped_steps, completed_at")
      .eq("user_id", user.id)
      .maybeSingle();
    if (readError) setError(readError.message);
    setProgress(
      data
        ? {
            currentStep: coerceStep(data.current_step),
            completedSteps: coerceSteps(data.completed_steps),
            skippedSteps: coerceSteps(data.skipped_steps),
            completedAt: data.completed_at,
          }
        : EMPTY_PROGRESS,
    );
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const persist = useCallback(
    async (next: OnboardingProgress) => {
      if (!userId) return;
      setSaving(true);
      setError(null);
      const { error: writeError } = await supabase.from("onboarding_progress").upsert(
        {
          user_id: userId,
          current_step: next.currentStep,
          completed_steps: next.completedSteps,
          skipped_steps: next.skippedSteps,
          completed_at: next.completedAt,
        },
        { onConflict: "user_id" },
      );
      if (writeError) setError(writeError.message);
      else setProgress(next);
      setSaving(false);
    },
    [userId],
  );

  const goTo = (step: OnboardingStep) => persist({ ...progress, currentStep: step });

  const advance = (from: OnboardingStep, outcome: "done" | "skipped") =>
    persist(nextProgress(progress, from, outcome));

  const back = () => {
    const target = previousStep(progress.currentStep);
    return target === progress.currentStep ? Promise.resolve() : goTo(target);
  };

  const finishNow = () => persist({ ...progress, completedAt: new Date().toISOString() });

  return {
    userId,
    progress,
    loading,
    saving,
    error,
    refresh: load,
    goTo,
    advance,
    back,
    finishNow,
    isComplete: Boolean(progress.completedAt),
  };
};
