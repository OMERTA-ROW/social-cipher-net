# Cyber Link — batch update

## What I found first (audit results)

### Connections — why nothing connects
I tested the live backend and read every connector function.

- **The social sign-in flows have no credentials.** The code expects an ID and secret for each platform (Instagram, X/Twitter, YouTube, Twitch, Reddit, Facebook, TikTok, LinkedIn). None of them are saved in the project. Only encryption keys, OpenAI, Shopify and Stripe exist. So every "Connect" button starts a handshake that the platform immediately rejects. **This cannot be fixed in code — each platform needs a developer app registered by you, and the ID/secret saved in project settings.**
- **The connector list is not filtered by what is actually usable**, so platforms that can never connect today are shown identically to ones that could.
- **API-key / stream-key connectors (the ones that don't need a platform app) do work end to end** — those are the ones we can make fully usable now.
- **Outbound links to your other websites** are stored per user but are not validated or normalised, so entries saved without `https://` produce dead links.
- Stripe purchases also still need the webhook secret saved before purchase unlocks happen automatically.

### Charts — why they are blank
The live price feeds are healthy (I pulled real Bitcoin, Ethereum and equity data straight from the backend). The price number renders, but the chart area paints nothing: the chart is created before its container has a measured height and is never re-measured, so it draws at zero height. Same root cause on Trading, Arena and Market.

### Duplicates found
- Orphans, never imported anywhere: `ZozoSpaceshipEntrance`, `ZozoMiningBackground`, `DracoMiningBackground`.
- Overlapping backgrounds: `CyberSpaceBackground`, `SolarMatrixBackground`, `SolarSystemBackground`, `RealisticSpaceBackground`.
- Two near-identical chat surfaces: `MegaChat` and `OmegaChat`.
- Repeated chart wrappers: `ChartWindow`, `ChartPane`, `CryptoMarketChart` each re-implement the same load/format/render logic.
- Repeated tab persistence in `PageTabManager` and `SavedTabsManager`.
- Per-section live streams are **left untouched** as instructed.

## What I will build

**Connections**
- Make the connector list honest: anything missing credentials shows "Setup required" with the exact steps, instead of a dead Connect button.
- Fix the key/stream-key connect path so it completes onboarding, verifies the credential with a real test call, and shows live status.
- Validate and normalise outbound website links so they always open correctly.
- Give you a short list of exactly which platform IDs/secrets to add, and where.

**Charts**
- Fix the sizing/lifecycle bug so charts paint immediately and re-measure on resize, on Trading, Arena, Market and every embedded chart. Real data only.

**Duplicates**
- Delete the three orphans, merge the two chat surfaces into one, consolidate the chart wrappers onto a single shared chart component, and merge tab persistence into one hook. Written list delivered with the result.

**Top bar / nav**
- Move posts, likes, follows, replies, following and engagement counts into a compact strip in the top bar; remove them from the crowded profile/dashboard block.
- Remove Sign Out from the top bar; add a Log In / Log Out entry at the bottom of the left sidebar that reflects the current state.

**Dashboard & Messages**
- Dashboard: real counts, real recent activity, real earnings, genuine empty states.
- Messages: working one-to-one messaging with an inbox, conversation list, unread state and live delivery.

**Profile**
- Fix the crop/save pipeline so saved images keep the framing you chose, with headshot framing for profile and album photos.
- Shrink the adjustment controls and hide them behind an "Edit" button that pops them out.
- Always render handles as `@handle`, under the display name.
- Add a playlist dropdown to the profile radio player.

**Windows**
- Pinned windows stick to the page and scroll with it, stay draggable and resizable, and have no cap on how many can be open.

**Styling**
- Remove the purple highlight blocks; hovering illuminates the text itself in blue.

**Access & branding**
- CEO portal fully hidden: no link, no route match, server-side role check for anyone who guesses the address.
- Replace Lovable branding on shared links with your logo (favicon plus link preview image).

## Technical notes
- Chart fix: create the chart after layout, drive it with a `ResizeObserver`, and update series in place rather than rebuilding.
- Messages: real-time subscription on the existing message tables with per-user access rules already in place.
- Counts in the top bar come from live aggregate queries, cached and refreshed, never hardcoded.
- CEO route guarded by the existing server-side role check plus route removal for non-owners.

## What I need from you (blocking)
1. A logo image file for the favicon and link preview.
2. For each social platform you want live: the app ID and secret from that platform's developer console, saved in Project Settings → Secrets. I will list the exact names.
3. The Stripe webhook secret, for automatic purchase unlocks.

Everything else proceeds without you.
