# Architecture rules

- All third-party account OAuth uses `connector-oauth`; legacy social OAuth functions stay disabled so they cannot bypass one-time state, PKCE, identity verification, or encrypted credential storage.