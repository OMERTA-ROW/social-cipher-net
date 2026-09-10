# Arena, Studio, Movie Theater and Connectors

Four builds, one shared look. Nothing about the current colors, fonts, or overall layout language changes.

## 1. Arena — its own environment

Arena moves off the standard page shell onto a dedicated full-bleed layout: its own top command bar, a left rail for arena sections (live matches, tournaments, leaderboards, squads), and a main stage area. Same palette and typography, different frame.

## 2. Studio — a real creation suite

Three tabs inside the existing Studio page:

- **Animate** — a scene composer with a canvas stage, a character rig list (head/body/limbs), a keyframe timeline with playback scrubber, add/duplicate/delete keyframes, and export of the scene to the user's asset library. Runs in the browser and saves projects to the account.
- **Assets** — audio and image libraries: upload your own, browse what you've saved, and pull in files from any connected creative service.
- **Connected creative accounts** — a panel showing Adobe Creative Cloud, Canva and similar with live connection status and an Import button that lists that service's projects and assets and brings the chosen ones into the Studio library.

## 3. Movie Theater — a new page

A venue at `/theater`: upcoming showtimes and live events list, event creation for hosts (title, poster, start time, video source, capacity), and a screening room with synced playback (host controls play/pause/seek, everyone else follows), an audience count, and live chat beside the screen.

## 4. Connectors — the universal hub

A single page at `/connectors` listing every supported service in one grid, grouped as Social, Streaming tools, and Creative.

- Social: Instagram, Facebook, YouTube, TikTok, X, Snapchat, Twitch, Kick, Worldstar
- Streaming tools: Restream, Streamlabs, OBS, StreamElements
- Creative: Adobe Creative Cloud, Canva

Each service supports two paths: OAuth authorization, or manual API/stream key entry where the service needs it. Status, connect, reconnect and disconnect on every card.

Once connected, an Actions area lets the user post, comment, read their feed, and start a multicast that pushes one live stream to every connected platform at once.

The service list lives in one registry file, so adding a new service later is a single entry.

## Security and data

- Every one of these pages requires being signed in.
- Credentials are per-user and written only by server code. Keys and tokens are never sent to the browser — the page sees connection status and account name only.
- All reads and writes are restricted to the owning account at the database level.

## Technical notes

- New tables: `user_connections` (per-user service connection, status, non-secret metadata) with a separate server-only secret store, `studio_projects`, `studio_assets`, `theater_events`, `theater_playback_state`, `theater_chat`. RLS + GRANTs on each; secret columns readable only by service role.
- New edge functions: `connector-oauth-start`, `connector-oauth-callback`, `connector-credentials` (save/rotate keys), `connector-action` (post/comment/feed), `multicast-start`, `creative-import`.
- New routes: `/theater`, `/connectors`; Arena gets a dedicated layout component.
- Provider API calls run server-side only. Where a provider needs developer app credentials, the page shows a clear "needs setup" state until the key is added in project settings.

## What needs you

OAuth for Instagram, TikTok, X, Twitch and friends requires a developer app per provider. I will build the full flow and the storage; each provider goes live once its app credentials are added. Manual API/stream key entry works immediately for all of them.
