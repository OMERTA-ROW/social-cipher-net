import { describe, it, expect } from "vitest";
import {
  feedErrorMessage,
  feedLoadAction,
  isValidStoredSession,
  purgeCorruptAuthSessions,
  serializeSession,
} from "./authSession";

const mem = (init: Record<string, string>) => {
  const m = new Map(Object.entries(init));
  return {
    get length() { return m.size; },
    key: (i: number) => [...m.keys()][i] ?? null,
    getItem: (k: string) => m.get(k) ?? null,
    removeItem: (k: string) => void m.delete(k),
    map: m,
  };
};

describe("session serialization", () => {
  it("never produces [object Object]", () => {
    const s = serializeSession({ access_token: "a", user: { id: "u" } });
    expect(s).not.toBe("[object Object]");
    expect(isValidStoredSession(s)).toBe(true);
  });
  it("rejects corrupt values", () => {
    expect(isValidStoredSession("[object Object]")).toBe(false);
    expect(isValidStoredSession(null)).toBe(false);
    expect(isValidStoredSession("{}")).toBe(false);
  });
  it("purges only corrupt auth keys", () => {
    const s = mem({
      "sb-x-auth-token": "[object Object]",
      "sb-y-auth-token": JSON.stringify({ access_token: "t" }),
      other: "[object Object]",
    });
    expect(purgeCorruptAuthSessions(s)).toEqual(["sb-x-auth-token"]);
    expect(s.map.has("sb-y-auth-token")).toBe(true);
    expect(s.map.has("other")).toBe(true);
  });
});

describe("For You feed gating", () => {
  it("waits until auth resolves", () => {
    expect(feedLoadAction(false, null, "for-you")).toBe("wait");
    expect(feedLoadAction(false, "u1", "for-you")).toBe("wait");
  });
  it("skips the ranked RPC for signed-out visitors and prompts sign-in", () => {
    expect(feedLoadAction(true, null, "for-you")).toBe("prompt-sign-in");
    expect(feedLoadAction(true, null, "following")).toBe("prompt-sign-in");
    expect(feedLoadAction(true, null, "discover")).toBe("load");
  });
  it("loads once a session exists", () => {
    expect(feedLoadAction(true, "u1", "for-you")).toBe("load");
  });
  it("never exposes raw database errors", () => {
    for (const m of [feedErrorMessage(), feedErrorMessage(true)]) {
      expect(m).not.toMatch(/permission denied|function|get_ranked_feed|42501/i);
    }
  });
});
