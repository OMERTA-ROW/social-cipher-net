# Route & page integration audit (2026-10-03, preview only)

Row-level results: `docs/route-integration-audit.csv` (325 rows: one per route-state × viewport × refresh case, per click case, and per unique visible link/button found by the crawl).

**This audit is not exhaustive.** Only anonymous (signed-out) states were browser-tested. All signed-in cases are BLOCKED until there is an authorized test identity. The user's own session was never used, and no session was minted.

## Method
- Playwright Chromium (software WebGL), isolated fresh context per case, at 1280×900 desktop and 390×844 mobile (touch, `is_mobile`).
- Each route: direct visit → record final URL, `document.title`, `<h1>` → hard `reload()` → record again → inventory every visible `a`/`button`/`role=button|link`.
- Click cases use ordinary `click()` (desktop), `tap()` (mobile) or focus + Enter (keyboard). No forced clicks. After each successful click the page was reloaded again.
- Not submitted: sign-in, sign-up and new-password forms; reset emails; OAuth; payments; posts or messages. "Send Reset Link" was only pressed with an empty field, and native validation blocked the request.

## Repairs made
| Problem | Fix |
|---|---|
| `/privacy`, `/terms`, `/contact` showed 404 | Added honest holding pages saying the document or contact details are not published yet. They link to existing Security and Community Guidelines pages. No legal or contact text was invented. |
| Every page had the same static title | `RouteTitle` sets a per-route `document.title`. The 404 page sets "Page not found" and adds `noindex`. |
| Sign In / Sign Up tabs did not change the URL, so refresh lost the chosen form | Tabs now navigate between `/login` and `/signup`, keeping `?next`. |
| Auth footer had no Privacy, Terms or Contact links | Footer now links Privacy, Terms, Guidelines and Contact. |
| `/auth/callback` ignored `?error=` when no description was sent | Any `error` or `error_description` now shows the "link problem" screen with Sign in / Reset password. |
| Sidebar logout sent users to `/`, which then bounced to login | It now goes straight to `/login` (replace). The profile-menu logout already did this. |
| Anonymous `/` redirect left `/` in browser history | Redirect now uses `replace`. |
| New pages missing from the route registry | Added to `appRoutes.ts`. |

## Results (anonymous)
- **Direct visit + hard refresh:** 20 route states × 2 viewports, all PASS:
  - Public pages render with correct titles.
  - `/dashboard`, `/profile`, `/settings`, `/integrations` and `/dashboard?tab=x` redirect to `/login?next=<encoded path>`.
  - The unknown route renders the 404 page.
  - `/auth/callback?error=…` shows the link-problem UI.
  - `/reset-password#error=…otp_expired` shows "Request a new reset link".
  - `/auth/callback#type=recovery` forwards to `/reset-password` without consuming a token.
  - `/login?next=//evil.example.com` stays on login; unsafe `next` values are rejected by `safeReturnPath` (unit-tested).
- **Bad links:** no empty, `#` or `javascript:` hrefs found on any crawled page.
- **Clicks / taps / keyboard:** 37 PASS, 1 FAIL.
  - FAIL, desktop only: Voyage "Home". The URL changes to `/`, but the Voyage view stays on screen for 20+ s under software WebGL. The same tap passes on mobile. This looks like main-thread starvation in the test browser; it is unconfirmed on real hardware.
- **Anonymous `/`:** redirects to `/login` by existing design. There is no public landing page with separate Sign In / Sign Up buttons. `/login` links to `/signup`, and the tabs switch between them.

## Coverage counts
| Status | Rows |
|---|---|
| PASS | 78 (41 route visit+refresh rows, including one duplicate run; 37 click/tap/keyboard) |
| FAIL | 1 |
| BLOCKED | 16 (8 signed-in route cases, 5 real flows, 3 form submits) |
| NOT TESTED | 230 inventory elements: about 170 sign-up birthdate-picker cells, plus Voyage controls not re-clicked in this crawl |

Voyage throttle, pause, speed, probe, dock, brake, thrust-pad and camera controls were browser-tested in the earlier Voyage runs (`docs/voyage-verification.md`). They were not re-run here.

## Unresolved / blocked
1. Signed-in matrix (render protected routes, `/login` → dashboard redirect, logout clears session, session persistence across reload): BLOCKED, needs an authorized test identity.
2. Real sign-up, confirmation email, reset email delivery, and reset with a genuine token: BLOCKED.
3. External OAuth connect and backend-verified "Connected" labels. In code, the badge comes only from `connections.status === "connected"` read from the backend, not local flags. Not browser-verified.
4. Privacy, Terms and Contact need owner-approved copy.
5. HTTP 404 status: the SPA always returns 200; the 404 is client-rendered with `noindex`.
6. Desktop Voyage → Home render delay (above).
7. The sign-in pages have no `<h1>` (titles are correct); this is an accessibility follow-up.

## Checks
- TypeScript (`tsgo -p tsconfig.app.json`): exit 0.
- Vitest: 62/62 across route-title, RequireAuth, appRoutes, authRedirect, authSession, Voyage physics and preferences.
- ESLint on touched files: 0 errors, 1 react-refresh warning.

## Follow-up fixes (Oct 3 2026)
- Password-reset emails now return via `/auth/callback?type=recovery`; PKCE `code` is exchanged before routing to `/reset-password` (previously dropped). Hash-token links still go to the reset page and wait for `PASSWORD_RECOVERY`.
- `/reset-password` only shows the new-password form with recovery proof (PASSWORD_RECOVERY event, recovery hash, or a 15-minute tab-scoped marker set by the callback). An ordinary signed-in session gets "open the reset link from your email". Marker is cleared after a successful update. Unit-tested (fixture, 4 tests).
- Signup confirmation link keeps a safe `next` return path through the callback.
- `/settings` re-selects Account settings when navigating from `/dashboard` (tabs re-keyed by URL).
- `/auth/callback` added to the route registry.
- RequireAuth: a failed `getUser()` no longer leaves a permanent spinner; it falls back to the restored session for routing only (data still guarded server-side) or redirects to sign-in.
- Legacy Navigation: logo is a link home; every icon item is a real link with an accessible name. Rendered only on pages outside the app shell; no such page was browser-checked this round (NOT TESTED).
- Browser (anonymous, desktop): `/auth/callback?type=recovery` without code, with bogus code, and `/reset-password` with no session all show the invalid-link state — PASS. Real reset email, valid recovery link, fresh login/signup/logout: BLOCKED (no authorized test identity).
