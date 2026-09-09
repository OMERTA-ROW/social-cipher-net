# Real-time 3D space environment

Replace the current flat full-screen shader background with a true 3D scene: a perspective camera drifting on a slow orbital path through procedurally generated space, with live crypto market data driving comets and ambience. No image files anywhere in the space layer.

## What the visitor sees

- Depth that moves: near stars sweep past, far stars barely shift, so the drift feels like real travel.
- Stars colored by temperature (blue-white, white, yellow, amber, red), varied brightness, gentle twinkle, soft glow on the brightest.
- Fast near stars leave short trails in the direction of travel.
- A soft Milky Way band and nebula clouds far behind everything, built from noise, drifting correctly against the near stars.
- Planets on tilted elliptical orbits, spinning on their axes, each surface generated in code (terrain noise, cloud bands, day/night edge, atmospheric rim).
- Live market pulse: when a tracked coin moves sharply, a comet fires — green rising, red falling, brighter and faster for bigger moves. Volatility gently lifts overall brightness and drift speed.
- Everything falls off into pure black at the edges; UI colors, fonts and layout untouched.

## Technical plan

New folder `src/components/space/scene/`:

- `SpaceScene.tsx` — `<Canvas>` with perspective camera (fov 60), `gl` alpha false, dpr capped, `frameloop` gated on tab visibility. Mounts all layers plus post-processing.
- `CameraRig.tsx` — camera follows a slow Lissajous/orbital path with eased look-at and banking; speed scales with market volatility; frozen for `prefers-reduced-motion`.
- `Starfield.tsx` — 4 depth shells (radii ~120/300/700/1600), total ~45k points on desktop / ~9k on low power. One `THREE.Points` per shell with a custom shader: per-star temperature color, size attenuation, twinkle from time+seed, soft radial falloff for glow. Shells counter-rotate at different rates for parallax.
- `StarTrails.tsx` — nearest shell rendered a second time as instanced stretched quads oriented along camera velocity, additive, opacity scaled by speed.
- `Galaxy.tsx` — large inward-facing sphere with a fragment shader: fbm-based Milky Way band along a tilted great circle plus multi-octave nebula clouds (deep blue/violet/faint magenta), rendered with `BackSide`, `depthWrite` false, tone-mapped to fade into black.
- `Planets.tsx` — 5 bodies. Orbits: parametric ellipse with per-body semi-major axis, eccentricity, inclination and phase; period from a Kepler-style `a^1.5` so inner bodies move faster. Each planet is a sphere with a shader material: 3D fbm terrain/banding, cloud layer offset in time, Lambert term from the star's position for a true terminator, Fresnel rim glow. One `pointLight` + emissive star sphere as the single light source.
- `MarketComets.tsx` — instanced comet heads + tapered tails spawned from market events, travelling across the frustum with a lifetime, tinted by direction, sized/sped by move magnitude.
- `useMarketPulse.ts` — subscribes to Binance's public combined ticker websocket (`wss://stream.binance.com:9443/stream?streams=btcusdt@ticker/ethusdt@ticker/solusdt@ticker/bnbusdt@ticker`); no key needed. Falls back to polling the existing `get-crypto-prices` function if the socket fails. Exposes `{ events, volatility }` through a small external store so the scene reads it without re-rendering React each tick.
- Post-processing via `@react-three/postprocessing@^2` (fiber 8 compatible): Bloom, subtle ChromaticAberration, Noise (film grain), Vignette. Disabled entirely on low-power devices.

`SpaceBackground.tsx` swaps `ProceduralSpace` for `SpaceScene`, keeping the existing black base, dim veil, vignette, `pointer-events-none`, visibility pause and Full/Lite/Off modes. `ProceduralSpace.tsx` is removed.

Performance: instanced/points geometry only, no per-frame allocation, particle counts and post-processing scaled by the existing `isLowPowerDevice` probe, DPR capped at 1.5 (1 on lite), reduced-motion renders a single static frame.

Verified with a Playwright screenshot of the running app before finishing.
