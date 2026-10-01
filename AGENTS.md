# Architecture rules

- All third-party account OAuth uses `connector-oauth`; legacy social OAuth functions stay disabled so they cannot bypass one-time state, PKCE, identity verification, or encrypted credential storage.
- OAuth callback URLs are derived server-side from trusted request origins; successful connections require a provider-verified stable account identity before atomic activation.
- Shared and Voyage space views render one quality-scaled spatial cosmic-event system; source imagery may texture geometry but never acts as a standalone event billboard.