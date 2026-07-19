## Goal
Make the realistic space background configurable, and layer a "Solar System Voyage" experience on top with multiple realistic camera views culminating in AI bots harvesting resources.

## 1. Configurable `RealisticSpaceBackground`
Add typed props (all optional, with current values as defaults):

- `intensity`: `"calm" | "normal" | "vivid" | "hyper"` — scales shooting-star frequency, ripple strength, aurora radius, dust reactivity.
- `palette`: `"cosmic" | "draco" | "brain" | "solar" | { primary, secondary, accent }` — drives aurora glow, ripple color, nebula tint, shooting-star hue.
- `starDensity`: `number` (0.1–3.0, default 1.0) — multiplies star / dust / shooting-star counts against current baselines.
- `parallax`: `boolean` (default true) — disables mouse parallax for low-power.
- `interactive`: `boolean` (default true) — disables click ripples / hover repulsion.
- `backgroundImage?`: `string` — override the base nebula image.

Internals: replace the current hardcoded constants with values derived from these props, memoized on prop change; existing call sites keep working (defaults reproduce today's look).

## 2. Solar System Voyage overlay
New route `/voyage` + `SolarSystemVoyage.tsx` full-screen component sitting on top of `RealisticSpaceBackground` (palette=`solar`). Built with react-three-fiber (already present) using realistic textures for Sun + 8 planets, orbit rings, asteroid belt, and a player ship traveling along a spline path from the Sun outward toward a mining asteroid field.

### Multi-view mode switcher (top-right HUD)
1. **Cockpit** — first-person from ship, HUD reticle, warp streaks tied to speed.
2. **Chase** — third-person follow cam behind the ship.
3. **Orbital** — free orbit around currently-focused body (reuses POV 14 controls).
4. **Cinematic** — auto-cutting cameras between planets on a timer.
5. **Planet Close-up** — click any planet to zoom, showing realistic surface + atmosphere shader.
6. **Harvest View** — snaps to the asteroid field where AI bots work (see §3).

Keyboard: `1–6` switches views; `Space` toggles auto-travel; scroll adjusts warp speed.

### Travel system
- Ship follows a Catmull-Rom curve through waypoints (Sun → Mercury → … → Asteroid Belt).
- Warp speed slider (0.25×–8×); at ≥4× enables light-streak post effect.
- Distance / current target / ETA readout in HUD.

## 3. AI bot harvesters
- Small fleet of Zozo (grey) and Draco (red) alien ships modeled as low-poly GLTF-style meshes (procedural, no external assets) orbiting/latching onto asteroids.
- Each bot emits a mining beam (animated shader line) to an asteroid; asteroid slowly shrinks and drops a glowing resource that flies to a central "CyberLink Hauler."
- Live HUD panel: bot count, resources/min, active target, mode (Zozo=stealth, Draco=aggressive).
- Clicking a bot opens the existing `BotProfileModal` for that persona.

## 4. Wiring & entry points
- Add "Solar Voyage" tile on Space Voyage tab (POV 15) and a launcher button in main nav.
- Global 4-click background close still exits the overlay.
- Uses existing `useFloatingWindowsContext` so opening `/voyage` also works as a floating tab.

## Technical notes
- Files touched:
  - `src/components/RealisticSpaceBackground.tsx` — add props, refactor constants.
  - `src/types/spaceBackground.ts` — new palette/intensity types.
  - `src/pages/SolarSystemVoyage.tsx` — new route.
  - `src/components/voyage/` — `Ship.tsx`, `Planet.tsx`, `AsteroidField.tsx`, `HarvesterBot.tsx`, `ViewSwitcher.tsx`, `VoyageHUD.tsx`.
  - `src/App.tsx` — register `/voyage` route.
- Reuse `@react-three/fiber` + `@react-three/drei` if already installed; otherwise add.
- Palette presets live in one `palettes.ts` map so future modes (e.g. Brain) can reuse.
- No backend changes; harvesting is visual only (no DB writes) unless you want persistent resource tallies.

## Out of scope (ask if wanted)
- Persisting harvested resources to a `voyage_resources` table.
- Multiplayer / other users' ships visible in the same system.
- VR / gyroscope camera on mobile.
