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
- [ ] Sidebar restructure (lean basics + dropdown groups)
- [ ] Subscription tiers + sandboxed Terminal with AI agent
- [ ] Moderation: no auto-suspension, review queue only
- [ ] Social links/connectors live

## Universal connectors system
- [ ] One page for OAuth + API key + MCP connections
- [ ] OAuth popup flow with clear connected/failed confirmation + account name + linked date
- [ ] Encrypted server-side key storage, masked display, test-connection button
- [ ] MCP servers: add endpoint + credentials, list tools, enable/disable per tool
- [ ] AI agent connectors (OpenAI, Anthropic, Gemini, others) usable as Terminal agents
- [ ] Live status per connection: connected / expired / needs re-auth / error, auto refresh
- [ ] Connected accounts feed inbox, earnings and aggregated feed
