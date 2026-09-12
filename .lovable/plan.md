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

## Commerce: real storefront + shoppable posts

### Shop becomes a real store
- Each seller gets their own store page (banner, name, bio, product grid) at a shareable
  address, built on the existing seller profile.
- Products gain proper detail: multiple images, variants (size, colour, anything the
  seller names), per-variant price and stock, shipping cost, category. Clothing and
  apparel is the lead category, but sellers can create any category.
- Product detail page: image gallery, variant picker, stock/sold-out state, price,
  shipping, seller link, and its own comment section (same comments as everywhere else).
- Shop tab becomes a browsable storefront — categories, search, featured products —
  styled to the existing Cyber Link look (pure black surfaces, blue with subtle purple).
- Seller dashboard gains product create/edit with image upload, variants and stock.

### Posts you can buy from
- A seller can attach one or more of their products to any post, in any section.
- Shoppable posts show the product row inline: image, name, price, variant picker,
  quantity, Add to cart and Buy now — the buyer never leaves the feed.
- A cart lives site-wide (persisted per user), with a small cart indicator in the header;
  checkout can be done inline from the post or from the cart.
- Checkout runs through the existing payment setup; orders and inventory decrement on a
  confirmed payment only.

### Technical notes
- New tables: `product_variants` (product_id, name, options, price, stock, sku),
  `product_images` (product_id, url, order), `stores` fields folded into
  `seller_profiles` (banner, slug, bio), `carts` / `cart_items` (owner-scoped),
  `orders` / `order_items` (buyer + seller scoped), `post_products` (post_id,
  product_id) — all with GRANTs, RLS and indexes.
- Reuse `create-checkout` / `process-sale` edge functions; extend them for multi-item
  carts and variant-level stock. Stock decrements server-side inside the sale handler.
- New UI: `StorePage`, `ProductDetail`, `ProductForm`, `CartSheet`, `PostProductCard`
  (rendered inside `PostCard` when a post has products), and a rebuilt `FeedShopTab`.
