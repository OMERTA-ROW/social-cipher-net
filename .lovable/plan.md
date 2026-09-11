# Clean up Cyber World windows

## Goal
Remove redundant and placeholder floating-window launchers from Cyber World while preserving every connected-platform window and the existing draggable, resizable, multi-window behavior.

## Changes
- Inventory every Cyber World floating-window launcher and classify it as platform-specific, shared functional control, duplicate, placeholder, or obsolete.
- Remove generic aggregate or empty placeholder windows that duplicate platform-owned experiences.
- Keep platform-specific windows and their existing launch behavior.
- Leave the shared floating-window system unchanged so dragging, resizing, closing, workspace placement, and multiple simultaneous windows continue to work.
- Remove imports and state used only by deleted windows.

## Verification
- Confirm Cyber World renders without errors.
- Confirm retained platform windows can open together and still expose drag, resize, workspace, minimize, and close controls.
- Report the exact removed and retained window names after verification.

## Assumption
“Windows” means floating panels opened through Cyber World controls, not ordinary page sections or statistic cards.
