import { describe, expect, it } from "vitest";
import {
  EMPTY_PROGRESS,
  coerceStep,
  coerceSteps,
  isOnboardingComplete,
  nextProgress,
  previousStep,
} from "@/lib/onboarding";

const at = () => "2026-01-01T00:00:00.000Z";

describe("onboarding progress", () => {
  it("starts on the profile step and is not complete", () => {
    expect(EMPTY_PROGRESS.currentStep).toBe("profile");
    expect(isOnboardingComplete(EMPTY_PROGRESS)).toBe(false);
  });

  it("advances and records the finished step", () => {
    const next = nextProgress(EMPTY_PROGRESS, "profile", "done", at);
    expect(next.currentStep).toBe("accounts");
    expect(next.completedSteps).toEqual(["profile"]);
    expect(next.completedAt).toBeNull();
  });

  it("records an optional step as skipped without completing it", () => {
    const next = nextProgress(nextProgress(EMPTY_PROGRESS, "profile", "done", at), "accounts", "skipped", at);
    expect(next.currentStep).toBe("explore");
    expect(next.skippedSteps).toEqual(["accounts"]);
    expect(next.completedSteps).toEqual(["profile"]);
  });

  it("marks the flow complete on the last step", () => {
    let p = nextProgress(EMPTY_PROGRESS, "profile", "done", at);
    p = nextProgress(p, "accounts", "skipped", at);
    p = nextProgress(p, "explore", "done", at);
    expect(p.currentStep).toBe("explore");
    expect(isOnboardingComplete(p)).toBe(true);
    expect(p.completedAt).toBe(at());
  });

  it("moves a skipped step to completed when it is revisited and finished", () => {
    let p = nextProgress(EMPTY_PROGRESS, "profile", "done", at);
    p = nextProgress(p, "accounts", "skipped", at);
    p = { ...p, currentStep: "accounts" };
    p = nextProgress(p, "accounts", "done", at);
    expect(p.skippedSteps).toEqual([]);
    expect(p.completedSteps).toEqual(["profile", "accounts"]);
  });

  it("goes back but never before the first step", () => {
    expect(previousStep("accounts")).toBe("profile");
    expect(previousStep("profile")).toBe("profile");
  });

  it("ignores unknown steps coming from storage", () => {
    expect(coerceStep("nonsense")).toBe("profile");
    expect(coerceSteps(["profile", "nope", 7])).toEqual(["profile"]);
  });
});
