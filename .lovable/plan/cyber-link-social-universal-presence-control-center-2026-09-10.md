# Cyber Link Social — Universal Presence Control Center

Architecture and phased roadmap. No code changes in this plan.

## Where we already are

- A connector registry exists (`src/lib/connectors/registry.ts`) with social / streaming / creative services, OAuth + manual-key methods, and capability flags.
- Private per-user tables `user_connections` and `connection_secrets` exist, with owner-scoped access.
- Edge functions exist for OAuth, credential storage, single actions, posting, commenting, and creative imports.
- Studio, Theater, Arena, and a Connectors page are live.

So this is an expansion of a working foundation, not a rewrite. The gaps are: aggregation, unified inbox/notifications, unified analytics, a real job/sync pipeline, rate limiting, and many more services.

---

## 1. Connector registry model

Move the registry from a hand-written frontend list to a **shared, versioned manifest** consumed by both browser and server.

Each connector entry declares:
- Identity: id, name, category, glyph, blurb, docs link.
- Auth: supported methods (oauth2, oauth1, api_key, stream_key, app-password, none), scopes, token refresh style, and which credential fields to collect.
- Capabilities: what it can actually do — `read_feed`, `read_messages`, `read_notifications`, `read_analytics`, `publish_text`, `publish_image`, `publish_video`, `publish_audio`, `live_ingest`, `commerce`, `storage`.
- Content constraints: max length, media types, aspect ratios, duration limits, required metadata fields.
- Rate policy: requests per window, burst, cost per call class.
- Normalizers: named adapter that maps provider payloads into our canonical shapes.

An **adapter** per connector implements only the capabilities it declares. A generic engine handles auth, refresh, retry, backoff, and logging — adapters only translate. Adding a service = one manifest entry + one adapter file. Nothing in the UI changes, because every surface renders from capability flags.

Store the manifest in the database too (`connector_definitions`), so services can be enabled, disabled, or throttled without a deploy, with code adapters as the implementation backing them.

## 2. Data aggregation layer

Canonical models, provider-agnostic, all owner-scoped:
- `presence_accounts` — a connected identity per service (handle, avatar, follower count, verified).
- `presence_items` — normalized post/upload/track/video/listing, with source ids and permalinks.
- `presence_metrics` — time-series of followers, views, plays, engagement, revenue, per account and per item.
- `inbox_threads` / `inbox_messages` — DMs, comments, and replies from every service in one shape, with read state and reply capability flag.
- `notifications_unified` — normalized events with type, actor, target, and deep link.

Sync model: three tiers.
- **Webhooks** where the provider supports them (near-real-time).
- **Scheduled polling** with per-connector cadence and ETag/cursor state stored in `sync_cursors`.
- **On-demand refresh** when the user opens a surface, rate-limit permitting.

A `sync_jobs` queue table plus a scheduled worker function does the work; the UI never calls providers directly. Every fetch is incremental and idempotent — dedupe on `(connection_id, provider_item_id)`.

Freshness is always visible: each card shows source, last-synced timestamp, and an explicit "unavailable" state rather than stale-looking zeros.

## 3. Credential storage and security model

- Tokens and keys live **only** server-side, encrypted at rest, never returned to the browser — the client only ever sees a connection's status, scopes, and expiry.
- Envelope encryption: a per-project master key held as a backend secret; each credential encrypted with a per-connection data key.
- Only the server owns the OAuth exchange, refresh, and revoke paths. State parameters are single-use and short-lived.
- Row-level security scopes every table to the owning user; secrets tables have no user-facing read policy at all — access goes through server functions.
- Least privilege: request only the scopes a user's chosen capabilities need, upgrade incrementally.
- Full audit log of connector actions (who, what, when, which connection, result), plus revocation that deletes stored credentials and revokes upstream where the API allows.

## 4. Rate limiting and quota

Two layers:
- **Outbound**: a per-connection token bucket enforced server-side, using each connector's declared rate policy. Requests over budget queue rather than fail. Respect `Retry-After` and 429s with exponential backoff plus jitter, and circuit-break a connection after repeated hard failures with a visible "reconnect needed" state.
- **Inbound**: per-user limits on expensive actions (multicast, bulk import, full resync) so one user can't starve the shared workers.

Quota state is persisted so it survives function cold starts.

## 5. Publish pipeline

One canonical composition, many renditions.

```text
Compose (text, media, metadata, rights)
  -> Validate per target (length, media type, duration, required fields)
  -> Transcode / crop renditions per target
  -> Enqueue one publish_job per target
  -> Worker executes with rate budget + retries
  -> Record permalink, status, error per target
  -> Backfill metrics for the published item
```

- `publish_batches` and `publish_targets` tables give per-destination status: queued, publishing, live, failed, with the provider's own error text surfaced.
- Partial success is the norm — the UI shows per-platform outcomes and retries individually.
- Scheduling, drafts, and per-platform overrides (different caption for X vs LinkedIn) fall out of the same model.
- Live multicast is a different path: one ingest, fan-out RTMP relay per destination. This needs a media relay service; it is not something the browser or an edge function can do.

## 6. Interaction layer (work happens here)

Feed reading, replying, and DMs run through the same adapters with `read_*` / `reply_*` capabilities. Where a platform forbids reading a feed or sending DMs via API, the UI shows the capability as unavailable with the reason — never a fake stand-in.

---

## Honest integration reality

**Straightforward (public APIs, self-serve keys or standard OAuth):**
YouTube, Twitch, Discord, Reddit, Spotify (read), Mastodon, Bluesky, GitHub, Google Drive, Dropbox, Notion, Shopify, Stripe, Figma (read), Vimeo, SoundCloud, Patreon, Substack (limited), Medium, WordPress, Ko-fi, Etsy.

**Requires app review, business verification, or partner status:**
Instagram and Facebook (Meta app review, business account required), TikTok (content posting API needs approval), LinkedIn (posting scopes need partner access), X/Twitter (paid tiers; posting and reading cost real money), Snapchat, Pinterest (approval for write), YouTube quota extension for heavy use, Threads (limited API).

**Paid API access:**
X/Twitter, several analytics providers, most music distributors' partner APIs, some commerce and payments data feeds.

**Not currently possible via public API:**
WhatsApp personal messaging, iMessage, Instagram personal DMs beyond business inboxes, TikTok direct messages, Netflix/Disney+/HBO catalogs and playback, Apple Music full library write, most private DM surfaces, and any scraping-based "connection" (against terms and unreliable — we will not ship it).

**Music distribution specifically:** DistroKid, TuneCore, CD Baby and similar generally have no public self-serve API. Realistic paths are partner agreements, or an aggregator that does expose an API. Until then, the Studio produces a fully compliant delivery package (audio master, artwork at spec, metadata, ISRC/UPC, rights and splits) that the user uploads once — honest and still a large time saving.

---

## Phased roadmap

**Phase 1 — Foundation (ships first)**
Server-side manifest + adapter engine, encrypted credential vault, rate limiter, job queue, audit log. Migrate the existing connectors onto it with no visible change. Connectors page shows real status, scopes, expiry, and reconnect.

**Phase 2 — Aggregation**
Canonical presence tables, sync workers, and a unified dashboard: accounts, followers, recent items, and cross-platform metrics in one view with source and freshness on every number.

**Phase 3 — Publish once**
Text and image syndication across all connected social services, with per-target validation, overrides, scheduling, and per-destination status.

**Phase 4 — Unified inbox and notifications**
Comments, mentions, and DMs where APIs permit, with reply from inside Cyber Link. Explicit unavailable states elsewhere.

**Phase 5 — Video and audio distribution**
Transcoding renditions, YouTube / TikTok / Reels / Shorts publishing, podcast and audio destinations, plus the music delivery package.

**Phase 6 — Live multicast**
Media relay service, ingest endpoint, per-destination RTMP fan-out, health and bitrate monitoring, wired into Theater and streaming.

**Phase 7 — Unified analytics and Studio deepening**
Cross-platform performance, revenue rollup, cohort and trend views; Studio pulls projects from creative-tool connectors and publishes straight out.

**Phase 8 — Scale-out**
Long tail of services added purely through manifest + adapter, commerce and storefront connectors, cloud storage, and partner-gated integrations as approvals land.

---

## Technical notes

- Workers run as scheduled backend functions reading `sync_jobs` / `publish_jobs`; no long-running provider work in request handlers.
- All new tables get RLS enabled, owner-scoped policies, and explicit grants.
- Media transcoding and the RTMP relay require an external media service — that is the one piece that cannot live inside the current backend.
- No mock, demo, or placeholder data on any aggregated surface; missing data renders as an explicit unavailable state.
- Layout, colors, fonts, spacing, and existing UI behavior stay exactly as they are throughout.
