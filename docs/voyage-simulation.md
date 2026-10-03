# Voyage simulation

Route: `/voyage` (public). Preview only — not published.

## Files

| File | Role |
| --- | --- |
| `src/lib/space/voyagePhysics.ts` | Body data, gravity, integrator, swept collisions, docking/landing, probes, prediction, physical→render mapping |
| `src/lib/space/voyagePhysics.test.ts` | 30 physics regression tests |
| `src/lib/space/voyagePreferences.ts` (+ `.test.ts`) | Safe preference parsing, keyboard focus guard, WebGL probe |
| `src/components/space/voyage/VoyageScene.tsx` | R3F scene, camera director, quality budgets, telemetry |
| `src/pages/SolarSystemVoyage.tsx` | HUD, controls, keyboard/touch input, audio, loading/context-loss/fallback |
| `src/components/space/voyage/VoyageErrorBoundary.tsx` | Render error boundary with retry |
| `src/components/space/voyage/ProceduralStarFallback.tsx` | 2D starfield when WebGL is unavailable (static under reduced motion) |
| `src/components/space/realTextures.ts` | Texture loader; now reports genuine request/loaded/failed counts |

## Units and data

Simulation state: km, s, kg. Body data (mass, radius, μ = GM, semi-major axis, orbital period, axial tilt, sidereal rotation) comes from NASA fact sheets linked per body (`source`). Real diameter ratios are kept (Jupiter/Mercury ≈ 28.7).

Planets move on deterministic circular Kepler paths: `θ(t) = phase + 2π t / P`. Velocity is the analytic derivative. Surface spin angle = `2π t / P_rot` (sign = retrograde), so spin stops when the simulation pauses.

## Gravity

Softened, summed over the Sun and eight planets:

`a = Σ μᵢ (rᵢ − p) / |rᵢ − p| · 1 / (|rᵢ − p|² + ε²)`, ε = 250 km.

Circular speed consistent with that force: `v = √(μ r / (r² + ε²))`. Orbit assist uses this relative to the selected planet's moving velocity and the orbit plane from `h = r × v_rel` (falls back to the ecliptic, or another axis for polar radials, when `h ≈ 0`). Assist and brake act through the ship's thrusters (fuel-limited), not by overwriting velocity.

## Integration

- Velocity Verlet (kick–drift–kick), fixed substep 2 simulated seconds.
- 1× = 60 simulated s per real s; 10× and 100× multiply that.
- Real frame delta capped at 0.05 s; at most 160 substeps per frame (100× needs 150). If the budget runs out, the remainder is dropped — no catch-up jump. Hidden tabs stop the render loop (`frameloop="never"`).
- Ship: dry mass 10 200 kg (includes probes), fuel 1 800 kg, thrust 144 kN, Isp 3 000 s; `ṁ = F·throttle / (Isp·g₀)`, acceleration `F / m`.
- Thrust axes are orbital, relative to the reference body (the planet whose sphere of influence `a·(m/M☉)^0.4` contains the ship, else the Sun): W/S prograde/retrograde, R/F radial out/in, A/D lateral.

## Collisions (all swept, earliest time of impact)

| Object | Shape |
| --- | --- |
| Sun, planets, asteroids, debris, probes, fragments | Sphere, solved in the collider's moving frame |
| Orbital station | Axis-aligned box, Minkowski-padded by ship radius, moving with Earth |
| Saturn rings | Tilted annulus slab, half-thickness 50 km + ship radius; candidates = face and inner/outer edge crossings; handles in-plane travel; normal is in the tilted frame |

Response uses velocity relative to the collider, restitution 0.35 (minor) / 0.1 (major), tangential friction, and penetration correction to the surface. Relative normal speed < 0.3 km/s = minor (bounce/scrape); ≥ 0.3 = major (fragments spawned); ≥ 2.5 km/s or any Sun contact = destroyed (propulsion disabled, 8 fragments, "Recover ship" offered). Debris–ship contact exchanges momentum by mass.

Docking: only on request (K / Dock button), within 68 km of the station and below 80 m/s relative speed; docked ships refuel and repair. Landing: only on the green zones (Earth equatorial pad, Mars Jezero zone; 6°/8° radius) below 80 m/s relative speed; elsewhere contact is an impact. Decorative stars, dust and galaxy are non-physical.

Probes (6, L / Probe button): 60 kg, launched prograde at +30 m/s; ship recoils by momentum conservation; probes and debris are integrated with gravity and removed on planetary impact.

Prediction: gravity-only Verlet with adaptive step `dt = clamp(0.04·r/v_rel, 4 s, 2·10⁵ s)`, drawn relative to the reference body; turns orange when it predicts an impact.

## Scaling (visual only)

- Planet radius: `r_visual = 0.34 · (r_real / 2439.7 km)^(1/3)`.
- Heliocentric distance: `d_visual = 3.4 + 7.1 · log10(1 + d / 4·10⁷ km)`. The Sun is drawn with radius `d_visual(R☉)`, so its surface is where Sun collisions happen.
- Near a planet: `local(d) = r_visual · d/R` (d ≤ R), `r_visual · (1 + 0.75 ln(d/R))` (d > R), blended to the heliocentric mapping between 25 % and 100 % of the sphere of influence.
- Every rendered physical object (planets, ship, probes, debris, station, prediction, minimap) uses this one `renderPosition(p, t)` mapping, which does not depend on UI selection. Planet surfaces and ring edges are drawn exactly at their collision boundaries.
- Artificial objects (ship, station, asteroids) are drawn at a minimum visible size; their colliders are real-scale.

The on-screen label reads: "Scale optimized for exploration; relative planetary data preserved."

## Controls

Keyboard (ignored while typing in a field, or Space/Enter on a focused button; cleared on blur and when the tab is hidden): W/S, A/D, R/F thrust · Space brake · O orbit assist · L launch probe · K dock/undock · P pause · 1/2/3 = 1×/10×/100× · C reset camera · G orbit guides · N labels.

On-screen: Pause/Resume, 1×/10×/100×, body selector, thrust pad (hold; several at once with multitouch), Brake, Assist, Probe, Dock/Undock, camera pad (orbit arrows, zoom ±, recenter), Reset Camera, Reset Ship, orbit guides, labels, velocity vector, Sound, Quality (Auto/Low/Medium/High), camera follow (selection/ship), thrust power. Canvas: drag to orbit, wheel or two-finger pinch to zoom; clicking a planet or its label selects it. Camera focus and reset ease smoothly and stop as soon as the user drags.

## Quality budgets

| Tier | Sphere segments | Clouds | Post | Max objects | Prediction points | DPR | Sun |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Low | 24 | no | none | 16 | 48 | 1 | textured sphere |
| Medium | 40 | no | bloom + vignette | 32 | 90 | 1.25 | shader photosphere |
| High | 64 | yes | bloom + vignette | 48 | 120 | 1.6 | full shader |

Auto measures FPS in 2 s windows: drops a tier below 28 FPS, rises after three windows above 55.

## Lighting

Because distances are squeezed, the Sun is a constant-intensity point light (no distance falloff, intensity 2.4) with a dim blue fill light (0.035). Glow applies only to the brightest pixels (threshold 0.95). Saturn's ring uses radial texture coordinates: u = (r − inner)/(outer − inner).

## Preferences

Stored under `voyage.sim.preferences.v3`: quality, labels, orbit guides, velocity vector, camera follow, thrust power, time scale, selected body. Each field is validated on load. Sound always starts off because browsers only allow audio after a user gesture.

## Audio

The Sound toggle creates/resumes the `AudioContext` inside the click, plays a confirmation tone, drives an engine hum from throttle and plays impact tones. Suspended when the tab is hidden; closed on leaving the page.

## Limitations

- Planet orbits are circular and coplanar; no moons; the station is held co-moving with Earth (station-keeping), not on a free orbit.
- Landing zones don't rotate with the planet's surface texture.
- Ring collision thickness is widened to 50 km for robust contact.
- Time scales are bounded at 100×; interplanetary transfers take minutes of real time.
