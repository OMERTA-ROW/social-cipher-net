# Account Integrations Audit (preview, Oct 3 2026)

Nothing was published. No provider consent, credentials, test accounts or paid calls were used.
Real provider OAuth flows are **BLOCKED**: no provider client ids/secrets are configured and no authorized test accounts were supplied.

## Architecture
- Sign-in (identity) and integrations (API access) are separate. Sign-in: managed Google provider via the auth service. Integrations: `connector-oauth` backend function, service id `acct:<provider>`.
- Start (`integration_start`): requires a valid CyberLink bearer session (server `getUser`); refuses with `not_configured` + exact missing secrets when client id/secret absent; creates a 10-minute, owner-bound, single-use attempt (SHA-256 state hash, PKCE S256 verifier where supported); callback URL derived server-side from the request Origin and allowlisted (`/auth/callback` on cyberlink.social, www.cyberlink.social, social-cipher-net.lovable.app, preview origin, localhost:8080).
- Callback (`/auth/callback`): treated as an integration return only if `state` + `code|error` are present **and** this tab started an integration. Server re-checks state hash + owner, expiry, atomically consumes it (replay → 409), handles cancel/errors, exchanges the code server-side, fetches provider-verified identity, encrypts tokens into `connection_secrets` (service-role only), then marks the row Connected. Existing connection is replaced only after new credentials are stored.
- `user_connections`: members may only **read** their own rows; insert/update/delete revoked from members this round (previously a member could forge `status='connected'`). Only server code writes.
- Refresh (`integration_refresh`) uses the stored refresh token server-side; failures set "Connection failed" with a reconnect instruction.
- Disconnect (`integration_disconnect`): revokes at provider when an endpoint exists, then deletes secrets + metadata; reports `revoked` / `failed` / `unsupported` honestly; partial deletion returns an explicit error.
- Statuses limited to: Not connected, Connecting, Approval required, Connected, Connection failed, Disconnected. "Connected" requires a server row with status `connected` and a provider account id.
- Platform App User Connectors (gateway, per-user) exist for Gmail, Microsoft apps, HubSpot, Notion, GitHub etc., but none is linked to this project; Slack/Discord/Salesforce/Stripe/X/TikTok aren't offered there. The project rule keeps all third-party OAuth in `connector-oauth`; switching some providers to App User Connectors is an owner option.

## Owner configuration
For each provider: create the developer app, register redirect URIs exactly
`https://cyberlink.social/auth/callback`, `https://www.cyberlink.social/auth/callback`, `https://social-cipher-net.lovable.app/auth/callback` (and the preview URL + `/auth/callback` for preview testing), then add the two backend secrets.

| Provider | Secrets | Scopes requested | Revoke on disconnect | Extra owner requirement | Status now |
|---|---|---|---|---|---|
| Google Workspace/Gmail | GOOGLE_WORKSPACE_CLIENT_ID/SECRET | openid, email, gmail.readonly | Yes (oauth2.googleapis.com/revoke) | Restricted-scope verification by Google | Approval required |
| Microsoft 365 | MICROSOFT365_CLIENT_ID/SECRET | openid, offline_access, User.Read, Mail.Read | No endpoint (credentials deleted) | Entra app, "common" tenant | Approval required |
| Slack | SLACK_CLIENT_ID/SECRET | openid, profile, email | Yes (auth.revoke) | Enable Sign in with Slack | Approval required |
| Notion | NOTION_CLIENT_ID/SECRET | (page picker at consent) | No endpoint | Public integration | Approval required |
| Discord | DISCORD_CLIENT_ID/SECRET | identify | Yes | — | Approval required |
| HubSpot | HUBSPOT_CLIENT_ID/SECRET | oauth, crm.objects.contacts.read | No (credentials deleted) | Public app | Approval required |
| Salesforce | SALESFORCE_CLIENT_ID/SECRET | openid, api, refresh_token | Yes | Connected App with PKCE | Approval required |
| Stripe | STRIPE_CONNECT_CLIENT_ID/SECRET | read_only (Connect OAuth) | Yes (deauthorize) | Connect platform; `ca_` id + platform secret | Approval required |
| X | X_CLIENT_ID/SECRET | users.read, tweet.read, offline.access | Yes | Confidential client, OAuth 2.0 enabled | Approval required |
| TikTok | TIKTOK_CLIENT_ID (client key)/SECRET | user.info.basic | Yes | Approved Login Kit app | Approval required |

Sign-in providers: **Google** enabled (managed). **GitHub** sign-in is not supported by this backend's sign-in service; the button says so and starts nothing. (Per-user GitHub *data* access could be an App User Connector later.)

## Evidence
| Item | Result | Evidence |
|---|---|---|
| Server start without session | PASS | Deployed function returns 401 "Sign in required" (anon curl) |
| Missing config → Approval required, no OAuth launched | PASS (unit) / NOT TESTED signed-in UI | `missingConfiguration` tests; start returns `not_configured` |
| Callback allowlist / Origin derivation / lookalike domains | PASS (unit) | `src/lib/accountIntegrations.test.ts` |
| Consent URL state, PKCE S256, TikTok client_key, minimal read scopes | PASS (unit) | same |
| Status labels, Connected needs verified server row | PASS (unit) | same |
| Stray `?code&state` without started integration not treated as integration | PASS (unit) | `isIntegrationReturn` tests |
| Member cannot write connection rows | PASS (DB) | Migration revoked insert/update/delete; policies are read-own only |
| /integrations anonymous → /login?next=/integrations | PASS desktop | Playwright |
| Login shows Continue with Google + GitHub | PASS desktop (screenshot) | `/tmp/browser/int/pre_1280.png` |
| GitHub explanation / Google click / mobile | NOT TESTED | Test browser stalled on the animated background (software WebGL) |
| Real connect, refresh, disconnect/revoke, replay against provider | BLOCKED | No provider apps/secrets, no authorized test accounts |
| Google sign-in end-to-end, account matching | BLOCKED | Needs a real user consent; matching is done by the auth service on the verified Google identity (no email-only merge in app code) |
| Signed-in /integrations UI | NOT TESTED | No authorized session used |
| Published cyberlink.social | NOT TESTED | Publishing not authorized; callbacks are already allowlisted for it |

Automated: 154/154 focused tests pass; type check passes.

## Security hardening pass (2026-10-03)

Source docs used: Stripe https://docs.stripe.com/connect/oauth-reference · Supabase https://supabase.com/docs/guides/auth/social-login/auth-google and https://supabase.com/docs/guides/auth/redirect-urls · Slack https://docs.slack.dev/authentication/installing-with-oauth/ · Notion https://developers.notion.com/guides/get-started/authorization

| Finding | Change | Status |
|---|---|---|
| connector-credentials save marked connected/healthy before storing secrets | Saves as `pending`/`unverified`; refuses to overwrite an already-connected account (409); rolls back row+secrets if any vault write fails; `acct:*` services rejected (OAuth only); typed name stored as label, never as `account_name`/identity | Code changed, NOT DEPLOYED |
| putSecret truncated at 8000 chars | Rejects values > 16000 chars with an error; no truncation. Encryption key/format unchanged (v1, same HKDF salt) | Code changed, NOT DEPLOYED |
| testConnection treated missing result as success | Requires explicit `ok === true` result | Code changed (front end) |
| useConnections ignored DB errors, auth race | Request-sequence guard discards stale/previous-user responses; clears on SIGNED_IN/SIGNED_OUT; exposes `error` | Code changed (front end) |
| One token shape for all providers | Per-provider `successField` (Stripe: `stripe_user_id`); TikTok `client_key`; Notion Basic+JSON; X Basic+client_id; tokens stored only if returned; granted scopes recorded from token response | Code changed, unit-tested, NOT DEPLOYED |
| Stripe `read_only` scope | Removed (Extensions-only). Stripe stays **Approval required** until owner confirms app type; no auto expansion to read_write; not refreshable; livemode recorded | Code changed |
| Supabase sign-in callback | Provider callback is the backend `/auth/v1/callback` (managed); app `redirect_uri` is `/auth/callback`; integrations use distinct `connector_oauth_attempts` state | Unchanged, documented |

Open / blocked:
- Slack: current adapter is "Sign in with Slack" (OIDC, top-level token). A workspace install with `authed_user.access_token` needs a separate adapter — NOT IMPLEMENTED.
- Legacy `/integrations` callback → `/auth/callback` migration for in-flight legacy attempts — NOT IMPLEMENTED.
- Stripe livemode match vs. platform key mode — recorded only, not enforced.
- Edge function changes are not deployed (preview-only instruction); live backend still runs the previous code.
- All real provider flows BLOCKED: no provider client credentials configured.

## Correction (Oct 3 2026): verified status everywhere
- Live published evidence: Facebook/Instagram rows showed provider "invalid OAuth access token" errors while displaying Connected + Active; manual api_key rows showed Active. FAIL on published build.
- Fix (preview only): single rule `isVerifiedConnection` (status connected + provider-verified account id + no last_error + healthy) now drives Settings account connections, social connections, Connectors page, Studio broadcast and Integrations. Errored rows show "Connection failed"; unverified saved keys show "Not verified"; "Active" only for verified rows. Display-only: no rows, credentials or accounts deleted or revoked.
- /settings correction: published /settings already selects Account settings (incl. hard refresh) — PASS, left unchanged.
- Bare `access_denied` callback with an existing session redirected to dashboard on the published build — cancellation FAIL there. Preview code shows the cancellation message and stops before any session redirect; published remains FAIL until a publish is authorized.
