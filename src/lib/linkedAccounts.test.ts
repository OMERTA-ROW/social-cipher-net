import { describe, expect, it } from "vitest";
import { activeAccount, forService, nextAccountKey, ownedBy, withActiveAccount } from "./linkedAccounts";

const acc = (id: string, service_id: string, account_key: string, is_active_account: boolean, user_id: string) => ({
  id,
  user_id,
  service_id,
  account_key,
  is_active_account,
});

const accounts = [
  acc("1", "kraken_account", "default", true, "user-a"),
  acc("2", "kraken_account", "account_2", false, "user-a"),
  acc("3", "instagram", "default", true, "user-a"),
  acc("4", "kraken_account", "default", true, "user-b"),
];

describe("linked account isolation", () => {
  it("returns nothing when nobody is signed in", () => {
    expect(ownedBy(accounts, null)).toEqual([]);
  });

  it("never returns another member's accounts", () => {
    const mine = ownedBy(accounts, "user-a");
    expect(mine).toHaveLength(3);
    expect(mine.every((a) => a.user_id === "user-a")).toBe(true);
  });
});

describe("multiple accounts per provider", () => {
  it("keeps several accounts for one service", () => {
    expect(forService(ownedBy(accounts, "user-a"), "kraken_account")).toHaveLength(2);
  });

  it("reports the active account", () => {
    expect(activeAccount(ownedBy(accounts, "user-a"), "kraken_account")?.id).toBe("1");
  });

  it("has no active account for a service that is not linked", () => {
    expect(activeAccount(ownedBy(accounts, "user-a"), "bybit_account")).toBeNull();
  });

  it("switches the active account and leaves other services alone", () => {
    const next = withActiveAccount(ownedBy(accounts, "user-a"), "kraken_account", "2");
    expect(next.filter((a) => a.service_id === "kraken_account" && a.is_active_account)).toHaveLength(1);
    expect(activeAccount(next, "kraken_account")?.id).toBe("2");
    expect(activeAccount(next, "instagram")?.id).toBe("3");
  });

  it("ignores an id that does not belong to the service", () => {
    const mine = ownedBy(accounts, "user-a");
    expect(withActiveAccount(mine, "kraken_account", "3")).toEqual(mine);
  });

  it("allocates a fresh slot key per service", () => {
    const mine = ownedBy(accounts, "user-a");
    expect(nextAccountKey(mine, "kraken_account")).toBe("account_3");
    expect(nextAccountKey(mine, "bybit_account")).toBe("default");
  });
});
