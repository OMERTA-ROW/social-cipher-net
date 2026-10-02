# CyberLink Voyage simulation

## Units and scale

Physics uses kilometres, seconds, kilograms, km/s, and km³/s². Planet records retain real mean radius, mass, gravitational parameter, orbital period, axial tilt, rotation period, and semi-major axis from the linked NASA/JPL fact pages.

Rendering deliberately compresses scale:

- Planet radius: `r_visual = 0.34 × cbrt(r_real / 2439.7 km)`.
- Orbit radius: `d_visual = 3.4 + 7.1 × log10(1 + d_real / 40,000,000 km)`.
- Physics never uses visual units. The compression keeps terrestrial worlds visibly smaller than gas giants while making all eight planets explorable in one view.
- UI disclosure: “Scale optimized for exploration; relative planetary data preserved.”

## Simulation

Planets use stable period-based Kepler-style circular paths. Ship and launched-probe state carries position, velocity, angular velocity, mass, collision radius, fuel, and damage. Gravity sums softened acceleration from the Sun and all planets using each source's `mu`; softening is 250 km. The browser loop uses a 1/60-second fixed wall-clock accumulator, caps frame delta at 0.05 seconds, limits work to 12 substeps, and advances each step by the selected 1×/10×/100× simulation factor. Hidden tabs contribute no time, preventing catch-up jumps.

Orbit assist computes softened-force-consistent circular velocity around the moving selected planet. Thrust consumes fuel and supports forward/reverse, lateral, and vertical axes. Brake applies exponential damping.

## Collisions

Celestial bodies and tracked asteroids/debris use swept spheres. The station uses a swept box. Saturn's tilted ring uses an annulus crossing test. Response records impact speed/direction; minor impacts bounce with velocity loss, while major impacts cause heavier damage and expose recovery UI. Docking is restricted to the station zone at no more than 0.08 km/s relative speed. Decorative stars and dust are nonphysical.

## Rendering and controls

The shared backdrop and Voyage use deterministic procedural star shells, procedural nebular depth, restrained bloom, and textured bodies. Idle drift is continuous unless reduced motion is requested. Voyage supports drag orbit, wheel/pinch zoom, selectable planets, trajectory display, minimap, labels, orbit guides, quality settings, audio after a user gesture, keyboard thrust, and on-screen touch controls. Preferences are safely parsed from local storage. WebGL failure falls back to a procedural 2D starfield.

## Source links

Each body record links directly to its NASA Science facts page. Texture provenance remains in `src/components/space/ATTRIBUTION.md`; this is not represented as a live NASA service.
