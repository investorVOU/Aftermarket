# Track 09 - Games With Real Economies

Updated 9 November 2026. **Implemented locally**, **verified in live Supabase**, and **deployed on-chain** are separate states. A checked implementation is not a claim of live chain deployment.

Sources: [organizer guide](docs/HACKATHON.md), [track example](https://github.com/nearai/near-hackathon-prompt-examples/blob/main/tracks/09-games.md), [NEAR Builders](https://nearbuilders.org/build).

The organizer guide explicitly says the track integrations are hints, not mandatory event integrations, and testnet projects are eligible. The expanded AFTERMARKET brief independently asks for NEP-245 and NEAR social authentication, so both remain project targets.

| Requirement | Status and evidence |
|---|---|
| [x] Functional core game loop | Gather, trade, contracts, business management, furniture crafting and gold/furniture sales. Original suites now 321/321. Visual WebGL/device QA remains open. |
| [x] Autonomous NPC merchants | Constrained purchasing, production, transport, stock-based decisions, financial states and legitimate capital support. |
| [ ] NPC wallets/account identities | Stable managed Ed25519 derivation verified locally. No live NPC token wallet or chain settlement yet. Off-chain play is explicitly labelled. |
| [x] NPC inventories | Independent business inventories, caps, treasuries and histories. |
| [x] Dynamic pricing | Readable stock/target/demand policy with bounded integer prices. |
| [x] Supply and demand | Actual production, consumption, shortages, oversupply and NPC-to-NPC trades. |
| [ ] Persistent player-owned on-chain assets | Supabase schema and persistence access rules are live and verified; on-chain ownership awaits actual deployment/settlement. Development saves survive restart. |
| [x] Player-owned businesses | Acquisition, stocking, prices, capital, upgrades and reputation. Database persistence implemented; actual authenticated cross-device play needs verification. |
| [x] NPC-to-NPC economy | Forestry to yard; port to yard; yard/post to workshop; farm to market. |
| [x] Offline economy | Server ticks without a browser; persisted timestamps drive catch-up after eviction/downtime. Same fixed-step engine is covered by checks. |
| [ ] NEAR social login | Supabase email/Google UI and server verification are implemented. NEAR Auth SDK adapter is scaffolded; approved credentials, ownership-link proof, asset migration and live callback verification remain open. |
| [x] NEP-245 contract implementation | Rust compiles to WASM; six checks execute the compiled code for authorization, replay, mint/burn, transfers, metadata, storage and callbacks. These use an emulated host, not a deployed chain. |
| [x] Readable pricing rules | shared/merchant-rules.js. |
| [x] Decision explanations | Actual rule explanations appear in the market UI. |
| [x] Week preview | 49x uses normal economic rules. A benchmark advanced 2,940 seconds (seven island days), executed 923 NPC trades and 26 crop harvests in about 4.2 CPU seconds. Mainnet acceleration is disabled. |
| [x] Tests and documentation | Build/syntax lint; original suites; backend/API, PostgreSQL/RLS and DOM-network checks; compiled-WASM checks. Live/browser limitations are documented. |
| [ ] Working complete deployed demonstration | Local development DOM/API flow verified. Render deployment, real social login, testnet receipts and final demonstration remain open. |

## Phase evidence

1. **Audit:** PROJECT_AUDIT.md records Claude's baseline, working UI, local simulation, gaps and architecture.
2. **Economy:** shared/core.js and merchant-rules.js enforce transactions, production, prices, history and recovery; backend checks pass.
3. **Persistence:** four migrations committed to the actual Supabase project. Seven game tables have RLS; server commits allowed, authenticated/anonymous writes denied. Data API schema access checked. No fake user account or play session was created.
4. **Simulation:** fixed-step server engine, persistent jobs, offline catch-up and week preview are implemented and checked.
5. **NEAR:** compiled contract, relayer/outbox, metadata, storage, testnet verification and guarded mainnet deployment scripts exist. Live deployment and full MPC social linking remain partial.
6. **UX:** original island/characters/phone preserved; onboarding, objective card, map, market, feedback and realistic handset launcher added. DOM tests cover onboarding, API trading, market opening and error feedback. Real visual/device QA remains open.

## Deployment modes

- Local development: SQLite, a clearly labelled local identity and no blockchain assets.
- Connected Supabase play with settlement disabled: real application authentication/cloud saves, explicitly off-chain inventory.
- Connected NEAR settlement: enable only with the correct funded accounts/keys, successful testnet verification and network-isolated saved worlds.

## Intents decision

Ordinary game-credit/item trades do not need cross-chain liquidity. Intents is deliberately excluded from the core loop. A future cross-chain cosmetic marketplace may justify it after asset transfer indexing/import-export is complete. No working Intents integration is claimed.

## Still required

Repository publication and Render account access; Supabase email/Google callback configuration and a real cross-device play session; funded testnet account/controller and keys; approved NEAR Auth credentials and linking implementation; actual chain verification; browser/device QA; public demo video/post and final human-confirmed submission before 14 November 2026, 23:59 UTC.
