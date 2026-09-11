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
- [ ] Monitoring/alerts for post_payments permission denials and feed-load failures
- [ ] Paid-post check fails open in UI (never paywall a paying viewer)
- [ ] Batch/cache post media, stories, live streams, payment status
- [ ] Automated tests: paid-post unlock (signed in / signed out)
- [ ] Regression tests for stream-participant + self-service update RLS policies
- [ ] Audit logging for role self-assignment and protected-record updates
- [ ] Production alerting on permission-denied / RLS failures
