# Coherent navigation, live posts, and hologram titles

## Build

### 1. One navigation system
- Make `AppShell` the shared shell for every normal app page, preserving its header, remembered sidebar state, content spacing, and mobile navigation.
- Add a shared page-heading area to the shell with:
  - a reliable back action,
  - breadcrumb links derived from the route map,
  - the page title,
  - a one-line section description,
  - an optional actions area for page-specific controls.
- Keep purpose-built screens inside the same navigation model without breaking their experience:
  - Arena keeps its specialized controls but gains the same global exit/back behavior and section identity.
  - Space Voyage and Backgrounds keep their full-screen canvases but gain a consistent visible return control.
  - Auth, OAuth consent, redirects, and payment/verification callbacks remain focused system flows; they get a clear Home/back path rather than sidebars that conflict with the task.
- Retire the legacy top-only navigation component after all pages have moved to the shared shell.

### 2. Route and interaction cleanup
- Create one route registry for page names, descriptions, breadcrumbs, and navigation visibility so the router, shell, and navigation cannot drift apart again.
- Keep Home, Dashboard, Profile, Studio, Arena, Cyber World, and Monetization as direct one-click destinations from Home and the shared sidebar.
- Fix known broken destinations:
  - `/cyber-gamers` → `/cyber-arena` in the portal and assistant commands.
  - the portal’s Marketplace tile → `/shop`.
  - the live room’s Studio link → the real Broadcast tab instead of an ignored query value.
  - Arena member actions → the selected person’s profile or their actual live room, not the generic Studio page.
- Remove or replace controls that only present fake or inactive destinations, including the Arena’s invented game/tournament cards, Studio’s static preview window, and any remaining “coming soon” action.
- Wire real commerce cards to product details and real affiliate-link creation, and expose role-appropriate destinations such as Seller tools, Advertising, Moderation, and the owner console only where access permits.
- Validate every static internal link against the route registry and add a regression test that fails on an unknown internal path.

### 3. Go Live from every post composer
- Keep **Go Live** beside Photos and Videos in both post composers.
- Consolidate Studio and composer streaming onto one start/end implementation so every live session creates one stream, one host membership, and one feed announcement.
- Make Studio honor a broadcast-tab deep link and route a newly started live session to its watch room.
- Keep separate streams per section.
- Ensure each live feed card shows its live/ended state and links to `/live/:streamId`.
- Connect the Studio broadcast panel to the same live session and existing OBS/Streamlabs/Restream ingest record.
- Preserve the truthful unavailable state when no ingest server or playback URL is configured; never display a simulated camera preview or fake live video.

### 4. Hologram page headings
- Add dedicated semantic blue and faint-purple hologram tokens without changing the site’s existing primary colors.
- Add one reusable title treatment with transparent fill, a crisp blue outline, faint purple edge, restrained glow, and subtle shimmer.
- Apply it only to page-level titles across the app, including dynamic profile, store, product, and live-room titles; keep body text and component headings unchanged.
- Support wrapping and truncation for long names and disable shimmer under reduced-motion preferences.

## Technical details
- Add `AppRouteMeta` and a single route metadata collection consumed by `App.tsx` and `AppShell`.
- Extend `AppShell` with optional title, description, actions, breadcrumb, width, and full-bleed controls instead of creating another shell.
- Use semantic CSS variables and a `.hologram-title` utility in the global stylesheet; do not alter the existing typography, galaxy background, or page-specific spacing beyond shell normalization.
- Replace Studio’s duplicate `useLiveStream().startStream` path with the existing feed-aware `startLiveStream()` path and keep moderation/participants intact.
- The present code has no real media server or browser video transport. This pass will fully connect session creation, feed publication, Studio ingest controls, and watch-room routing. Actual OBS video playback can only activate when a real RTMP/SRT-to-playback service supplies a playback URL; the interface will state that clearly rather than pretending video exists.

## Verification
- Run a static route audit covering all 40 registered routes and every literal internal `Link`/`navigate` target.
- Test the main paths on desktop and mobile: Home → each primary destination → a sub-page → Back/Home.
- Test sidebar collapse persistence across page changes.
- Test composer → Go Live → feed announcement → watch room → Studio Broadcast → End Live.
- Confirm every major landing page has exactly one hologram page title and one-line description.
- Check reduced motion, long dynamic titles, horizontal overflow, and that no inactive buttons or fabricated content remain.
- Run focused tests, type checks, and confirm the preview builds cleanly.

## Final report
- List every registered route with its purpose and the in-app path that reaches it.
- List every dead link, inactive control, stub, or duplicate removed or rewired.
- Separate intentional callback/redirect routes from user-facing navigation.
- State the remaining external live-video dependency clearly if no playback service is configured.
