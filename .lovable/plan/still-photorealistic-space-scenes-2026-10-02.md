# Still, Photorealistic Space Scenes

## Goal
Make the shared CyberLink background, `/backgrounds`, and `/voyage` visually coherent and still by default, using the existing sourced astronomy imagery accurately and preserving manual exploration.

## What will change
- Freeze autonomous planet orbits/spin, star twinkle, nebula and galaxy drift, anomaly cycles, solar flares/beams, moving noise, market comets, ship autopilot, focused-camera auto-rotation, and cinematic auto-cuts.
- Start Voyage paused with orbit speed at zero. Travel only begins from the existing explicit travel control; manual drag, zoom, planet selection, and all six view modes remain.
- Keep palettes, quality settings, and saved presets intact while updating labels that currently promise automatic motion.
- Use the sourced planetary, solar, ring, cloud, Milky Way, Hubble, and Webb imagery as restrained scene textures—not rectangular content cards.
- Improve natural lighting, terminators, cloud/ring presentation, and material response without inventing a live NASA service or replacing existing assets unnecessarily.

## Texture and reliability work
- Stop using planetary color imagery as a fake bump map; only actual data/normal textures or procedural asteroid maps will affect relief.
- Correct color-space and wrapping choices by texture role, cap anisotropy to renderer capability, and keep quality-scaled geometry/resolution budgets.
- Repair lazy texture state when URLs change, remove failed promises from cache so later attempts can retry, prevent stale requests from winning, and dispose texture clones safely.
- Keep fallbacks non-throwing so a failed texture request cannot blank the app.
- Tighten attribution wording to match the documented source chain and distinguish direct mission imagery, derived texture sets, and in-app procedural materials.

## Verification
- Add focused tests for still defaults and texture-loader URL changes, retry behavior, stale-result protection, and cleanup where practical.
- Run project tests, TypeScript, focused lint, and check the latest preview build diagnostics.
- Inspect the default background, `/backgrounds`, and `/voyage` once each at desktop and mobile widths.
- Compare idle frames to confirm no autonomous scene motion, then verify manual drag/zoom, planet selection, and explicit travel still work.
- Check texture requests, failed-request recovery, runtime console, stacking, readability, and mobile control fit.

## Scope
- Frontend space presentation only, preview only. No publishing, backend changes, paid assets, business logic, or unrelated UI redesign.
