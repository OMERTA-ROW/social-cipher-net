# Living Cosmic Events

## Goal
Replace the flat space-wonder photographs with coherent, animated 3D phenomena shared by the normal site background and Voyage, while preserving all UI and travel controls.

## What will change
- Remove the repeated `SkyPhotos` billboard sky and stop rendering each anomaly as a duplicated photograph.
- Build spatial black holes, wormholes, nebula volumes, spiral galaxies, supernova remnants, pulsars, quasars, and traveling comets from shaders, particles, ribbons, rings, shells, and instanced geometry.
- Reuse the existing anomaly images only as subtle color/detail modulation where useful; geometry, particles, parallax, and internal shader motion will define each event.
- Place a curated event set around the default camera path so activity is visible behind normal pages without overwhelming text, then use a larger, richer set in Voyage.
- Preserve Voyage’s six camera modes, planet focus, warp/pause, quality controls, palettes, presets, planets, asteroids, Sun, and ship.

## Event behavior
- **Black holes:** opaque event-horizon core, warped photon rim, independently flowing accretion rings, and sparse infalling matter.
- **Wormholes:** deep tunnel geometry with animated distortion, flowing interior particles, and a refractive-looking rim.
- **Nebulae:** layered volumetric particle clouds and shader noise with slow gas evolution and real depth/parallax.
- **Galaxies:** dimensional stellar point clouds with rotating spiral arms, central bulge, dust lanes, and restrained motion.
- **Supernovae:** emissive expanding shells plus ejecta particles using a continuous fade/reset cycle with no visible pop.
- **Pulsars:** compact stellar core with true sweeping cone/beam geometry and a surrounding particle field.
- **Quasars:** bright accretion center with opposing animated particle jets and a compact rotating disk.
- **Comets:** occasional pooled travelers with rocky heads, evolving comae, and particle tails that trail their motion.

## Technical details
- Split the large anomaly file into focused event components and shared deterministic texture/particle helpers.
- Drive every animation from bounded frame delta and freeze all shader clocks, particle updates, rotations, and lifecycle timers when animation is disabled.
- Use deterministic seeded layouts, shared geometries/material inputs, instancing or single point-cloud draw calls, capped pixel ratio, and quality-scaled particle counts.
- Map site quality tiers to event density; low-power views keep a reduced but recognizable static spatial set, while reduced-motion freezes all effects.
- Dispose programmatically created geometries, materials, and textures when their owning component unmounts.
- Keep existing deep-sky imagery as the distant astronomy layer, but prevent it from duplicating the new nearby events.
- Record the shared cosmic-event architecture in `AGENTS.md`.

## Verification
- Add focused tests for quality budgets, deterministic placement, lifecycle continuity, and animation gating.
- Run relevant tests, TypeScript checks, lint for changed files, and confirm the preview build log is clean.
- Browser-check the default background, `/backgrounds`, and `/voyage` at 1280px desktop and phone width.
- Compare timed screenshots and scene telemetry to confirm internal motion when enabled and frozen frames under reduced motion/pause.
- Check for blank canvases, missing assets, console/runtime errors, overflow, obstructed controls, and unreadable page content.

## Scope
- Frontend 3D presentation only. No backend, auth, exchange, content, navigation, publishing, or unrelated theme changes.
