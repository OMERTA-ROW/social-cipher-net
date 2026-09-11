import { beforeEach, describe, expect, it, vi } from "vitest";

const selectMock = vi.fn();

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    from: () => ({
      select: () => ({
        eq: () => ({
          in: (_col: string, ids: string[]) => selectMock(ids),
        }),
      }),
    }),
  },
}));

import { resolvePaidAccess } from "@/lib/paymentAccess";
import { cacheInvalidate } from "@/lib/queryCache";
import { isPermissionError, monitorCount, resetMonitoring } from "@/lib/monitoring";

const VIEWER = "11111111-1111-1111-1111-111111111111";
const CREATOR = "22222222-2222-2222-2222-222222222222";

const posts = [
  { id: "free-1", user_id: CREATOR, monetization_type: "free" },
  { id: "paid-bought", user_id: CREATOR, monetization_type: "paid" },
  { id: "paid-unbought", user_id: CREATOR, monetization_type: "paid" },
  { id: "own-paid", user_id: VIEWER, monetization_type: "paid" },
];

describe("resolvePaidAccess", () => {
  beforeEach(() => {
    selectMock.mockReset();
    cacheInvalidate();
    resetMonitoring();
    vi.spyOn(console, "error").mockImplementation(() => {});
  });

  it("unlocks free posts, own posts and posts the signed-in viewer paid for", async () => {
    selectMock.mockResolvedValue({ data: [{ post_id: "paid-bought" }], error: null });

    const { unlocked, degraded } = await resolvePaidAccess(posts, VIEWER);

    expect(degraded).toBe(false);
    expect(unlocked.has("free-1")).toBe(true);
    expect(unlocked.has("own-paid")).toBe(true);
    expect(unlocked.has("paid-bought")).toBe(true);
    expect(unlocked.has("paid-unbought")).toBe(false);
  });

  it("checks every paid post in a single batched query", async () => {
    selectMock.mockResolvedValue({ data: [], error: null });

    await resolvePaidAccess(posts, VIEWER);

    expect(selectMock).toHaveBeenCalledTimes(1);
    expect(selectMock.mock.calls[0][0].sort()).toEqual(["paid-bought", "paid-unbought"]);
  });

  it("reuses the cached result instead of re-querying", async () => {
    selectMock.mockResolvedValue({ data: [{ post_id: "paid-bought" }], error: null });

    await resolvePaidAccess(posts, VIEWER);
    await resolvePaidAccess(posts, VIEWER);

    expect(selectMock).toHaveBeenCalledTimes(1);
  });

  it("only unlocks free posts for signed-out visitors and never queries payments", async () => {
    const { unlocked, degraded } = await resolvePaidAccess(posts, null);

    expect(selectMock).not.toHaveBeenCalled();
    expect(degraded).toBe(false);
    expect(Array.from(unlocked)).toEqual(["free-1"]);
    expect(unlocked.has("paid-bought")).toBe(false);
    expect(unlocked.has("own-paid")).toBe(false);
  });

  it("never paywalls a signed-in viewer when the permission check is denied", async () => {
    selectMock.mockResolvedValue({
      data: null,
      error: { code: "42501", message: "permission denied for table post_payments" },
    });

    const { unlocked, degraded } = await resolvePaidAccess(posts, VIEWER);

    expect(degraded).toBe(true);
    expect(unlocked.has("paid-bought")).toBe(true);
    expect(unlocked.has("paid-unbought")).toBe(true);
    expect(monitorCount("post_payments_permission_denied")).toBe(1);
  });

  it("degrades safely on network failures too", async () => {
    selectMock.mockRejectedValue(new Error("network down"));

    const { unlocked, degraded } = await resolvePaidAccess(posts, VIEWER);

    expect(degraded).toBe(true);
    expect(unlocked.has("paid-bought")).toBe(true);
    expect(monitorCount("post_payments_check_failed")).toBe(1);
  });
});

describe("isPermissionError", () => {
  it("recognises postgres and http permission failures", () => {
    expect(isPermissionError({ code: "42501" })).toBe(true);
    expect(isPermissionError({ status: 403 })).toBe(true);
    expect(isPermissionError({ message: "new row violates row-level security policy" })).toBe(true);
    expect(isPermissionError(new Error("timeout"))).toBe(false);
  });
});
