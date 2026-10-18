# Account linking: what's wrong and how to turn on one real provider

## Findings (no changes made)

**Why clicking "Connect" does nothing**
- The backend has no provider client ID or secret for any platform. The only backend secrets are the encryption and state keys, OpenAI, Shopify, Stripe, and the managed Lovable key. Facebook, Instagram, X, TikTok, Google, LinkedIn, Snapchat, Reddit, Discord and Twitch have none.
- Because none are set, the server's status check returns an empty list. Every card shows "Setup required", the Authorize button stays disabled, and no sign-in window can open. This is intended: it prevents fake "Connected" states.
- Perplexity is not an account link. It is an AI agent that would use a Perplexity API key in the AI Agents panel. That key is not stored, so it also does nothing.

**Connectors page vs Integrations page**
- Connectors (`/connectors`) and Social Media Accounts use the same server sign-in flow, keyed by platform name.
- Integrations (`/integrations`) uses separate Google Workspace, Microsoft 365, Slack, Notion, Discord, HubSpot, Salesforce, Stripe Connect, X and TikTok entries. Each has its own pair of secrets, for example `GOOGLE_WORKSPACE_*`.
- Both show "Connected" only for a server-verified account with no errors.

**Redirects**
- Every return goes to `/auth/callback` on cyberlink.social, www.cyberlink.social and social-cipher-net.lovable.app. The preview URL must also be registered with the platform if you want to test in preview.
- The popup now reports its result to the page that opened it and closes, but only in the preview code.

**Connected indicators**
- In the preview, a profile icon or Connected badge appears only for verified rows.
- Earlier on the live site, Facebook and Instagram rows with errors still showed Connected. The fix has not been published, so the live site still behaves the old way.

**Implemented vs live**

| Item | Status |
|---|---|
| Server sign-in flow (one-time state, PKCE, encrypted storage, disconnect) | Code exists; the live function runs an older version |
| Credential-save hardening, per-provider token handling | Preview code only, not deployed |
| Verified-only indicators, popup close, callback cancel/timeout | Preview only, not published |
| 21-platform Social catalogue | Preview only |
| Provider credentials | Not set for any platform |

## Owner action to enable one real provider (recommended first: Discord)
Discord is the safest first test. It is free, needs no platform review, asks only for basic identity, and supports disconnect.
1. At discord.com/developers, create an application. Under OAuth2, add the redirects `https://cyberlink.social/auth/callback`, `https://www.cyberlink.social/auth/callback`, `https://social-cipher-net.lovable.app/auth/callback` and the preview URL plus `/auth/callback`.
2. Add `DISCORD_CLIENT_ID` and `DISCORD_CLIENT_SECRET` through the secure secrets form, after you approve.
3. Approve deploying the sign-in function, so the live backend runs the current reviewed code.
4. Test it signed in: Connect → Discord popup → Approve → popup closes → Connected badge. Then test Disconnect.
5. Publish only when you approve it, so the live site gets the indicator and popup fixes.

Next options: LinkedIn, then Twitch. X needs a paid plan, and Meta and TikTok need app review.

## Plan once approved
1. Ask for the two Discord secrets through the secure form (no values in chat).
2. Check the naming of the Discord entries on the Connectors and Integrations pages, and add a small test if they differ.
3. Deploy the sign-in function only, with your explicit approval.
4. Run the signed-in preview check from step 4 above and report the result.
5. For Perplexity, if you want it, add the API key through the secure form for the AI Agents panel. This is separate from account linking.

No credentials are created, no connections revoked, and nothing is published without approval.
