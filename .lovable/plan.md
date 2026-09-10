# Photoreal procedural space refinement

## Goal
Refine only the live space layer so planets, stars, nebulae, and the Milky Way feel richer and physically grounded, while making all orbital motion substantially slower and more cinematic. Keep the app interface unchanged.

## Changes
- Upgrade procedural planet shaders with multi-scale terrain and cloud detail, localized roughness/specular response, softer atmospheric scattering, richer night-side falloff, and a more natural sun-lit terminator.
- Improve the Milky Way and nebula shaders with finer dust structure, layered color variation, deeper contrast, and less uniform cloud distribution while retaining a seamless procedural sky.
- Refine stellar rendering so most stars remain sharp points while rare bright stars gain restrained, natural glow and temperature variation.
- Reduce planet orbital speeds, axial rotation, star-shell drift, galaxy movement, and camera travel by a substantial factor.
- Increase camera position, aim, and banking damping so turns ease gradually and feel heavy rather than animated.
- Retune post-processing toward realism with controlled bloom, nearly imperceptible chromatic aberration, subtle grain, and preserved edge darkening.

## Technical details
- Continue using shader-generated textures and geometry only; no image assets or photographic backdrops.
- Keep delta-time motion, capped frame deltas, Full/Lite quality behavior, market-reactive comets, visibility pausing, and reduced-motion behavior.
- Reuse the existing single local star lighting model and avoid adding flat ambient illumination.
- Validate the current build, then inspect desktop and mobile screenshots for visible depth, unobstructed content, smooth motion, and no blank WebGL frame.

## Scope
No changes to black UI surfaces, turquoise accents, typography, feed, profiles, chat, or layout.
