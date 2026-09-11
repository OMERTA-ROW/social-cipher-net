# Big functional build pass

Look, layout, colours, fonts and the galaxy background stay exactly as they are. This is
purely about making things work. Delivered in priority order, since onboarding is blocked
on the profile and feed.

## Phase 1 — Profile + post composer (first)

- Complete, viewable profile for every account: your own and anyone else's, with avatar,
  bio, counts, media section and posts, all reachable from a post author's name or picture.
- One composer on the profile that publishes straight to the home feed. Text and links
  share the same box; the existing photo/video upload stays where it is today.
- Paste a link and it expands: videos embed and play inline, images render inline, anything
  else shows title, description and thumbnail. Previews are fetched by our own service so
  no user data leaks to the linked site.
- New posts show up in the home feed immediately and are visible to everyone.
- Likes, repost/share, and threaded comments (reply to a reply) on every post.
- Image handling fixed everywhere: avatars and uploads keep their real aspect ratio, no
  stretching or squashing, with correct cropping frames and sizing.

## Phase 2 — Feed ranking

- Home feed ranks by a blend of engagement (likes, comments, reposts, views) and freshness,
  the way mainstream social feeds do, so popular recent posts surface first.
- For You / Following / Discovery / Shop / Market tabs and infinite scroll all stay.

## Phase 3 — Profile radio player

- A radio player on each profile. The owner connects Spotify or Apple Music, or simply
  pastes a playlist link, and it plays for visitors.
- The player can be routed into the owner's live stream so listeners hear the same track,
  wired into the existing live audio source.

## Phase 4 — Direct messages + unified inbox

- Real person-to-person messaging: threads, saved history, unread counts, read receipts,
  typing indicator, live delivery.
- One single inbox stream. Messages from connected accounts (Instagram, X, Facebook and the
  rest) mix in with Cyber Link messages, each tagged with a small platform icon.
- Per-thread controls: mark private, add your own tags/categories, block the account, or
  report a message. Blocking is account-level; reporting sends the message to a human
  reviewer.
- Scam and phishing filtering runs before delivery — giveaway/money scams and pushes to
  unauthorised sites are held back rather than landing in the inbox.

## Phase 5 — Sidebar restructure

- Top group stays lean: Home, Profile, Feed, Messages, Notifications.
- Everything else folds into one-click dropdowns. Monetization opens to Terminal, Earnings,
  Tiers and Payouts. Studio, Arena and Cyber World get the same treatment for their pages.
- Two groups: social basics on top, your extensions (Market, Shop, Studio, Arena, Cyber
  World) below. Panels stay collapsible and remember their state.

## Phase 6 — Subscription tiers + Terminal

- Paid tiers that unlock features across the site, with the gate reusable anywhere.
- Terminal page nested under Monetization. Every account has one; what it can run depends on
  tier, with free and lower tiers meaningfully limited.
- An AI agent lives inside the terminal.
- Terminal is a paid add-on even on free — priced around $5–10/year, with the paywall built.
- Security: no file access, no reaching other people's data, no running code against the
  platform, hard rate limits, and a per-tier allowlist of permitted commands. The agent gets
  a narrow, read-only view of the signed-in person's own data and nothing else.

## Phase 7 — Moderation dialled back

- Automatic account suspension removed entirely.
- 3D renders, transparent/no-background images and stylised artwork never trigger action.
- Uploads go through; analysis happens quietly afterwards. A genuine concern raises a
  notification and goes to a representative review queue via a bot. Never auto-punish.

## Phase 8 — Social links live

- Every social connector activated end to end so people can connect accounts and finish
  onboarding today. Where a provider needs its own developer credentials, I'll name exactly
  which ones you need to supply and enable the rest.

## Technical notes

- New backend tables: link previews cache, reposts, message threads/messages/participants,
  thread tags and blocks, moderation review queue, subscription tiers and entitlements,
  terminal sessions/command log, profile radio settings. All owner-scoped with row-level
  security and explicit grants.
- Feed ranking as a scored query (engagement decayed by age), cursor-paginated to keep
  infinite scroll.
- Link unfurling, scam classification, terminal command execution and the terminal agent all
  run server-side in edge functions; the terminal executes only allowlisted commands against
  a per-user data scope with rate limits — no shell, no filesystem, no eval.
- Messaging realtime over the existing realtime channels; unread/read state per participant.
- Image rendering fixed with consistent aspect-ratio containers and object-fit rules; no
  visual restyle.
- Payments for tiers and the terminal add-on go through the existing Stripe setup.

## Assumptions

- Tiers: Free, Plus, Pro (names adjustable), with the terminal add-on separate and priced
  per year.
- Inbox aggregation covers the platforms already wired into connectors; others show once
  their credentials exist.
- Apple Music playback needs a MusicKit developer token from you; Spotify needs its client
  ID. Pasted playlist links work without either.

## Order of delivery

Phases run in the order above, verified as each lands. I'll report at each phase rather than
going quiet until the end.
