# Architecture rules

- All third-party account OAuth uses `connector-oauth`; legacy social OAuth functions stay disabled so they cannot bypass one-time state, PKCE, identity verification, or encrypted credential storage.
- OAuth callbacks always return to `/auth/callback` (allowlisted origins, URL derived server-side); it separates integration, recovery and sign-in returns, and connections require a provider-verified identity before activation.
- Connection rows are written only by server code (members read their own) so no client can mark a service Connected.
- Shared and Voyage space views use an early procedural deep-sky shell and subdued directional star layers; decorative cosmic-event imagery never renders.
- Solar effects are one shared 3D system attached to the star in both space views so pause, reduced motion, and quality behavior stay consistent.
- Every active space viewport reuses the shared astronomical sky, sourced celestial textures, soft-particle events, and motion/quality gates so mining and descent never fall back to flat celestial stand-ins.
- Shared space scenes use continuous restrained drift, pointer parallax, reduced-motion gating, and quality-scaled deterministic rendering; sourced colour maps are never reused as terrain data.
- Voyage simulation uses one fixed-timestep orbital-physics core with real planetary source data, visually compressed scale, softened gravity, swept collisions, and bounded time acceleration; every rendered physical object goes through one selection-independent physical→render mapping so drawn surfaces match collision boundaries.