/** Pure step logic for the first-login welcome flow (no database access). */

export const ONBOARDING_STEPS = ["profile", "accounts", "explore"] as const;
export type OnboardingStep = (typeof ONBOARDING_STEPS)[number];

/** Steps a member may skip without blocking the rest of the flow. */
export const OPTIONAL_STEPS: OnboardingStep[] = ["accounts", "explore"];

export interface OnboardingProgress {
  currentStep: OnboardingStep;
  completedSteps: OnboardingStep[];
  skippedSteps: OnboardingStep[];
  completedAt: string | null;
}

export const EMPTY_PROGRESS: OnboardingProgress = {
  currentStep: "profile",
  completedSteps: [],
  skippedSteps: [],
  completedAt: null,
};

export const isStep = (value: unknown): value is OnboardingStep =>
  typeof value === "string" && (ONBOARDING_STEPS as readonly string[]).includes(value);

export const coerceStep = (value: unknown): OnboardingStep => (isStep(value) ? value : "profile");

export const coerceSteps = (values: unknown): OnboardingStep[] =>
  Array.isArray(values) ? values.filter(isStep) : [];

/** The progress record after finishing or skipping `from`. */
export const nextProgress = (
  progress: OnboardingProgress,
  from: OnboardingStep,
  outcome: "done" | "skipped",
  now: () => string = () => new Date().toISOString(),
): OnboardingProgress => {
  const index = ONBOARDING_STEPS.indexOf(from);
  const isLast = index === ONBOARDING_STEPS.length - 1;

  const completedSteps =
    outcome === "done" && !progress.completedSteps.includes(from)
      ? [...progress.completedSteps, from]
      : progress.completedSteps.filter((s) => (outcome === "skipped" ? s !== from : true));

  const skippedSteps =
    outcome === "skipped" && !progress.skippedSteps.includes(from)
      ? [...progress.skippedSteps, from]
      : progress.skippedSteps.filter((s) => (outcome === "done" ? s !== from : true));

  return {
    currentStep: isLast ? from : ONBOARDING_STEPS[index + 1],
    completedSteps,
    skippedSteps,
    completedAt: isLast ? progress.completedAt ?? now() : progress.completedAt,
  };
};

export const previousStep = (step: OnboardingStep): OnboardingStep => {
  const index = ONBOARDING_STEPS.indexOf(step);
  return index <= 0 ? step : ONBOARDING_STEPS[index - 1];
};

export const isOnboardingComplete = (progress: OnboardingProgress): boolean =>
  Boolean(progress.completedAt);
