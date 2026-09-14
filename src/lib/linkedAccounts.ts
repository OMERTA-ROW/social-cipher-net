/**
 * Pure helpers for multi-account selection. Keeping the rules here makes the
 * per-user isolation and active-account behaviour testable without a database.
 */

export interface AccountLike {
  id: string;
  user_id?: string;
  service_id: string;
  account_key: string;
  is_active_account: boolean;
  status?: string;
}

/** Only ever show a member their own accounts, whatever the caller passed in. */
export const ownedBy = <T extends AccountLike>(accounts: T[], userId: string | null): T[] =>
  userId ? accounts.filter((a) => a.user_id === undefined || a.user_id === userId) : [];

export const forService = <T extends AccountLike>(accounts: T[], serviceId: string): T[] =>
  accounts.filter((a) => a.service_id === serviceId);

/** The active account for a service, or null when the member has none there. */
export const activeAccount = <T extends AccountLike>(accounts: T[], serviceId: string): T | null =>
  forService(accounts, serviceId).find((a) => a.is_active_account) ?? null;

/**
 * The result of choosing a new active account: exactly one stays active per
 * service, and other services are untouched.
 */
export const withActiveAccount = <T extends AccountLike>(
  accounts: T[],
  serviceId: string,
  connectionId: string,
): T[] => {
  if (!accounts.some((a) => a.id === connectionId && a.service_id === serviceId)) return accounts;
  return accounts.map((a) =>
    a.service_id === serviceId ? { ...a, is_active_account: a.id === connectionId } : a,
  );
};

/** A slot key for a new account, unique within the member's accounts for that service. */
export const nextAccountKey = (accounts: AccountLike[], serviceId: string): string => {
  const used = new Set(forService(accounts, serviceId).map((a) => a.account_key));
  if (!used.has("default")) return "default";
  let index = 2;
  while (used.has(`account_${index}`)) index += 1;
  return `account_${index}`;
};
