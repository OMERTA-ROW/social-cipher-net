import { describe, expect, it } from "vitest";
import { APP_ROUTES, getRouteMeta, isKnownInternalPath } from "@/lib/appRoutes";

describe("app route registry", () => {
  it("contains no duplicate paths", () => {
    expect(new Set(APP_ROUTES.map((route) => route.path)).size).toBe(APP_ROUTES.length);
  });

  it("matches dynamic routes", () => {
    expect(getRouteMeta("/profile/member-id")?.title).toBe("Member Profile");
    expect(isKnownInternalPath("/live/stream-id?source=feed")).toBe(true);
  });

  it("rejects the removed arena alias", () => {
    expect(isKnownInternalPath("/cyber-gamers")).toBe(false);
    expect(isKnownInternalPath("/cyber-arena")).toBe(true);
  });
});