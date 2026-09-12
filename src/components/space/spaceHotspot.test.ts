import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

/**
 * Regression test for the spaceship hotspot.
 *
 * The hotspot follows the ship around the screen on every route. It must never
 * sit above interactive page content, or it silently swallows clicks meant for
 * buttons, links and form controls.
 */
const source = readFileSync(
  path.resolve(__dirname, "SpaceBackground.tsx"),
  "utf8",
);

function hotspotClassName(): string {
  // The hotspot is the only element positioned from shipTarget.x / shipTarget.y.
  const block = source.slice(source.indexOf("shipTarget.visible"));
  const match = /className="([^"]+)"/.exec(block);
  expect(match, "hotspot element with a className was not found").toBeTruthy();
  return match![1];
}

describe("spaceship hotspot", () => {
  it("renders behind page content with a negative z-index", () => {
    const cls = hotspotClassName();
    const z = /(^|\s)(-?)z-\[?(-?\d+)\]?/.exec(cls);
    expect(z, `no z-index utility found in "${cls}"`).toBeTruthy();
    const value = Number(`${z![2]}${z![3]}`);
    expect(value).toBeLessThan(0);
  });

  it("never uses a positive stacking class that would cover the UI", () => {
    const cls = hotspotClassName();
    expect(cls).not.toMatch(/(^|\s)z-(10|20|30|40|50|auto)(\s|$)/);
  });

  it("keeps the background layer non-interactive", () => {
    expect(source).toMatch(/-z-10[^"]*pointer-events-none/);
  });

  it("positions the hotspot from the live ship coordinates", () => {
    expect(source).toMatch(/left:\s*shipTarget\.x/);
    expect(source).toMatch(/top:\s*shipTarget\.y/);
  });
});
