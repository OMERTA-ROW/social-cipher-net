import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const read = (relativePath: string) =>
  readFileSync(path.resolve(__dirname, relativePath), "utf8");

describe("still-by-default space scenes", () => {
  it("keeps the shared background frozen", () => {
    const source = read("SpaceBackground.tsx");
    expect(source).toContain("const animate = false");
    expect(source).toContain("<SpaceScene full={full} animate={animate}");
  });

  it("starts Voyage and focused orbit motion paused", () => {
    const source = read("../../pages/SolarSystemVoyage.tsx");
    expect(source).toContain('useState(false)');
    expect(source).toContain('useState(0)');
    expect(source).toContain("const sceneAnimated = travelActive");
    expect(source).toContain('{travelling ? "Stop Travel" : "Start Travel"}');
  });

  it("does not reuse planetary colour imagery as relief data", () => {
    const sharedPlanets = read("scene/Planets.tsx");
    const voyagePlanets = read("voyage/VoyageCelestialBody.tsx");
    expect(sharedPlanets).not.toContain("bumpMap=");
    expect(sharedPlanets).not.toContain("displacementMap=");
    expect(voyagePlanets).not.toContain("bumpMap=");
    expect(voyagePlanets).not.toContain("displacementMap=");
  });
});

describe("progressive astronomy textures", () => {
  it("retries failures, rejects stale results, and keeps filtering bounded without nested hooks", () => {
    const source = read("realTextures.ts");
    expect(source).toContain("if (cache.get(url) === p) cache.delete(url)");
    expect(source).toContain("loaded?.key === textureKey ? loaded.texture : null");
    expect(source).toContain("Math.min(8, anisotropy)");
    expect(source).not.toMatch(/import\s*\{[^}]*useThree/);
    expect(source).toContain("if (owned) owned.dispose()");
  });
});