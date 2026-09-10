# Living Multiverse — Staged Build Plan

Goal: grow the current space background into a continuous multiverse you can fly through — from deep space, to a planet, through the atmosphere, down to a rain-slick cyberpunk street — plus motherships, portals, docking, and distinct alien worlds. Built in stages so there is always a working, fast version.

Nothing about the site's layout, colors, fonts, or component positions changes. The solar-system chase view stays the default.

## Guiding rules for every stage

- Mobile first on cost: a quality tier (Ultra / High / Balanced / Battery) drives detail counts, texture sizes, effects, and pixel ratio. Existing Full/Lite/Off modes stay and feed into it.
- Everything repeated (buildings, crowds, ships, traffic, windows) is drawn with instancing, not one object each.
- Detail loads in bands by camera altitude and unloads behind you, so memory stays flat.
- Anything not on screen is simulated cheaply, so the world keeps living without costing frames.

## Stage 1 — Foundation (this stage)

The plumbing everything else plugs into, with a visible result.

- **Quality tiers**: new setting with device auto-detect, exposed in the existing background popover (same styling, no layout change).
- **Altitude/zoom system**: a single "camera depth" value shared by the scene, running continuously from deep space → orbit → atmosphere → rooftops → street, with smooth crossfades between bands.
- **LOD + streaming manager**: registry where any world part declares what it shows at each band, plus budget caps per tier and automatic unloading.
- **Frame budget monitor**: measures real frame time and steps detail down (then back up) automatically, so a weak phone degrades instead of stuttering.
- **Destination system**: named places (Earth, stations, worlds) in one registry with position, scale, and which content module owns them.
- **Proof of it working**: continuous descent onto a placeholder Earth — orbital globe with clouds, atmosphere shell entry, then a blocked-out city grid from above — with no pop or blur-out between bands.

## Stage 2 — Earth from orbit to rooftops

- Photoreal Earth: surface, ocean specular, cloud layer, night-side city lights, atmospheric scattering on entry.
- City generated procedurally in blocks: districts, street network, towers with real facade materials, instanced windows and rooftop clutter.
- Volumetric haze, searchlights, weather.
- Rooftop-band detail: signage, antennas, skybridges, flying traffic lanes.

## Stage 3 — Street level

- Wet asphalt with reflections, puddles, sidewalk and gutter detail, animated rain.
- Neon signage (emissive, animated), holograms, storefronts.
- Instanced crowds and ground/air traffic with simple lane AI.
- Ship landing pad and disembark framing for Zozo and Draco.

## Stage 4 — Society in space

- Motherships and megaships at fixed locations, with lit interiors visible through hull openings and docking bays with activity.
- Docking sequences: approach, alignment, clamp, departure — for the player ship and for AI traffic.
- Interdimensional terminals/portals with a travel transition between distant locations.

## Stage 5 — Other worlds

- Three to five distinct planets, each with its own surface material set, atmosphere, weather, and civilization style (no reskins).
- Each gets the same continuous orbit → surface descent as Earth.

## Stage 6 — Life and polish

- Background simulation so traffic, crowds, and ship movements progress whether or not you are watching.
- Ambient events: convoys, launches, storms, market-reactive lighting.
- Final performance pass and per-tier tuning on real mobile hardware.

## Technical notes

- Stack stays React Three Fiber 8 / drei 9 / three 0.160 (React 18) — no version jumps.
- New files under `src/components/space/world/`: `qualityTiers.ts`, `altitude.ts`, `lodManager.tsx`, `destinations.ts`, `frameBudget.ts`, plus a `DescentScene` used by the new view.
- Quality tier added to `src/lib/spaceBackgroundSettings.ts` (persisted alongside mode/view/dim) and a new `view` option registered in `BackgroundControl` using the existing button styling.
- `SpaceScene.tsx` gains the new view branch only; `solar` and `mining` paths are untouched.
- Textures: procedural/canvas-generated where possible; any bundled image assets go through the CDN asset pipeline rather than the repo. Materials use mipmaps, anisotropy capped per tier, and KTX-style size ladders by band.
- All motion uses frame delta with clamped steps; damping is exponential so behaviour is frame-rate independent.
- Verification each stage: browser screenshots at several altitudes plus a frame-time readout at Battery tier.
