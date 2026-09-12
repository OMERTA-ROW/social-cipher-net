# Charts, connectors, and live-presence repair

## Outcome
- Restore visible charts across every market and trading surface using only live provider data.
- Make connector setup report exact provider configuration failures and complete OAuth popup confirmation reliably.
- Add a reusable blue live ring to profile pictures and prioritize live creators in discovery.
- Deliver a prioritized audit of unfinished or unwired areas.

## Implementation
1. Reproduce each chart surface in the signed-in preview, capture browser errors, and fix shared rendering/data handling before component-specific defects.
2. Validate and deploy all market functions, preserve the Binance → Kraken → Coinbase → CoinGecko candle fallback, harden stock-provider fallback, and surface provider response details in empty/error states.
3. Validate and deploy connector functions, inspect configured secret names and status responses, then repair popup/callback refresh and error reporting without exposing credentials.
4. Build one reusable live-avatar treatment backed by real active-stream records, use it across shared avatar/profile surfaces, and order Who to follow with active creators first.
5. Audit routes, actions, placeholders, missing functions, and missing secrets; verify desktop/mobile behavior, tests, and the latest build signal.

## Technical details
- Market requests remain server-side through Lovable Cloud functions; no fabricated prices or chart fallback data.
- OAuth credentials remain encrypted and server-only. Providers without developer credentials show an explicit setup-needed state.
- Live status comes from current stream records and realtime updates, never inferred or hard-coded.
