# Current architecture

The original Three.js renderer is preserved. The simulation is now a shared factory module and the browser sends authenticated intents to a Node server.

```text
Browser: Three.js world + phone + onboarding/market/map
    | intents, movement, snapshots
Node: isolated islands + fixed-step simulation
    | atomic optimistic-revision saves
Supabase/Postgres: snapshots + profiles/history + settlement outbox
    | ordered sponsored settlement worker
NEAR: NEP-245 items + business licences
```

`shared/core.js` owns economic state, NPCs, logistics, farming, player gathering and production. Instances have independent seeded randomness. `shared/world.json` stores collisions, roads, homes, schedules and resources. The preserved renderer builds geometry with a fixed seed; its collision manifest was compared to the server's and matches.

`shared/merchant-rules.js` owns stock/demand quotes, explanations, financial states and price/shortage history. Core transfers validate quantities, cash and capacity. `server/world.cjs` exposes only whitelisted intents; client balances and positions are never accepted. Movement is normalized and collision-checked on the server; the browser interpolates toward snapshots.

`server/simulation.cjs` uses a fixed 0.1-second economic step for real time, offline catch-up and 49× previews. Loaded islands run without browser tabs. Evicted/restarted islands catch up from persisted wall timestamps. This is elapsed-time simulation, not a claim that a sleeping serverless process runs continuously.

Supabase writes use server credentials or server-only Postgres.js. `commit_game` checks the expected revision and atomically saves state/outbox. A trigger stores normalized profiles, trades, prices and events. RLS allows only own-player reads; browser writes and privileged RPC execution are denied. Local development uses SQLite and never generates chain receipts.

Command IDs persist in the database's `game_commands` table, with a 100-command in-memory shortcut. Requests serialize per island. Revision guards prevent silent concurrent overwrites. A failed save evicts uncertain in-memory state. Horizontal scaling still needs distributed island leases.

The relayer queues item deltas, not movement or individual NPC decisions. The Rust contract checks controller authorization, world/wallet association, revision replay and item balances. Confirmed receipt links require finalized successful outcomes. External transfer indexing and full NEAR Auth ownership linking remain open; see AUTH_AND_CHAIN.md.

Limitations: separate islands, discrete navigation, headless verification, single-instance outbox worker (a failed head job delays later jobs). Offline restoration restarts pedestrian planning while preserving carried goods, vehicle cargo and production jobs. Browser and live chain verification remain necessary.

## Testnet release changes (10 November)

GuestAuth creates isolated real Supabase demo sessions using a separate admin client; server verification and own-user RLS still apply. Persistence supports HTTPS RPC (recommended on Render) as well as direct Postgres.js. Economic operating costs, arrears and closure/recovery live with readable merchant pricing. The inspector queries final NEP-245 state for the player or a selected merchant. The controller and contract are funded named testnet accounts; player/merchant IDs are managed contract-ledger identities. Idempotent no-op checkpoints cannot overwrite original receipts. The live verifier can target the running service with VERIFY_BASE_URL to avoid starting a second worker. Mainnet is rejected by the settlement/deployment commands. See AUTH_AND_CHAIN.md for custody and external-transfer limitations.
