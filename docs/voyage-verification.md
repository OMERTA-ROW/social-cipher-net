# Voyage verification

Date: 2026-10-03. Preview only, not published. Browser checks ran in headless Chromium with **software WebGL (SwiftShader)**, about 0.5–1.6 FPS. So they show the controls are wired up, not how smooth it is on real hardware.

## Automated

| Check | Result |
| --- | --- |
| `vitest` voyagePhysics (30), voyagePreferences, authRedirect | PASS — 39/39 |
| TypeScript (`tsgo`) | PASS |
| ESLint, files touched | PASS — 0 errors, 1 Fast Refresh warning (VoyageScene exports constants) |
| Build | PASS |

## Evidence checklist

| Item | Status | Evidence |
| --- | --- | --- |
| Gravity pulls bodies together; depends on mass and distance | PASS | unit tests: acceleration ∝ μ, ∝ 1/r², Sun dominates |
| Orbit assist matches softened force | PASS | unit test: circular orbit, relative to a moving planet |
| Fixed timestep; 100× bounded work; long-run drift | PASS | unit tests: ≤160 substeps/frame, drift <1 % over 3 orbits |
| Low-speed bounce/scrape, high-speed destruction + fragments | PASS (unit) | unit tests; not seen in the browser |
| Tunneling at high speed (sphere, moving collider, Sun, rings) | PASS (unit) | first-contact sweep tests incl. tilted ring slab and in-plane travel |
| Docking gate (distance + relative speed) | PASS | unit test; browser showed "Docking denied: 1880 km from port (zone 68 km)" |
| Landing only in zones below safe speed | PASS (unit) | unit test |
| Destroyed ship has no thrust | PASS (unit) | unit test |
| Probe launch (momentum, mass) | PASS | unit test; browser: "Probe launched (5 left)" on desktop, mobile and tablet |
| Thrust via keyboard | PASS | browser: fuel 1800 → 1702 kg after holding W |
| Thrust via on-screen pad (normal pointer, no forced clicks) | PASS | browser: fuel → 1634 kg |
| Pause stops time | PASS | browser: 0d 00h 04m → 0d 00h 04m while paused |
| 100× | PASS | browser: time advanced to 1 h within the step |
| Hidden tab stops simulation | PASS | browser: advanced 5 sim-min (one in-flight frame at 100×), then stopped |
| Orbit guides toggle, Sound toggle | PASS | browser |
| Body selection updates panel | PASS | browser: Mars distance 163.36 M km |
| Mobile 390 px / tablet 820 px layout | PASS | panel and control pads don't overlap; no horizontal scroll; no page errors |
| Reduced motion starts paused, Resume offered | PASS | browser (emulated reduced motion) |
| WebGL unavailable → 2D starfield | PASS | browser with WebGL blocked |
| Texture download failure → page still works | PASS | browser with texture requests aborted; no page errors |
| Home → sign-in when signed out | PASS | browser: `/` redirected to `/login` |
| Forgot password ↔ sign in | PASS | browser: link opens `/forgot-password` with the reset form; loading the URL directly shows it too. No reset email was sent. |
| Camera drag / pinch with real gestures | NOT TESTED | headless can't do real multitouch; on-screen camera buttons tested |
| Smooth camera focus/reset look | NOT TESTED | too slow under software rendering to judge |
| Auto-quality tier switching | NOT TESTED | logic in code; not watched in the browser |
| WebGL context loss / restore | NOT TESTED | handler present, not triggered |
| Frame rate on real GPUs / phones | NOT TESTED | |
| Audio sounds heard | NOT TESTED | toggle state only |

## Limitations

See `voyage-simulation.md` → Limitations. Not marked production-ready: real-device performance, real multitouch and context loss still need checking on physical devices.

## Audit items outside Voyage

- `oauthRedirectIsAllowed('…/auth/callback')` is false on purpose: connector OAuth only returns to `/integrations` or `/connectors`. App sign-in doesn't use that helper. Not changed.
- `/privacy` and `/terms` don't exist. They need real approved legal text, which hasn't been provided.
- Forgot-password view now follows the URL (fixed).
