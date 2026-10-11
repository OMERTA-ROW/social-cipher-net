import { describe, expect, it } from "vitest";
import { SOCIAL_PROVIDERS, getSocialProvider, providerAvailability } from "./providers";

describe("social provider availability", () => {
  it("lists all 21 requested platforms", () => {
    expect(SOCIAL_PROVIDERS).toHaveLength(21);
  });
  it("is never ready when the server reports no configured providers", () => {
    expect(SOCIAL_PROVIDERS.some((p) => providerAvailability(p, []) === "ready")).toBe(false);
  });
  it("is ready only when its adapter is configured", () => {
    expect(providerAvailability(getSocialProvider("x")!, ["x"])).toBe("ready");
    expect(providerAvailability(getSocialProvider("x")!, ["tiktok"])).toBe("setup");
  });
  it("platforms without a server adapter cannot connect even if a name matches", () => {
    expect(providerAvailability(getSocialProvider("threads")!, ["threads"])).toBe("planned");
  });
  it("Medium is unavailable", () => {
    expect(providerAvailability(getSocialProvider("medium")!, ["medium"])).toBe("unavailable");
  });
});
