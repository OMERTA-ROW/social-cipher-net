# Dashboard, profile menu, media, radio, and hover cleanup

## Build
- Remove dashboard-only counter duplicates from both its top header and dashboard body.
- Replace the top profile icon with a working account dropdown containing display name, `@handle`, the existing six live counters, View profile, Account settings, and Sign out; omit email.
- Keep Dashboard as the program/activity hub, add Home and Monetization links, and provide a remembered control to hide Monetization.
- Keep the existing working profile, password, and notification settings and make Account settings deep-link directly to them.
- Fit uploaded and displayed user pictures inside their containers with preserved aspect ratio rather than cropping or stretching.
- Remove the visible Profile Radio “Playlist link” field while preserving saved-playlist selection and all remaining controls.
- Replace purple hover backgrounds/halos with a consistent blue text, outline, and icon illumination across shared controls and remaining feature-specific hover styles.

## Verification
- Check desktop and mobile navigation, dropdown actions, dashboard tabs and links, media previews, and profile radio.
- Run focused tests and confirm the preview builds without errors.

## Security
- Restrict Theater video playback URLs to hosts and confirmed participants while retaining public event discovery metadata through a safe public interface.
