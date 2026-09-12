# One shared feed, comments everywhere, per-section live

Everything on the site becomes the same thing under the hood: a post. Posts carry a
"section" label (Arena, Trading, Studio, Theater, Community, Discovery, Pool, Profile),
so each section shows its own feed while everything still flows into the main feed.
Comments and live streams get the same treatment.

## 1. Posts get a section (and optional branch)

Add two fields to posts:
- `section` — which part of the site the post was made in (defaults to the main feed)
- `community_slug` — the community branch, when posted into one

Existing posts keep working; they simply belong to the main feed.

Every section gets:
- a composer (same box people already use on their profile)
- its own scrolling feed of that section's posts
- comments, likes and reposts, exactly like the main feed

The main feed keeps showing everything, so nothing is a dead end.

## 2. Comments on every piece of content

Comments already exist for posts (replies in a thread). Extend the same thread to:
- profile media items (photos, videos, albums)
- theater events
- arena / trading charts and rooms
- live streams — a live comment column beside the stream, updating in real time

Each of these gets an "anchor" post created the first time someone comments, so all
comments live in one system with one set of rules, one moderation path, and one look.
Live comments use realtime so they appear instantly during a broadcast.

## 3. Live is per section

Streams get a `section` field. Going live in Trading creates a Trading stream; the
Trading live list only shows Trading streams. Same for Profile, Theater, Arena, Studio.
No global merge — to go live elsewhere you start a separate stream there.
Each stream also publishes a post into its own section's feed so followers see it.

## 4. Dashboard for everyone

Remove any tier condition around dashboard content so every signed-in account sees the
full dashboard. Paid-only data sources still show their own "not connected" state, but
the dashboard itself is open to all.

## 5. Community branches

Users can create a community branch and post into any branch. Branches are labels on
the same posting/feed/comment system — a branch feed is just the main feed filtered to
that branch. Creating one takes a name and description; anyone can post into it.

## Technical notes

- Migration: `posts.section text not null default 'main'`, `posts.community_slug text`,
  `live_streams.section text not null default 'profile'`, new `communities` table
  (slug, name, description, created_by) with grants + RLS (public read, authenticated
  create, creator update). Indexes on `(section, created_at desc)` and
  `(community_slug, created_at desc)`.
- Comment anchors: `posts.subject_type` / `posts.subject_id` so a media item, theater
  event, stream or chart can own a thread. Unique index on `(subject_type, subject_id)`
  for the anchor row.
- `src/lib/social.ts` gains `fetchSectionFeed(section, community?)` and
  `ensureSubjectThread(type, id)`; `PostComposer` takes optional `section` /
  `communitySlug` and passes them to the insert.
- New shared `<SectionFeed />` (composer + infinite list, reusing `PostCard`) mounted in
  CyberWorld tabs, Studio, Trading, Theater and Arena; new `<CommentsPanel subject… />`
  for media/theater/chart/stream, with a realtime variant for live.
- `StartLiveStreamDialog` / `useLiveStream` pass and filter on `section`;
  `LiveEventsPanel` filters by section instead of category alone.
- Styling untouched: existing cards, colours, spacing and the galaxy background stay.

## Home feed is the exception

The home feed stays a plain, vertically scrolling social feed — no pinning, no floating
windows, no pop-ups. It aggregates every post made anywhere on the site, in any section,
while each post still lives in its own section too. The pin-and-scroll multi-window
system stays exactly as-is for Trading, Studio, Live Studio, Trending, Live Events,
Community, Discovery and Pool.
