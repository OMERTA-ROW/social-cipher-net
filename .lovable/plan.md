# Spaceship-based Zozo, Draco, and miners interface

Remove Zozo and Draco as standalone page overlays. Their existing assistant and purchase functions will instead open from the crewed mining ship already flying through the galaxy background.

## Changes

- Remove the global floating alien launcher and every embedded standalone Draco launcher/window.
- Remove the old Draco/Zozo mining-image overlays and the Draco Mining background-gallery entry so neither character appears as a detached page decoration.
- Keep Zozo and Draco visibly seated inside the existing 3D ship cockpit in full-detail mode, with the current animated crew treatment.
- Add an accessible click/tap target that follows the rendered ship on screen. It will only intercept interaction over the ship, leaving normal page controls untouched.
- Open one shared ship interface from that target, with a clear Zozo/Draco switch and the existing assistant capabilities for the selected character.
- Add a Miners area inside the same interface. Zozo and Draco miner purchase actions will reuse the existing authenticated checkout/subscription flows that unlock mining access, rather than inventing a second payment system.
- Preserve existing page layouts, visual themes, galaxy rendering, subscriptions, and mining history.

## Technical details

- Project the vessel's live 3D world position into screen coordinates and publish it to the background wrapper; place a small transparent accessible button over that projected ship location.
- Convert `AIBotAssistant` to a ship-triggered interface with no persistent floating launcher and constrain its persona switch to Zozo and Draco.
- Route contextual Draco entry points through the ship interface or remove redundant embedded windows, while preserving chart data and real-market behavior.
- Remove obsolete mining overlay imports/renders and verify no remaining standalone Zozo/Draco widget mounts exist.
- Verify desktop and mobile ship interaction, Zozo/Draco switching, miner checkout entry, normal page click-through, both reduced-motion/full modes, and a clean build/runtime console.

## Assumption

“Purchase miners” means purchasing the existing Zozo or Draco plans that unlock their mining features. No new miner product catalog or pricing will be created.