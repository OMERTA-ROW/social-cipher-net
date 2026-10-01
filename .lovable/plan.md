# Voyage Visual Integration

## Goal
Make `/voyage` feel like the same realistic CyberLink Social universe while preserving all existing Voyage controls and behaviors.

## Changes
- Replace Voyage’s duplicate 2D background and generic star layer with the shared deep-sky imagery, layered starfield, atmospheric depth treatment, and black-space foundation already used site-wide.
- Upgrade the Voyage sun and all eight planets with the project’s real texture assets, atmosphere/cloud treatment, and Saturn ring texture while retaining Voyage’s current compact orbital scale, click targets, focus tracking, and labels.
- Replace the cone ship with the existing detailed mining vessel, keeping the current route, speed, pause, cockpit, chase, cinematic, close-up, orbital, and harvest camera behavior.
- Restyle and reorganize the controls as compact translucent HUD panels with the existing hologram title. On mobile, keep the scene visible by making control groups collapsible/scrollable and avoiding stacked panels that cover the canvas.
- Keep palette, quality, auto-intensity, focus, warp, pause, and saved presets functional. Palette changes will tint subtle atmospheric overlays rather than introduce a competing background.
- Respect reduced-motion settings by stopping decorative motion while retaining manual controls.

## Technical Details
- Reuse the shared `realTextures`, `DeepSky`, `Starfield`, `MiningVessel`, and post-processing patterns where their scale and interfaces are compatible.
- Keep Voyage’s own orbital/camera state rather than replacing it with the background scene’s autonomous camera system.
- Use one WebGL canvas and one black-space base to prevent duplicated backgrounds and hidden layers.
- Record the shared-visual reuse decision in `AGENTS.md` if this project does not already document it.

## Validation
- Run focused tests/type checks available in the project and confirm the preview build log is clean.
- Open `/voyage` in desktop and mobile viewports, verify the scene is lit and nonblank, inspect all six camera modes, focus selection, pause/resume, quality/palette controls, and preset saving.
- Check browser console/network output for missing textures or runtime errors.

## Scope
No publishing, route changes, backend changes, or unrelated feature changes.
