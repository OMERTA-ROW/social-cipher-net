import { describe, expect, it } from "vitest";
import { parseVoyagePreferences, shouldIgnoreKey } from "./voyagePreferences";

describe("voyage preferences", () => {
  it("falls back safely on corrupt or hostile storage", () => {
    expect(parseVoyagePreferences("{not json").quality).toBe("auto");
    const p = parseVoyagePreferences(JSON.stringify({ quality: "ultra", thrustScale: 99, follow: "x", timeScale: 7, selected: "pluto", labels: "yes" }));
    expect(p).toMatchObject({ quality: "auto", thrustScale: 1, follow: "selected", timeScale: 1, selected: "earth", labels: true });
  });
  it("keeps valid camera/control/display values", () => {
    expect(parseVoyagePreferences(JSON.stringify({ quality: "low", follow: "ship", thrustScale: 0.5, timeScale: 100, selected: "mars", guides: false }))).toMatchObject({ quality: "low", follow: "ship", thrustScale: 0.5, timeScale: 100, selected: "mars", guides: false });
  });
});

describe("keyboard guard", () => {
  const el = (tag: string, attrs: Record<string, string> = {}) => ({ tagName: tag, isContentEditable: false, getAttribute: (k: string) => attrs[k] ?? null }) as unknown as HTMLElement;
  it("ignores typing targets and Space on buttons", () => {
    expect(shouldIgnoreKey(el("INPUT"), "KeyW")).toBe(true);
    expect(shouldIgnoreKey(el("BUTTON"), "Space")).toBe(true);
    expect(shouldIgnoreKey(el("BUTTON", { role: "combobox" }), "KeyW")).toBe(true);
    expect(shouldIgnoreKey(el("BUTTON"), "KeyW")).toBe(false);
    expect(shouldIgnoreKey(el("BODY"), "Space")).toBe(false);
  });
});
