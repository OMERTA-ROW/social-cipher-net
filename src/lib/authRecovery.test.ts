import { beforeEach, describe, expect, it } from "vitest";
import { clearRecoveryVerified, hasVerifiedRecovery, markRecoveryVerified } from "./authRedirect";
const store = new Map<string, string>();
(globalThis as { sessionStorage?: unknown }).sessionStorage = {
  getItem: (k: string) => store.get(k) ?? null, setItem: (k: string, v: string) => void store.set(k, v),
  removeItem: (k: string) => void store.delete(k), clear: () => store.clear(),
};

describe("recovery verification marker", () => {
  beforeEach(() => sessionStorage.clear());
  it("is absent for an ordinary session", () => expect(hasVerifiedRecovery()).toBe(false));
  it("is present after a recovery link is processed", () => { markRecoveryVerified(); expect(hasVerifiedRecovery()).toBe(true); });
  it("expires after 15 minutes", () => { markRecoveryVerified(); expect(hasVerifiedRecovery(Date.now() + 16 * 60_000)).toBe(false); });
  it("is cleared after the password is changed", () => { markRecoveryVerified(); clearRecoveryVerified(); expect(hasVerifiedRecovery()).toBe(false); });
});
