# Cyber Link navigation audit

## Route map

| Route | Destination / parent |
|---|---|
| `/` | Home aggregate feed; one-click links to Dashboard, Profile, Studio, Arena, Cyber World, and Monetization. |
| `/dashboard` | Creative-program and activity hub; returns through Home breadcrumbs/sidebar. |
| `/profile` | Signed-in member profile; linked from primary navigation. |
| `/messages` | Private direct messages; linked from primary navigation. |
| `/studio` | Live Studio for OBS, Streamlabs, Restream, and live-session controls. |
| `/theater` | Movie Theater screenings, watch sessions, posts, and discussion. |
| `/connectors` | Real service connection and credential-status management. |
| `/shop` | Active Cyber Link stores and products. |
| `/trading` | Real market charts and saved trading workspace. |
| `/monetization` | Earnings, affiliates, brand deals, and payout state. |
| `/miners` | Eligible miner tools and access state. |
| `/cyber-arena` | Arena tools, token pools, saved tabs, and followed members. |
| `/cyber-world` | Community, discovery, live, Studio, Trading, and Pool workspaces. |
| `/terminal` | Entitlement-gated read-only AI market terminal. |
| `/cyber-streamer` | Streaming monitor and connected-account overview; child of Studio. |
| `/affiliate` | Real product affiliate marketplace; child of Shop. |
| `/affiliate-links` | Trackable external affiliate links; child of Monetization. |
| `/subscription` | Plans and recurring access; child of Monetization. |
| `/seller-register` | Storefront enrollment; child of Shop. |
| `/seller-dashboard` | Products, stock, options, and storefront management; child of Shop. |
| `/advertise` | Real native campaign setup; child of Monetization. |
| `/security` | Sessions and account protection; Support navigation. |
| `/community-guidelines` | Safety and conduct standards; Support navigation. |
| `/verification` | Account verification; Support navigation. |
| `/backgrounds` | Immersive galaxy editor with a visible Home exit; Support navigation. |
| `/voyage` | Immersive solar-system view with a visible Home exit; Support navigation. |
| `/moderation` | Reviewer-only moderation queue; intentionally hidden from general navigation. |
| `/ceo` | Owner-only revenue and AI console; intentionally hidden from general navigation. |
| `/product/:productId` | Product details and purchase controls; returns to Shop. |
| `/store/:slug` | Public seller storefront; returns to Shop. |
| `/profile/:userId` | Public member profile; returns to Home. |
| `/live/:streamId` | Live room and conversation; host can open Studio broadcast setup. |
| `/post/:postId` | Full post and replies; returns to Home. |
| `/kit/:slug` | Public creator media kit; returns to Monetization. |
| `/token-purchase` | Explicit-confirmation token purchase flow; returns to Home. |
| `/auth` | Sign-in/sign-up system route. |
| `/verification-success` | Verification result system route. |
| `/r/:code` | Validated affiliate redirect system route. |
| `/.lovable/oauth/consent` | External app authorization system route. |
| `*` | Not-found page with a working Home action. |

## Fixed

- Centralized route titles, descriptions, breadcrumbs, parent links, and navigation visibility in `src/lib/appRoutes.ts`.
- Applied the shared `AppShell` to standard pages; auth, redirect, Arena, and immersive 3D routes remain intentional specialized shells.
- Added missing Verification and Voyage entries to Support navigation.
- Added Home shortcuts to all six requested major destinations.
- Removed redundant nested `Navigation` components from wrapped Studio, Theater, Connectors, Streamer, member profile, media kit, and verification-result pages.
- Replaced broad title-hiding CSS with hologram styling that preserves dynamic product, store, profile, and member titles.
- Applied the blue-dominant hologram outline, faint purple edge, subtle shimmer, and reduced-motion behavior to shared page headings.
- Added Go Live beside composer media actions in the main, profile, and section feeds.
- Go Live uses the canonical lifecycle: it creates the live room, host membership, and clickable feed post, then opens `/live/:streamId`.
- Live rooms link hosts to `/studio?tab=broadcast&section=…` for existing OBS/Streamlabs/Restream setup.
- Replaced the inert trading-platform connect control with a real link to `/trading`.
- Corrected Marketplace, product, subscription, Arena, assistant-command, and Studio deep links.

## Removed

- Removed the obsolete `/cyber-gamers` route target.
- Removed fabricated Arena game cards and inactive Play actions.
- Removed unsupported CyberStreamer Gaming, Content, Ads, and Analytics tabs, including inert Configure, Setup, Test Capture, Upload, and campaign controls.
- Removed CyberStreamer’s duplicate direct live-start path; its Go Live action now opens the canonical Studio workflow.
- Removed duplicate static stream-preview controls and no-op nested navigation handlers.

## External dependency boundary

Live room creation, feed publication, membership, chat, and Studio routing are functional. Actual transmitted video still requires configured external ingest, transcoding, and playback infrastructure; the UI does not fabricate playback.