# Backend handoff

The proposed backend now exists in `server/` and `shared/`. Read ARCHITECTURE.md and the root README for the current design and configuration.

## Implemented locally

- Shared simulation factory and deterministic world manifest.
- Authoritative whitelisted intents, collision-checked movement and per-island serialization.
- Gathering and production removed from render-time inventory mutation.
- Supabase/Postgres atomic saves, revision guards, settlement outbox, RLS and economic history.
- Persistent development mode explicitly separated from chain ownership.
- Offline catch-up and same-rule fast-forward.
- Compiled multi-token contract and emulated-host WASM checks.

## Remaining verification and engineering

1. Four migrations were applied to the supplied Supabase project on November 9, 2026. All seven game tables have RLS; privileged commit access and browser write restrictions were verified. Keep future schema changes in migrations.
2. Verify email/Google callbacks and an actual cross-device persistent play session.
3. Finish NEAR Auth ownership-link proof and asset migration; the SDK adapter alone is not that integration.
4. Deploy and verify the exact contract build on testnet, then use separate funded mainnet accounts for release.
5. Add external-transfer indexing/import-export before public asset trading.
6. Add distributed island leases before multiple backend instances.
7. Check real browser rendering, handset launcher, desktop/touch controls and mobile performance.

No deployed contract, successful login, receipt or live persistent session has been fabricated. The root requirements checklist records completion status.
