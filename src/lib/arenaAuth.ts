import { safeReturnPath } from './authRedirect';

const AUTH_PAGES = /^\/cyber-arena\/(login|signup|forgot-password|reset-password)(?:[/?#]|$)/i;

export function arenaReturnPath(raw: string | null | undefined): string {
  const fallback = '/cyber-arena/lobby';
  const candidate = safeReturnPath(raw);
  if (!candidate.startsWith('/cyber-arena/') || AUTH_PAGES.test(candidate)) return fallback;
  try {
    const normalized = new URL(candidate, 'https://cyberlink.social');
    if (normalized.origin !== 'https://cyberlink.social' || !normalized.pathname.startsWith('/cyber-arena/')) return fallback;
    const decodedPath = decodeURIComponent(normalized.pathname);
    if (decodedPath.includes('\\') || decodedPath.includes('%') || decodedPath.split('/').some(part => part === '.' || part === '..') || AUTH_PAGES.test(decodedPath)) return fallback;
    return normalized.pathname + normalized.search;
  } catch { return fallback; }
}
