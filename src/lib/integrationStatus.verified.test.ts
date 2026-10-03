import { describe, it, expect } from "vitest";
import { isVerifiedConnection, connectionNeedsAttention, integrationState } from "./integrationStatus";

const base = { status: "connected", provider_account_id: "acct:123", last_error: null, health: "healthy" };

describe("verified connection display rule", () => {
  it("connected + verified id + no error is Connected", () => {
    expect(isVerifiedConnection(base)).toBe(true);
  });
  it("provider invalid-token error is never Connected/Active", () => {
    const row = { ...base, last_error: "Invalid OAuth access token" };
    expect(isVerifiedConnection(row)).toBe(false);
    expect(connectionNeedsAttention(row)).toBe(true);
    expect(integrationState({ row, missingConfig: [], connecting: false, lastResult: null })).toBe("Connection failed");
  });
  it("failing health is not Connected", () => {
    expect(isVerifiedConnection({ ...base, health: "failing" })).toBe(false);
  });
  it("manually saved key without provider id is not Connected", () => {
    expect(isVerifiedConnection({ ...base, provider_account_id: null })).toBe(false);
  });
});
