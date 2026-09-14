# Roadmap

- [x] Publish app to Cloud
- [x] Confirm production URL serves end-to-end
- [x] Confirm backend config matches deployed environment
- [x] Confirm no secrets in client code
- [x] Review function logs after deploy (no errors recorded)
- [x] Security summary report written
- [x] Keep existing Stripe integration (no switch to built-in payments)
- [x] Paid post media locked behind payment (private bucket + signed links)
- [x] Birthdates moved out of public profiles into owner-only private record
- [x] Hide two-factor status from public profiles
- [x] Sniper gift ($1000) with cinematic strike + persistent crack

## Current build
- [ ] Arena: dedicated layout/environment
- [x] Studio: animation suite, asset libraries, creative account imports (wired into Studio tabs, Zod-validated saves)
- [ ] Movie Theater: events, synced playback, live chat
- [ ] Connectors: universal hub (OAuth + manual keys), actions, multicast
- [ ] Space background: mining ship + alien crew, chase cam, selectable mining view
- [x] Replace every standalone Zozo/Draco overlay with one clickable spaceship interface for AI switching and miner purchases

## Blocked / waiting on user
- [ ] Shopify store: previous development store expired and cannot be claimed.
      Waiting on user's go-ahead to create a fresh store to claim.
- [ ] Provider OAuth apps: each social/streaming provider needs developer app
      credentials before its OAuth button goes live.

## Reliability & security hardening
- [x] Monitoring/alerts for post_payments permission denials and feed-load failures
- [x] Paid-post check fails open in UI (never paywall a paying viewer)
- [x] Batch/cache post media, stories, live streams, payment status
- [x] Automated tests: paid-post unlock (signed in / signed out)
- [x] Regression tests for stream-participant + self-service update RLS policies
- [x] Audit logging for role self-assignment and protected-record updates
- [x] Production alerting on permission-denied / RLS failures

## Big functional build pass
- [x] Profile composer + link previews + profile posts
- [x] Ranked feed (engagement + recency)
- [x] Profile radio player (Spotify/Apple/SoundCloud/YouTube, stream routing)
- [x] Direct messaging + unified inbox (block/report/tags/scam filter)
- [x] Sidebar restructure (lean basics + dropdown groups)
- [x] Sandboxed Terminal (/terminal), tier-gated, with AI agent `ask`
- [x] Subscription checkout for the Terminal add-on
- [x] Moderation: no auto-suspension, review queue only
- [ ] Social links/connectors live

## Trading layer
- [x] Multi-chart workspace (/trading), tier-gated panes/indicators
- [x] Live-only data with source, latency and unavailable states
- [x] Non-custodial wallets (EVM + Solana), human-only trade confirmation, audit log
- [x] Chart workspace: draggable/resizable windows, session pins, feed snapshot posting, smooth overflow
- [ ] Exchange/broker order routing (needs provider API keys per user)

## Universal connectors system
- [x] One page for OAuth + API key + MCP connections
- [x] OAuth popup flow with clear connected/failed confirmation + account name
- [x] Encrypted server-side key storage, masked display, test-connection button
- [x] MCP servers: add endpoint + credentials, list tools, enable/disable per tool
- [x] AI agent connectors (OpenAI, Anthropic, Gemini, others); Terminal wiring pending Terminal build
- [x] Live status per connection: connected / expired / needs re-auth / error, auto refresh
- [ ] Connected accounts feed inbox, earnings and aggregated feed

- [ ] Home feed exception: plain vertical scrolling feed only (no pinning/floating windows); aggregates posts from every section.
- [ ] Commerce: full Shop storefront (per-seller stores, variants/sizes, inventory, product pages) + shoppable posts with inline cart/checkout.
- [ ] Inline post cart appears on home feed only; posts in their own sections stay plain.
- [ ] Movie Theater community: hosted watch sessions + host live stream, open posting, comments, feeds into home feed, drag/pin/scroll windows, format-agnostic (movies, podcasts, discussions).

## Dashboard and profile menu update (Sept 12)
- [x] Remove duplicated dashboard/header counters and move live totals into the account dropdown
- [x] Remove email from the account dropdown; keep name, handle, profile, settings, and sign out
- [x] Deep-link working account settings and add Home/optional Monetization dashboard access
- [x] Preserve full uploaded-image aspect ratio in previews, posts, profile media, and album covers
- [x] Remove the visible Profile Radio playlist-link field
- [x] Replace purple hover blocks and halos with blue illumination
- [x] Protect theater playback URLs while retaining a safe public event schedule

## Batch update (Sept 12)
- [x] 1 Connector layer audit + fixes (code done; provider app credentials still needed from owner)
- [x] 2 Charts render real live data everywhere
- [x] 3 Duplicate audit + consolidation
- [x] 4 Engagement counts into top bar
- [x] 5 Sign out moved to left sidebar (Log In/Log Out)
- [x] 6 Dashboard real data
- [x] 7 Messages real DMs + inbox
- [x] 8 Photo crop/save framing fix
- [x] 9 Profile adjust controls behind Edit button
- [x] 10 @handle always rendered with display name
- [x] 11 Profile radio playlist dropdown
- [x] 12 Pinned windows scroll with page, unlimited
- [x] 13 Purple highlight blocks -> blue letter glow on hover
- [x] 14 CEO portal fully hidden
- [x] 15 Own favicon + OG link preview image

## Charts, connectors, and live presence (Sept 12)
- [x] Verify Cloud project, client binding, and all market/connector function deployments
- [x] Repair blank lightweight charts without clearing their canvas drawing buffers
- [x] Consolidate the older social redirect flow into the universal connector screen
- [x] Fix encrypted Canva/Adobe credential reads and remove unsupported Shopify OAuth affordance
- [x] Add realtime blue live rings and prioritize live creators in Who to follow
- [x] Replace dead story click, follower-count placeholder, and password-change placeholder
- [ ] Provider OAuth apps need owner-supplied developer credentials
- [ ] Remaining provider actions/import adapters require provider-specific implementation and approvals

## AI enablement (Sept 12)
- [x] Enable Lovable AI for the project and verify one real server-side request

- [ ] Add required affiliate and Stripe webhook secrets (blocked until user supplies provider/shared values)
- [x] Add creator earnings gross/fee/net breakdown by revenue type
- [ ] Verify Stripe webhook-driven revenue updates (blocked until Stripe signing secret is supplied)
- [x] Enhance only the existing space background depth and texture; preserve all UI
- [x] Secure public affiliate-link financial data exposure

## Security hardening pass (Sept 13)
- [x] Move stream mute/block state out of participation rows into its own
      owner-scoped moderation table with host/admin-only access and audit trail
- [x] Keep saved radio playlists visible to their owner only
- [x] Serve the platform's cut through a logged single-purpose lookup instead of
      a table anyone signed in can read
- [x] Close visitor access to every private server-side helper, and start future
      ones locked by default
- [x] Extend the access-rule regression suite to the new moderation rules
- [ ] Positive mute/block check needs a live stream plus a second real account
      (the suite skips itself while only one account exists)
- [ ] Linter floor of 18 findings is intentional: 2 tables deliberately left with
      no access rules, 2 sign-in helpers that must answer before a session
      exists, and 14 helpers that the app or the access rules themselves call

## Navigation, live posting, and hologram headers (Sept 13)
- [x] Add a central route metadata registry with labels, descriptions, parents, and visibility
- [x] Use AppShell for normal routes while preserving auth, OAuth, Arena HUD, backgrounds, and voyage flows
- [x] Add consistent hologram page headings, breadcrumbs/back action, and one-line descriptions
- [x] Add Home one-click entry points for Dashboard, Profile, Studio, Arena, Cyber World, and Monetization
- [x] Repair dead `/cyber-gamers` links and the incorrect Marketplace destination
- [x] Remove fabricated Arena game cards and route real member actions correctly
- [x] Route product cards and subscription setup to real destinations; remove inactive payout control
- [x] Unify Studio and composer live creation through the feed-aware live lifecycle
- [x] Remove static Studio and Streamer preview controls; preserve honest waiting-for-video state
- [x] Add route-registry and hotspot regression coverage
- [ ] Live video playback remains blocked until a real ingest/transcoding/playback provider is configured

## Repair pass: links, charts, headings, auth (Sept 14)
- [x] Add safe same-origin sign-in return paths across all sign-in entry points
- [x] Add recovery/new-password handling on /auth with pending, expired, and error states
- [x] Remove duplicate page headings via a shared AppShell header override
- [x] Fix the trading chart rebuilding (and losing zoom) on every data refresh
- [x] Add loading/empty/error states and axis+tooltip formatting to crypto and stock charts
- [x] Regression tests for return-path safety; full test suite and production build pass
- [ ] OAuth provider credentials and the Stripe webhook signing secret still need owner-supplied values

## Linked accounts, CyberLink Exchange, configurable fees (Sept 14)
- [x] Multi-account connection manager: several accounts per provider, active-account
      selection, connect/reconnect/disconnect states, per-user isolation, server-only credentials
- [x] Exchange area with navigation entry point, using existing real market data only
- [x] Server-validated fee model: exchange / wallet / bank categories, percent + fixed,
      min/max, currency, payer, provider+network fees separate, minor-unit maths, quote expiry
- [x] Admin fee settings protected by server-enforced roles; live transactions disabled until configured
- [x] Draft fee template + linked provider reference section (labelled examples, never active rates)
- [ ] Blocked: providers not selected, actual CyberLink rates unset, no exchange/bank integration
      (owner must choose providers, supply their credentials, and enter real rates)
