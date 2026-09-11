# Cyber World cleanup and chart workspace upgrade

## Goals
- Remove redundant and placeholder floating-window launchers from Cyber World while preserving connected-platform windows.
- Upgrade the existing real-data multi-chart workspace with draggable, resizable, pinnable, and shareable chart windows.

## Cyber World cleanup
- Inventory every Cyber World floating-window launcher and classify it as platform-specific, shared functional control, duplicate, placeholder, or obsolete.
- Remove the dead-end generic Trading Platforms window and the placeholder Stream Preview and Platform Chat windows.
- Keep the live Crypto Markets, Stock Market, and NFT Marketplace windows.
- Keep connected-platform chat windows where they are generated per platform.
- Leave the shared floating-window system unchanged so dragging, resizing, closing, workspace placement, and multiple simultaneous windows continue to work.
- Remove imports and state used only by deleted windows.

## Multi-chart workspace
- Replace the fixed chart grid surface with a bounded, smoothly scrollable workspace containing independent chart windows.
- Add drag and resize handles to every chart, with responsive clamping and a compact stacked fallback on small screens.
- Add a pin control per chart. Pin state and position persist in session storage across navigation, while saved layouts continue using the existing per-user database tables.
- Add a post control that captures only the selected rendered chart, uploads the snapshot to the existing post-media storage flow, and creates a normal feed post with ticker, timeframe, chart type, indicators, source, and timestamp.
- Preserve independent ticker, timeframe, indicators, live source/freshness states, and native price/time zoom and scroll behavior.
- Apply the upgraded chart surface wherever the shared chart-pane workspace is used, without changing market-data providers or inventing values.

## Verification
- Confirm Cyber World renders without errors.
- Confirm retained platform windows can open together and still expose drag, resize, workspace, minimize, and close controls.
- Confirm multiple charts drag, resize, pin across navigation, zoom independently, and post a visible snapshot to the signed-in user's feed.
- Check desktop and mobile layouts, current build output, and browser console.
- Report the exact removed and retained window names after verification.

## Assumption
“Windows” means floating panels opened through Cyber World controls, not ordinary page sections or statistic cards.
