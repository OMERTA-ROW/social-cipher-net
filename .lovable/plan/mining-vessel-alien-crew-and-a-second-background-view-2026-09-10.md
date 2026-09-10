# Mining vessel, alien crew, and a second background view

Adds a real 3D mining ship crewed by the Draco and Grey aliens, makes the default
background a chase-cam behind that ship, and adds a second selectable background
that shows the aliens' mining operation. Site layout, colors and fonts are untouched.

## 1. The ship and crew

- Download CC0 GLB models into `public/models/`: a spacecraft hull for the mining
  vessel, and two humanoid alien figures (tall Draco, small Grey) for the crew.
  Sources are CC0-only (poly.pizza / Quaternius / Kenney), verified per model.
- Upgrade every downloaded model's materials in code to PBR: procedurally generated
  metal/panel/scale/skin maps with roughness, metalness and normal relief, lit by the
  scene's single sun. Additional greebles (thruster nacelles, mining rig arms, cargo
  pods, running lights) are built as real geometry on the hull.
- The crew sits inside a lit cockpit volume behind a glass canopy: Draco at the helm,
  Greys at the mining consoles, each with idle animation (breathing, head turns, arm
  work at the consoles) so they read as living creatures.
- Assumption to flag: CC0 libraries do not ship scanned photoreal alien characters.
  Realism comes from the material/lighting/animation upgrade layered on solid base
  meshes, not from photogrammetry assets.

## 2. Default view — solar system chase cam

- The existing solar system, sun, planets, starfield and galaxy stay exactly as they are.
- The ship flies a long closed route weaving between planets; the camera trails it at a
  fixed offset with eased banking, so the solar system stays the hero.
- Ship travel and camera follow reuse the current smoothing/damping feel.

## 3. Second view — alien world / mining operation

- A separate scene, same rendering standard, running a looping sequence of beats:
  approach and dock at a planet, descend and land, mine an asteroid cluster with cutting
  beams and debris, plant a conquest beacon claiming the world, lift off, and a short
  Draco-vs-Grey ship skirmish with tracer fire before jumping to the next world.
- The camera follows the operation, not a fixed orbit — it tracks the ship and the mining
  site through each beat.
- Fully real-time rendered: procedural planet surfaces, asteroid fields, beam/impact/dust
  effects, no video or image loops.

## 4. Switching and persistence

- `spaceBackgroundSettings` gains a `view: "solar" | "mining"` field, persisted in
  local storage alongside mode and dim.
- The background selector popover gets a two-option view switch above the existing
  Full/Lite/Off row, matching the current button styling.
- Both views honour Lite mode, reduced motion, hidden-tab pausing and the dim slider.

## Technical notes

- New files under `src/components/space/scene/`: `MiningVessel.tsx`, `AlienCrew.tsx`,
  `ShipRoute.tsx`, `ChaseCamera.tsx`, `MiningWorldScene.tsx`, plus effect helpers.
- `SpaceScene.tsx` branches on the selected view; both branches share starfield, galaxy
  and post-processing so cost stays comparable.
- Models are lazy-loaded and Suspense-wrapped inside the Canvas; Lite mode drops the crew
  detail and lowers segment counts to hold the mobile performance budget.
- Verified with in-sandbox screenshots of both views plus a build and typecheck.
