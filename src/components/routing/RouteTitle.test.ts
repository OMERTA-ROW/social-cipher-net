import { describe, expect, it } from "vitest";
import { titleFor } from "./RouteTitle";
describe("titleFor", () => {
  it("names audited routes", () => {
    expect(titleFor("/login", true)).toBe("Sign in · Cyber Link");
    expect(titleFor("/voyage/", true)).toBe("Solar System Voyage · Cyber Link");
    expect(titleFor("/privacy", true)).toBe("Privacy Policy · Cyber Link");
  });
  it("labels unknown routes as not found", () => expect(titleFor("/nope", false)).toBe("Page not found · Cyber Link"));
});
