# AFTERMARKET project audit

Audited 8 November 2026. This records the original Claude artifact and the migration already in progress when the expanded implementation brief arrived. No application rewrite is needed.

## 1. What already works

The original application is a vanilla JavaScript / Three.js r128 game, without React, a router, or a bundler. `game/aftermarket.html` contains procedural geometry, CSS, camera and input, economic simulation, the NPC system and smartphone. There are no imported character models or image assets to replace. The island, forest, buildings, port, ship, logging truck, farm, cattle, tractor, 29 named NPCs, procedural joint animations, and desktop/touch camera should be preserved.

Functional original actions: movement/collision; tree and ore gathering; ore processing; timber/furniture/produce purchases; timber/produce sales; accepting and delivering workshop contracts; Trading Post acquisition, stocking, price changes, capital transfers and upgrades; farm inspection; NPC tracking, dialogue and phone messages. Phone apps Wallet, Marketplace, Messages, Business, Contracts, Activity and Settings read live local state. Minimise, close, back and app switching work. The phone Business app originally offered acquisition and overview; detailed business management lives in the world interaction panel.

Underlying systems include road-graph vehicle routing, pedestrian A*, shared collision data, NPC schedules, automatic forestry and farming, crop growth, milk production, truck/tractor logistics, ship manifests and workshop production. Prices and transfers use integer game cents.

## 2. What is only frontend simulation

All original balances, inventories, progress, owner identifiers, transactions and NPC decisions exist in browser memory. Refreshing resets them. NPC messages are authored deterministic responses to state, not an LLM. Phone signal, Wi-Fi and battery are decorative simulations. The original NEAR screen and badges say “Coming soon”; no on-chain action exists in the Claude baseline. There is no original account, session, remote database, API, multiplayer or offline simulation.

Most prices are constants. Timed customer purchases inject game currency as an economic source; seeds, labour and fuel remove it as sinks. These are game rules, not native NEAR or cash backing. Player-to-player trading is not implemented. Farming is performed by NPCs; player planting/crafting is incomplete. Gold has no buyer. There is no hunger/combat survival loop.

## 3. Missing and problematic

- Persistent profiles, authoritative transactions, authentication, recovery after downtime, economic history and job/event records.
- Real merchant wallet provisioning and a verified social-login-to-wallet flow.
- NEP-245 contract, metadata/storage methods, build/deployment verification, and explicit separation of settled ownership from pending game inventory.
- Tutorial/progression guidance and readable merchant pricing explanations.
- Original contracts bypass workshop capacity and omit player revenue bookkeeping. Business actions lack ownership checks in their underlying methods. These have been corrected in the extracted core.
- Headless baseline on this Windows host: 316 passed / 5 failed, not the README's 321 / 0. Five real-loop movement checks depend on timer scheduling; the harness advances a fixed 16 ms per frame but assumes 4 ms timers. A probe confirmed movement matches simulated elapsed time. They need deterministic timing.
- The renderer performs inventory changes during harvesting. Harvesting has now moved into shared simulation rules.
- World data was registered during rendering. A deterministic manifest has now been captured; the rendered and server collision manifests were compared and match.
- Duplicate phone CSS generations exist in the artifact (older `.phone` classes and the active `#phone` implementation). Preserve the active implementation; remove dead styles in a later cleanup after browser inspection.
- Original source comments overstate full simulation/presentation separation and invariant coverage. Line-number architecture tables are stale after extraction.

No original dependency imports are broken. The original CDN dependency is now served from installed `three`. Browser automation is unavailable in this environment, so visual and device QA remain unverified; passing headless checks cannot prove rendering or responsive layout quality.

## 4. Recommended architecture / migration in progress

- Preserve the Three.js world and existing phone/UI. Use esbuild only to bundle the browser auth/network integration.
- `shared/core.js`: factory-created, isolated simulation and validated economic state; seeded randomness and simulation-owned gathering.
- `shared/merchant-rules.js`: readable stock/demand/cash pricing with explanations.
- `shared/state.js` and `shared/world.json`: versioned snapshots and deterministic collision/navigation/resource data shared by server and client.
- `server/world.cjs`: authoritative intent routing; `server/index.cjs`: fixed-step scheduler and authenticated API; `server/store.cjs`: Supabase persistence; `server/near.cjs`: managed wallet identities and settlement.
- Supabase Auth for verified email/Google identity and Postgres for snapshots, profiles, event/transaction records and a durable settlement outbox. Server-owned rows must not be writable by browsers. RLS restricts player reads. Save + outbox commits must be atomic and use optimistic revisions.
- NEP-245 items live in one Rust contract. Keep movement, pricing and NPC scheduling off-chain. Settle meaningful inventory changes through a disclosed permissioned controller. The UI must distinguish pending state from confirmed ownership. Never represent a generated implicit account identifier as a funded native-NEAR account.
- Development credentials must be optional, visibly labelled, and isolated from real settlement. Testnet verification precedes mainnet deployment. Live credentials are absent at audit time.
- Single Node process initially; database revision checks detect competing writers. Horizontal scaling requires a distributed world lease. Each player currently has a separate island instance; do not describe this as shared multiplayer.

## 5. Implementation phases and evidence

| Phase | Scope | Current evidence / remaining work |
|---|---|---|
| 1 | Audit / design | This document; original docs, source and all suite entrypoints inspected; original baseline run. |
| 2 | Core economy | Core extracted; capacity, quantity and ownership guards added; readable pricing implemented. More history, bankruptcy and progression checks required. |
| 3 | Backend / NPCs | Authenticated intent server, Supabase migration and atomic save/outbox function written. Live database not connected; profiles/history and verification pending. |
| 4 | Offline simulation | Fixed-step server loop and 49× preview written. Offline catch-up and durable scheduling still required. |
| 5 | NEAR | Rust contract and relayer source written. Contract compilation, metadata/storage completion, testnet and auth-wallet integration verification remain open. |
| 6 | UX / integration | Existing design preserved; onboarding, mission card, map, market drawer and handset launcher added. Browser QA, comprehensive automated checks and deployed demonstration remain open. |

Verified during migration: browser bundle builds; server/shared JS syntax checks pass; server serves game/assets and refuses private-file routes; restored snapshot retains 29 NPCs, 15 roads and 20 resource nodes. These are local checks, not proof of live Supabase persistence or blockchain deployment.


## Update - 9 November 2026

The original artifact remains the baseline described above. The extracted core now passes all 321 original checks. New API/economy, embedded PostgreSQL/RLS, DOM-network and compiled WASM checks pass. Offline catch-up, persistent crafting, gold/furniture buyers, bounded histories, durable command IDs and the 49x preview are implemented. The abandoned phone stylesheet was removed.

Four migrations were committed to the real Supabase project and live table/RLS/function/Data API access rules verified. Authentication and actual cross-device play still need a real user session. NEAR account credentials remain absent; contract deployment, full NEAR Auth ownership linking and external-transfer indexing remain open. Browser/device rendering is unverified. See HACKATHON_REQUIREMENTS.md for current completion status.
