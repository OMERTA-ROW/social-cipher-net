import { describe, expect, it } from "vitest";
import { capabilitiesFor, evaluateRoute, PROVIDER_CAPABILITIES } from "./transferCapabilities";

const request = {
  fromServiceId: "cyberlink",
  toServiceId: "kraken_account",
  ownsSource: true,
  ownsDestination: true,
  feeConfigured: false,
  availableMinor: 10_000,
  amountMinor: 1_000,
};

describe("capability matrix", () => {
  it("does not grant payout ability from a social login", () => {
    expect(capabilitiesFor("youtube")).toEqual(["read_earnings"]);
    expect(capabilitiesFor("youtube")).not.toContain("withdraw");
    expect(capabilitiesFor("youtube")).not.toContain("transfer");
  });

  it("marks exchanges as not integrated until their integration is built", () => {
    const kraken = PROVIDER_CAPABILITIES.find((p) => p.serviceId === "kraken_account")!;
    expect(kraken.integrated).toBe(false);
    expect(kraken.capabilities).toEqual([]);
  });
});

describe("route eligibility", () => {
  it("blocks every route while execution is off", () => {
    const decision = evaluateRoute(request);
    expect(decision.eligible).toBe(false);
    expect(decision.blockers.map((b) => b.code)).toContain("execution_disabled");
  });

  it("names the missing fee configuration", () => {
    expect(evaluateRoute(request).blockers.map((b) => b.code)).toContain("fee_not_configured");
  });

  it("refuses a route out of an account that cannot send", () => {
    const decision = evaluateRoute({ ...request, fromServiceId: "youtube", executionEnabled: true, feeConfigured: true });
    expect(decision.blockers.map((b) => b.code)).toContain("source_cannot_withdraw");
  });

  it("refuses when the member does not own both sides", () => {
    const decision = evaluateRoute({ ...request, ownsDestination: false });
    expect(decision.blockers.map((b) => b.code)).toContain("not_owner");
  });

  it("refuses an amount larger than the available balance", () => {
    const decision = evaluateRoute({ ...request, amountMinor: 50_000 });
    expect(decision.blockers.map((b) => b.code)).toContain("insufficient_available");
  });

  it("does not block on balance when the balance is unknown", () => {
    const decision = evaluateRoute({ ...request, availableMinor: null, amountMinor: 50_000 });
    expect(decision.blockers.map((b) => b.code)).not.toContain("insufficient_available");
  });

  it("gives a setup instruction for every blocker", () => {
    for (const blocker of evaluateRoute(request).blockers) {
      expect(blocker.setup.length).toBeGreaterThan(10);
    }
  });

  it("rejects an unknown provider outright", () => {
    const decision = evaluateRoute({ ...request, toServiceId: "not_a_provider" });
    expect(decision.blockers.map((b) => b.code)).toEqual(["unknown_provider"]);
  });
});
