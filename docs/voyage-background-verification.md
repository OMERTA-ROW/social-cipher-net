# Voyage background and fictional sensor verification

Date: 2026-10-03. Source revision before this change: `1473544d51fda8e540a3055cb253f0805421d6f6`. Preview only; not published.

## Preservation boundary

No edits were made to `src/lib/space/voyagePhysics.ts`, planet data, radii, positions, orbit paths, collision functions, ship integration, camera director, throttle controls, or routes. The render mapping remains `d_visual = 3.4 + 7.1·log10(1 + d / 40,000,000 km)` and body radii remain `0.34·cuberoot(radius / Mercury radius)`. The sensor derives its two fixed fictional zones from the existing maximum visual orbit radius; it never writes to world state.

## Automated checks

| Check | Result | Evidence |
|---|---|---|
| Dark-matter default OFF | PASS | `darkMatterSensors.test.ts` |
| No sensor force/world mutation | PASS | Pure sensor module accepts immutable position snapshots; protected physics source unchanged |
| Sensor noise ≤3%, signal 97–100% | PASS | Unit test at anomaly center and clamp policy |
| Two zones beyond current outer orbit | PASS | Unit test derives zones from supplied envelope |
| Four-second scan expiry | PASS | Unit test at duration boundary; page timer cleanup on rerender/unmount |
| Reduced-motion scan is static | PASS | Unit test returns constant ≤4% opacity |
| OFF/hidden cancellation | PASS | Page effect clears active scan; field unmount disposes materials |
| Physics and 100× stability | PASS | 49 existing physics/acceptance tests |
| Voyage preference/input parsing | PASS | 3 existing tests |
| Type check | PASS | `tsgo --noEmit` |
| Focused lint | PASS with two pre-existing Fast Refresh warnings in `VoyageScene.tsx` | No lint errors |

## Visual/runtime checks

The browser check records actual final URLs, screenshots, console errors, and failed requests for desktop 1280×1800 and mobile 390×844. Authentication redirects are reported as redirects rather than Voyage rendering evidence.

## Not tested or limited

- Physical phone/tablet multitouch and pinch gestures are not hardware-tested.
- WebGL context loss cannot be reliably forced in the hosted preview; existing recovery controls are unchanged.
- Long-duration real-GPU thermal/performance testing is not performed.
- A pixel-perfect foreground occlusion assertion is limited to screenshot review; scan meshes use depth testing and no depth writes behind opaque geometry.
- The fictional zones are intentionally distant and ordinary guided paths may not encounter them; pure policy tests exercise hypothetical entry.

## Release and cost

No publish, external generator, Atlas, Blender, purchase, provider consent, or provider call occurred. This standard build turn used the single user-approved build call; no additional paid external service was invoked. Production is blocked: the live response exposes a deployment ID and bundle hashes but no Git commit, and the app has no background-only isolated deployment path. A separate checkout/branch of the proven live revision is required before this patch can be safely released without the newer Voyage interface.