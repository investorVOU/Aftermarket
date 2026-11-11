# Milestone history

| # | Milestone | Delivered | Verified |
|---|---|---|---|
| 1 | 3D vertical slice | Three.js world, player, forest harvesting, Timber Supply, Oak & Iron, timber loop | Headless logic |
| 2 | Entrepreneurial foundation | Business model, Trading Post ownership + management panel, contracts, milestones, NPC roles | Headless logic |
| 3 | World/camera/visual upgrade | Irregular coastline, water, textured buildings, jointed characters, varied NPC behaviour, zoom | Headless + user visual feedback |
| 4 | Living settlement | Larger island, 12 houses, 24 NPCs with routines, logging truck, cargo ship + port economy, gold mine | Headless logic |
| 5 | Core architecture & navigation | Sim/presentation split, road graph, pedestrian grid, unified collision, truck on the new system | Headless (29 sim checks) |
| 06A | Input, camera, mobile | Unified Input, CamRig (orbit/zoom/pan/occlusion), joystick, touch camera, NPC tracking, responsive UI | **User tested on real devices: working** |
| 06B | NPC identity & dialogue | Stable names/traits/looks, state-driven dialogue, portraits, choices with real consequences, tracking integration | Headless + e2e through the real loop |
| 06C | Agriculture | Greenfield Farm: ridged fields, maize/cassava lifecycle, cattle + milk, tractor on the road graph, farm NPCs, market, farm panel | Headless + e2e |
| 06D | Smartphone | iOS-style phone from the right, Wallet, Marketplace, Messages, Business, Contracts, Activity, Settings, NEAR placeholder | Headless + e2e; original 06D functional spec not supplied |

## November 9, 2026 upgrade

The preserved world now runs through an authoritative Node backend, shared economic simulation, Supabase persistence, dynamic quotes, transaction history, offline catch-up, production, gold/furniture sales and shortage/recovery events. Four migrations are applied to the live database. A NEP-245 contract compiles to WASM and passes emulated-host checks; it is not deployed. The phone launcher now uses a handset illustration.

Remaining: live social login verification, NEAR Auth ownership linking, testnet contract deployment and verification before mainnet, external-transfer indexing, hosted/browser verification, multiplayer, day/night, weather and rigged character models. See the root requirements checklist for current evidence.

## Highest-value next steps
1. Real-browser pass on 06B-06D visuals (dialogue panel, farm look, phone layout, mobile performance).
2. Publish the existing Node application using `render.yaml`; follow `RENDER_DEPLOYMENT.md`.
3. Finish the authentication and chain work listed in `BACKEND_HANDOFF.md`.
4. Expand economic events beyond the implemented stock shortage/recovery rules.
