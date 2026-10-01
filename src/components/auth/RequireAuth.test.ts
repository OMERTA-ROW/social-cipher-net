import { describe, expect, it } from "vitest";
import { authGateState } from "./RequireAuth";

describe("auth route gate", () => {
  it("waits for session restoration", () => expect(authGateState(false, null)).toBe("checking"));
  it("denies a visitor after restoration", () => expect(authGateState(true, null)).toBe("signed-out"));
  it("allows a verified session", () => expect(authGateState(true, "user-1")).toBe("signed-in"));
});