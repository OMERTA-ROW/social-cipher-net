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
| Planet surfaces readable (Earth, Jupiter, Saturn, Mars) | PASS | Screenshots at medium quality, with the real planet images: Earth's continents, Jupiter's bands and Great Red Spot, Saturn's banding, Mars's dark regions all visible. No blown-out white disks. |
| Saturn ring: radial bands, thin, tilted | PASS | Screenshot: concentric bands with a gap, thin angled ring |
| Dark space background, no grey haze | PASS | Same screenshots: black sky, faint stars |
| Camera drag / pinch with real gestures | NOT TESTED | headless can't do real multitouch; on-screen camera buttons tested |
| Smooth camera focus/reset look | NOT TESTED | too slow under software rendering to judge |
| Auto-quality tier switching | NOT TESTED | logic in code; not watched in the browser |
| WebGL context loss / restore | NOT TESTED | handler present, not triggered |
| Frame rate on real GPUs / phones | NOT TESTED | |
| Audio sounds heard | NOT TESTED | toggle state only |

## Visual repair (lighting and textures)

- **Blown-out planets:** sunlight used real 1/r² falloff over squeezed distances, so inner planets got far too much light. It now uses a steady sunlight strength (2.4), dimmer fill light, and glow only on the very brightest pixels (threshold 0.95).
- **Grey/white planets:** surfaces stayed on their placeholder colour after the image arrived. The surface is now rebuilt once the image loads.
- **Streaky Saturn ring:** the ring image was laid flat across the ring. It now runs from the inner edge to the outer edge, using the image's own transparency.
- **Sky haze:** sky glow turned down from 0.72 to 0.4.
- **Camera framing:** when you pick a planet, the camera now views it from the sunlit side.
- **Known minor issue:** a few faint dashed lines from the far orbit guides show near the top of the view.

## Limitations

See `voyage-simulation.md` → Limitations. Not marked production-ready: real-device performance, real multitouch and context loss still need checking on physical devices.

## Audit items outside Voyage

- `oauthRedirectIsAllowed('…/auth/callback')` is false on purpose: connector OAuth only returns to `/integrations` or `/connectors`. App sign-in doesn't use that helper. Not changed.
- `/privacy` and `/terms` don't exist. They need real approved legal text, which hasn't been provided.
- Forgot-password view now follows the URL (fixed).
