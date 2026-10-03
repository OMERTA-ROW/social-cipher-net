# CyberLink background asset audit

Date: 2026-10-03. Scope: homepage shared space renderer and current `/voyage` source. Source assets remain recoverable in `src/assets/space`; this change removes consumers rather than deleting files.

## Retired decorative cosmic art

All eight files were imported by `src/components/space/CosmicAnomalies.tsx`, loaded eagerly through `THREE.TextureLoader`, and mapped onto decorative black-hole, comet, galaxy, nebula, pulsar, quasar, supernova, or wormhole geometry. The visual set conflicted with the restrained directional sky. The loader and all decorative event rendering were removed. Physical `MarketComets`, Voyage obstacles, and asteroid systems remain unchanged.

| Source path | Deployed URL observed | Issue | Repair | Final renderer |
|---|---|---|---|---|
| `src/assets/space/blackhole.jpg` | Bundled asset URL; live request returned 200 in supplied audit | Bright decorative event art | Consumer removed; source retained | None |
| `src/assets/space/comet.jpg` | Bundled asset URL; live request returned 200 in supplied audit | Decorative comet duplicated physical systems | Consumer removed; source retained | `MarketComets` / physical objects only |
| `src/assets/space/galaxy.jpg` | Bundled asset URL; live request returned 200 in supplied audit | Decorative galaxy detail competed with scene | Consumer removed; source retained | Procedural `DeepSky` haze and `Starfield` |
| `src/assets/space/nebula.jpg` | Bundled asset URL; live request returned 200 in supplied audit | Bright nebula art | Consumer removed; source retained | Procedural low-contrast haze |
| `src/assets/space/pulsar.jpg` | Bundled asset URL; live request returned 200 in supplied audit | Decorative event art | Consumer removed; source retained | None |
| `src/assets/space/quasar.jpg` | Bundled asset URL; live request returned 200 in supplied audit | Decorative event art | Consumer removed; source retained | None |
| `src/assets/space/supernova.jpg` | Bundled asset URL; live request returned 200 in supplied audit | Flashing decorative event art | Consumer removed; source retained | None |
| `src/assets/space/wormhole.jpg` | Bundled asset URL; live request returned 200 in supplied audit | Decorative event art | Consumer removed; source retained | None |

## Retired photographic deep sky

| Source path | Deployed URL | Issue | Repair | Final renderer |
|---|---|---|---|---|
| `src/assets/space/stars_8k.jpg.asset.json` | `/__l5e/assets-v1/80957427-1237-4a76-ada6-c3c281a8f5f6/stars_8k.jpg` | 1,905,513-byte photographic sphere duplicated procedural stars | Import/export and `DeepSky` consumer removed | Directional procedural star shells |
| `src/assets/space/stars_milky_way.jpg.asset.json` | `/__l5e/assets-v1/daab4631-93f6-4a74-936d-e8cfab8fc16b/stars_milky_way.jpg` | Photographic fallback sphere | Import/export and consumer removed | Directional procedural star shells |
| `src/assets/space/nebula_orion.jpg.asset.json` | `/__l5e/assets-v1/67384015-eeaa-48d0-84a5-ec58bbc71d1c/nebula_orion.jpg` | Additive plane used `depthTest=false` | Import/export and panel removed | Procedural navy/black haze shell |
| `src/assets/space/nebula_carina.jpg.asset.json` | `/__l5e/assets-v1/d3fe61ae-5bea-4293-bd9f-64672a064db8/nebula_carina.jpg` | Additive plane could cover physical geometry | Import/export and panel removed | Procedural navy/black haze shell |
| `src/assets/space/nebula_eagle.jpg.asset.json` | `/__l5e/assets-v1/2a2a5b42-f53c-4a39-8804-f364807682f4/nebula_eagle.jpg` | Bright rectangular photographic layer | Import/export and panel removed | Procedural navy/black haze shell |
| `src/assets/space/nebula_horsehead.jpg.asset.json` | `/__l5e/assets-v1/a6126a82-2a51-4393-928f-5ca40c51b70a/nebula_horsehead.jpg` | Bright rectangular photographic layer | Import/export and panel removed | Procedural navy/black haze shell |

## Removed screen overlays

| Source | Issue | Repair | Final renderer |
|---|---|---|---|
| `.space-depth-light` | Full-screen light layer covered scene geometry | JSX and CSS removed | Scene-space procedural haze |
| `.space-depth-haze` | Full-screen gradient covered geometry | JSX and CSS removed | Early deep-sky shell |
| `.space-depth-grain` | Full-screen SVG turbulence covered geometry | JSX and CSS removed | Sparse shader dust only |

The readability dim veil and radial vignette remain in `SpaceBackground`. The 2D procedural canvas fallback remains for unavailable WebGL and reduced-motion operation.

## Additional consumers retained

- Planet, cloud, ring, Moon, and Sun asset pointers in `realTextures.ts` remain valid physical surface textures.
- `worldTextures.ts` procedural canvases remain terrain/material generators, not screen backgrounds.
- `procTextures.ts` asteroid surface texture remains attached to physical asteroid geometry.
- `CyberSpaceBackground.tsx`, `RealisticSpaceBackground.tsx`, and `SolarSystemBackground.tsx` are legacy/local components not imported by the shared `SpaceBackground` or current Voyage route; they were not altered.

## Release isolation

The production response exposed deployment ID `psr2.6895a948-4d0f-40c3-9492-b4e8c80cd626.1791660258.sZQC8sgIzMPfYkbZ9Y0X0m0dTq9--d6J8oR49PRCWsg` and bundles `assets/index-BDODwk5j.js` / `assets/index-COJQm8le.css`, but no Git commit hash. Therefore the exact live source revision cannot be proven from available metadata. This Vite app deploys as one bundle; no supported background-only isolated release mechanism was found. Publishing current HEAD would include the newer Voyage interface, so production release is blocked until the live revision can be checked out separately and the reviewed background patch applied there.