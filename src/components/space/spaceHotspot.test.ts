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

describe("spaceship hotspot", () => {
  it("does not render a page-level ship hotspot", () => {
    expect(source).not.toContain("Open spaceship crew interface");
    expect(source).not.toContain("shipTarget.visible");
  });

  it("keeps the background layer non-interactive", () => {
    expect(source).toMatch(/-z-10[^"]*pointer-events-none/);
  });

  it("never listens for moving ship coordinates above page content", () => {
    expect(source).not.toContain("cyberlink:ship-position");
    expect(source).not.toMatch(/left:\s*shipTarget\.x/);
    expect(source).not.toMatch(/top:\s*shipTarget\.y/);
  });
});
