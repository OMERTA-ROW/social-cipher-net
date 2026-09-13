# Dashboard as control centre, Profile as public space

## 1. Profile page stops being an editing surface
- Remove the "Edit profile" card (handle / display name / bio) from `src/pages/Profile.tsx`.
- Remove the avatar edit controls (upload, adjust, framed/standing toggle) from the profile page; it shows the picture only.
- Add a single "Edit on Dashboard" link so people learn where editing lives.
- Keep everything public-facing: composer, radio, media, posts, and the email line stays out of public view.

## 2. Profile editing moves to the Dashboard
- New `src/components/profile/ProfilePictureEditor.tsx` holding the picture logic that currently lives in `Profile.tsx`: upload original, crop/zoom editor, framed vs standing character, drag-to-place, all persisting to the profile record.
- Dashboard "Account settings" tab gains that picture editor above the existing handle / display name / bio form.
- Handle field fix: trim, lowercase, check availability before saving, report a taken handle clearly, and re-read the saved row after writing so the form shows what the database actually holds (no silent reset on reload).

## 3. Remove dead and duplicate files
Delete these unreferenced components and helpers (nothing imports them):
`AlienIcon`, `BackgroundSelector`, `ContentAgeGate`, `DracoAI`, `InfinityScrollFeed`, `NavLink`, `SkyTechAdmin`, `space/BackgroundControl`, `space/SolarSystemScene`, `space/world/destinations`, `hooks/useSaleProcessing`, `hooks/useSkyTechUpdates`, `lib/botNotifications`, `lib/mentionUtils`.
Untouched: shadcn UI primitives (shared library), generated Supabase files, and the lazily loaded space scene.

## 4. End-to-end verification
Signed-in browser run against the live app:
- Edit handle, name, bio on the Dashboard, save, reload, confirm the values stuck and appear on the public profile.
- Toggle a notification setting and the Monetization switch, reload, confirm they stuck.
- Start a conversation with another account, send a message, confirm it lands in both inboxes.
- Comment on a post, reload, confirm the comment persists.
Anything that fails these checks gets fixed in the same pass.

## Note
Messages and comments already have full implementations; this pass proves them end to end and repairs whatever the tests expose rather than rewriting working code.
