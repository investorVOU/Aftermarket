# AFTERMARKET: Supply & Survival

A persistent 3D market-town game where shortages, merchant cash reserves and operating costs create the opportunities: gather, craft, trade and own a shop while the economy keeps moving offline.

## Try it in 3 minutes

For a fresh local clone, install Node 22.14+ and run:

```sh
npm ci
npm start
```

Open **http://localhost:8080**. Without a private operator configuration this is clearly labelled **LOCAL DEVELOPMENT**: click **Enter development island**. It exercises the game and saves locally; it does not mint blockchain items. Do not overwrite an existing private .env.

On an operator-configured connected testnet server, click **Play as guest / demo account** instead. It creates your own real Supabase session and managed contract identity, without email confirmation or a wallet popup. [Connected setup and hosting](docs/OPERATIONS.md) require server credentials that are deliberately absent from Git. Guest creation is capped; personal email sign-in is also available. Google needs the operator's provider setup.

1. Open the bottom-right phone, choose **Map**, then **Forest**. Close the map, walk to a tree and use the displayed gather action three times. **See three timber in your pack.** WASD/arrows move; on mobile use the left joystick. F interacts; G is the secondary action when a nearby NPC takes the primary slot.
2. Walk to **Oak & Iron** (24, 7 on the map). Open **Phone → Business → Craft furniture**. It consumes three timber and $2 game credits; wait eight island seconds. **See one furniture in your inventory.** No browser animation decides the balance.
3. Open **Phone → Marketplace → Sell**, and sell the furniture. **See $50 game credits added**, leaving $98 from the initial $50 after labour. On the connected server, open the top-right island exchange, wait for a confirmed receipt and choose **Read testnet balances**. **See final contract balances under your managed owner ID.** Pending gameplay and final chain state are explicitly different.
4. In the exchange, start **Seven days. One minute.** **See prices, treasury and trade counts change**, with the timber price history and actual economic events. Trading pauses while the same simulation rules run at 49× speed.
5. The timber yard's thin margin must cover a **$90 daily lease**. In the seeded opening week it runs out of cash and closes. Use **Invest $20 toward recovery** until the bill is paid and working capital is restored. **See the closure/reopening events and trading resume.** The investment spends your actual game balance; it is not a cosmetic recovery animation.
6. On testnet, open a receipt's explorer link and inspect its NEP-245 logs: **owner_id identifies the player or merchant, token_ids identifies the item, and amounts shows the mint/burn**. The contract inspector reads balances directly; the explorer may not index every NEP-245 token in its account UI. In local development, use the verified public examples below to inspect real NEAR activity separately.

The complete gather/craft/sell path has been run through the real authenticated API and final testnet queries. Public evidence: [LIVE_GAME_EVIDENCE.json](docs/LIVE_GAME_EVIDENCE.json). The one-minute browser preview/recovery check is recorded separately in the requirements checklist; physical-device and remote-host verification are distinct.

To keep playing, buy and sell timber to unlock the Trading Post, fulfil workshop supply contracts, and acquire it for $150. Stock your own timber, set its selling price, deposit/withdraw working capital and upgrade storage through its world management panel. NPCs choose the cheapest available supplier.

## How NEAR is used

| System | On-chain | Off-chain / trust boundary |
|---|---|---|
| Resources and crafted goods | One NEP-245 contract: timber, furniture, ore, gold, maize, cassava and milk | Server validates gathering, production and trades; ordered checkpoints mint/burn net deltas |
| Player identity | Stable managed Ed25519 owner ID and real token balances in the contract | Derived from Supabase user ID and a server-held master key; managed custody, not MPC |
| Merchant identities | Separate per-island owner IDs and balances for Timber Supply, workshop, farm, market, port, forestry, mine and Trading Post | These are **contract-ledger identities**, not separately funded native NEAR accounts or subaccounts; deterministic agents run on the server |
| Credits | The existing `cash` token ID mirrors integer game cents in the same contract | Non-redeemable game credits; customer demand creates them, costs consume them. No native NEAR or fiat backing |
| Player business | A bound `trading-post:<world-id>` licence records ownership | Operations, prices, upgrades and simulation are server-authoritative; licences cannot be externally transferred |
| Gas and storage | Controller pays **testnet** NEAR; unused storage funding is refunded | No player seed phrases, wallet popups or gas prompts in ordinary play |
| Persistence | Contract stores confirmed ownership and replay-protected revisions | Supabase stores progress, inventories, jobs, transactions, prices, events and the atomic settlement outbox |

**Contract:** [aftermarket-game.testnet](https://testnet.nearblocks.io/address/aftermarket-game.testnet)

**Controller:** aftermarket-ctrl.testnet

**WASM SHA-256:** `6c18475191ba6237338f18acaa15426e3d84f6f2284ea6cf8205ef0c716bda3c`

- [Deployment](https://testnet.nearblocks.io/txns/ANjnywCznt4y1ZnsPuShySypLXyvSNL2GPvfw7Reb17e)
- [Independent verified timber mint](https://testnet.nearblocks.io/txns/C7Ppi3bMkt4L5f5CSFqvgkcWYmukqGNR6wXnuaZXV35W)
- [Timber gathered by the actual game API](https://testnet.nearblocks.io/txns/6mSJWoZvaKBm7frVy6Yv656523w1cjJyTGe8PRthxSY1)
- [Crafted furniture mint](https://testnet.nearblocks.io/txns/GQh1M49kqr6K4siDaxp5FwGR7qYzuiT1rkTy9JXroRAf)
- [Furniture sale: burn item and credit game cash](https://testnet.nearblocks.io/txns/6vUNRJdqDm63dJpn4m6psvg9Zhocn3QEFCUKidBhkxc4)

[Live Trading Post licence mint](https://testnet.nearblocks.io/txns/HRBPwwe4UAX6FVNR6Ajhh6PZmRZX56H1XuJptBcqrYmu). The extended verifier earned the purchase through First Trade and a real workshop contract, then read the licence balance as 1.

Example verified player owner ID: `047db926e52e94b6f4ecf8cb6a2b00d7b12eb21bb728b3fc935b0d664f2fed20`. The explorer's receipt logs and direct contract query show the ownership; it need not have an activated native account. Read its current balances without a signing key:

```sh
npm run near:items -- 047db926e52e94b6f4ecf8cb6a2b00d7b12eb21bb728b3fc935b0d664f2fed20
```

[Deployment evidence and exact deployed-code hash](docs/TESTNET_EVIDENCE.json). No mainnet operation is used or claimed.

## Track 9 checklist

| Track example / game feature | Where to verify |
|---|---|
| Economy drives gameplay | Scarcity changes quotes, cash limits purchases, production consumes inputs, the lease can close the yard, real investment restores operations |
| Autonomous NPC merchants | `shared/core.js`, `shared/merchant-rules.js`; watch workshop procurement, farm deliveries, forestry truck and imports |
| NPC inventories and wallet balances | Exchange → On-chain inventory selector; authenticated `GET /api/ownership?actor=ts`; separate contract owner IDs |
| Player-owned market | First Trade milestone → Trading Post purchase, stocking, price competition and upgrades; bound on-chain licence |
| Offline evolution | `server/simulation.cjs`, persisted wall timestamps and catch-up after restart/eviction |
| Social/email entry | Supabase email magic-link / optional Google; server verifies tokens and maps every player to the same managed identity. Guest convenience verified; real email/Google callbacks still need operator verification |
| NEP-245 items | `contracts/economy/`; deployed hash, actual receipts, metadata, storage, transfers/batches and callback checks |
| Readable pricing and reasoning | `shared/merchant-rules.js`; explanation text and tooltip on each exchange quote |
| Week in about a minute | Exchange preview: 49×, seven 420-second island days; same economic engine, no separate fake balances |
| NEAR Intents | Not integrated; no swaps or mainnet quotes are required for this non-redeemable game-credit economy |

[Detailed evidence and remaining submission work](HACKATHON_REQUIREMENTS.md). The [live organizer rules](https://nearhackathon.com/HACKATHON.md) allow testnet-only entries and treat track integrations as hints. NEP-245 and frictionless entry are deliberate implementation choices here.

## Baseline, hackathon work and disclosure

The owner supplied a Claude-generated **v0.6** local game: Three.js island, characters, navigation, phone, local trades, contracts, forestry and agriculture. These are baseline, not claimed as new NEAR work. [Audit](PROJECT_AUDIT.md).

The available history starts at [957283d](https://github.com/investorVOU/Aftermarket/tree/957283d), a November 9 import that already includes backend and contract work. There is no authentic pre-window commit to tag. The conservative comparison baseline is `baseline-import` at that commit; the dedicated local branch is `hackathon/track-09-testnet`. This excludes earlier upgrades from the reviewed diff rather than falsely dating the import.

This branch adds the verified testnet deployment/receipts, real guest-to-managed-identity flow, on-chain inspection, daily operating costs/closure/recovery, screener evidence, operations guide and release hygiene. The submission tag is created after final checks. [Proposed baseline-to-submission diff](https://github.com/investorVOU/Aftermarket/compare/baseline-import...hackathon-submission) becomes available after owner-approved publication; until then inspect it locally with `git diff baseline-import..hackathon-submission`. [Exact plan and limitations](docs/BASELINE.md). No history rewrite is used.

AI disclosure: Claude generated the supplied baseline; Codex assisted the backend, economic rules, contract integration, UI and documentation. Intermediate edits from another model were replaced from the known published baseline before the UI corrections. Human review and final submission remain the owner's responsibility.

Libraries: Three.js 0.128, Supabase JS, Postgres.js, near-api-js 7, Rust near-sdk 5.17.2 and near-sys, esbuild, PGlite and jsdom. The unused NEAR Auth adapter/dependencies are not a working MPC integration. Third-party licences remain with their authors; project code is [MIT](LICENSE). No other-chain deployment or swap integration is used.

## Architecture and commands

```text
Three.js browser / phone → authenticated intents → single Node simulation
                                                    ↓ atomic PostgreSQL RPC
                                  Supabase saves + history + settlement outbox
                                                    ↓ sponsored ordered worker
                                  NEAR testnet NEP-245 ownership + licences
```

- `shared/core.js`: isolated seeded economy, NPCs, gathering and persistent production jobs.
- `shared/merchant-rules.js`: stock/demand prices, explanations, daily lease and financial recovery.
- `server/`: validated intents, collision-checked movement, catch-up, auth, persistence and relayer.
- `game/`: preserved world, responsive bottom-right phone, map and camera controls, exchange and contract inspector.
- `supabase/migrations/`: RLS, atomic saves/outbox, history and durable command deduplication.
- `contracts/economy/`: Rust multi-token contract and locked dependencies.

```sh
npm ci
npm run build
npm run lint
npm test
npm run contract:build
npm run test:contract
npm run near:preflight
```

`lint` is syntax checking, including the preserved inline renderer. Unit/API checks use SQLite and embedded PostgreSQL/PGlite; they do not pretend to be live Supabase checks. Contract tests execute compiled WASM against an emulated host. The separate opt-in `npm run verify:live` creates a real testnet guest and verifies the complete live loop; it requires private operator configuration. See [OPERATIONS.md](docs/OPERATIONS.md) for database migrations, auth callbacks, account provisioning, deployment, secrets and Render variables.

The HTML entry filename is an implementation detail: run the Node app rather than opening the file directly. WASD/arrows move, drag/Q/E orbit, scroll/pinch/+/- zoom, Shift-drag/two fingers pan, C follows the player, R resets the view, M toggles the map and P toggles the phone. Mobile has joystick and camera buttons. Map clicks set waypoints, not ownership or player coordinates.

Actual connected testnet captures: [desktop economy](docs/images/economy-desktop.png) and [mobile contract inspector](docs/images/testnet-inventory-mobile.png). [Verification details](docs/RELEASE_CHECKS.md).

### Known limitations

- Single-instance, separate island per player; no shared multiplayer or P2P market.
- Managed custody and a privileged mint/burn controller; no NEAR Auth/MPC, account export or external-transfer indexing. Contract transfer methods exist but external transfers are not reconciled into gameplay.
- Settlement is asynchronous; a failed head outbox job delays later jobs. Inspector balances come from final RPC state and can lag gameplay.
- Google was disabled when checked; real email delivery and cross-device social-login callbacks are not yet verified. Guest signup and a real testnet game loop are verified separately.
- Chrome desktop/mobile viewport checks do not substitute for testing physical devices. Hosted Render verification needs the actual deployment URL and configured environment.
- Free Render services can sleep. Keep the demo available through November 18; the owner must arrange an always-on service if cold starts are unacceptable. No paid service has been started.

### Release links for the owner

- Demo URL: **TODO — supply the verified Render URL**
- Demo video: **TODO — record and supply the public video URL**
- X demo post: **TODO — owner posts with @NEARProtocol and #NEARHackathon**
- Submission: **not sent**; the owner must confirm the exact payload. Do not invent a payout address or create its mainnet account.
