import { describe, expect, it } from "vitest";
import { safeReturnPath, signInPath } from "./authRedirect";

describe("safeReturnPath", () => {
  it("keeps same-origin relative paths", () => {
    expect(safeReturnPath("/dashboard?tab=settings")).toBe("/dashboard?tab=settings");
  });

  it("rejects protocol-relative and absolute URLs", () => {
    expect(safeReturnPath("//evil.example.com")).toBe("/");
    expect(safeReturnPath("https://evil.example.com")).toBe("/");
    expect(safeReturnPath("javascript:alert(1)")).toBe("/");
  });

  it("falls back to home for empty values", () => {
    expect(safeReturnPath(null)).toBe("/");
    expect(safeReturnPath(undefined)).toBe("/");
    expect(safeReturnPath("")).toBe("/");
  });
});

describe("signInPath", () => {
  it("encodes a return path", () => {
    expect(signInPath("/trading")).toBe("/auth?next=%2Ftrading");
  });

  it("does not loop back onto the auth page or home", () => {
    expect(signInPath("/")).toBe("/auth");
    expect(signInPath("/auth?next=%2F")).toBe("/auth");
  });

  it("drops unsafe destinations", () => {
    expect(signInPath("https://evil.example.com")).toBe("/auth");
  });
});
