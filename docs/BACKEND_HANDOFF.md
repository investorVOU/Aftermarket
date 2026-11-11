# Backend handoff

Read [OPERATIONS.md](OPERATIONS.md), [ARCHITECTURE.md](ARCHITECTURE.md) and [AUTH_AND_CHAIN.md](AUTH_AND_CHAIN.md).

Implemented and verified: deterministic shared economy, authoritative intents, durable command deduplication, Supabase atomic saves and history, RLS, persistent jobs, offline catch-up, NPC pricing/operating costs/recovery, compiled NEP-245 contract, actual testnet deployment, real mint and normal guest/API gather-craft-sell settlement.

The two named funded accounts are aftermarket-game.testnet and aftermarket-ctrl.testnet. Player/merchant ownership uses separate managed contract-ledger identities; native accounts are not individually activated. No MPC integration or external-transfer indexing is claimed.

Remaining operator steps: configure and verify real email/Google callbacks; verify an authenticated cross-device session; publish the reviewed local branch/tags only after approval; configure and verify Render; test physical devices; record the demo, publish the X post and confirm the exact hackathon submission. Multiple backend instances still need distributed island leases. Mainnet is outside this release.
