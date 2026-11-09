# AFTERMARKET: Supply & Survival

A 3D island economy built from the existing Claude/Three.js game. Gather timber and ore, produce furniture, trade with merchants, fulfil contracts and run a Trading Post while NPC production, transport and prices respond to supply and demand.

**Status:** playable local development mode; Supabase persistence/auth integration and a compiled NEP-245 contract are implemented. Live schema migrations and access rules are verified. Connected authentication, testnet deployment, full NEAR Auth ownership linking and browser/device QA remain open. See [HACKATHON_REQUIREMENTS.md](HACKATHON_REQUIREMENTS.md). No live transaction or deployment is claimed.

## Run

Requires Node **22.14+**. Development persistence uses Node SQLite.

```sh
npm install
npm start
```

Open **http://localhost:8080** and select **Enter development island**. Development mode saves to `.local/development.sqlite`, is clearly labelled, and does not create on-chain assets. Use the same browser identity to resume that local save.

The server serves `game/aftermarket.html` at `/`. An HTML entry filename is normal; the hackathon does not forbid `index.html` or require a particular framework. Opening an artifact file directly is no longer the supported launch method.

## Play loop

1. Gather forest timber; sell it at Oak & Iron or through the phone Marketplace.
2. Buy and sell to unlock the Trading Post. Complete workshop supply contracts for reputation.
3. At Oak & Iron, use the phone Business app to craft furniture from **3 timber + $2 labour**. The eight-second production job persists. Sell the finished item through Marketplace.
4. Mine ore, refine it at the processing plant and sell refined gold. NPCs grow and transport farm produce.
5. Acquire the Trading Post for $150. Stock it, set prices, manage capital and upgrade storage at its world management panel.
6. Read market explanations and invest in struggling merchants. Development/testnet previews advance seven island days in one minute using the same rules.

Game cash is a **game credit**, not native NEAR, a stablecoin or a redeemable cash claim. Customer demand creates credits; production costs consume them according to explicit rules.

## Controls

| Action | Desktop | Touch |
|---|---|---|
| Move | WASD / arrows | Joystick |
| Camera | Q/E, drag, Shift/middle-drag pan, wheel, C | Drag, pinch, two-finger pan |
| Interact / secondary | F / G | Context buttons |
| Select / talk | Click NPC; T follows nearest; F nearby; 1–9 dialogue | Tap NPC and Talk |
| Phone | P or handset icon | Handset icon |
| Close | Esc | Close/minimise |

## Supabase

Project: `ytfioiujcitikvgbfxwg`. Keep `.env` private; `.env.example` documents the variables.

```dotenv
SUPABASE_URL=https://ytfioiujcitikvgbfxwg.supabase.co
SUPABASE_PUBLISHABLE_KEY=...
SUPABASE_SECRET_KEY=...
DATABASE_URL=postgresql://user:percent-encoded-password@host:port/postgres
```

Copy the exact URI from **Supabase → Connect**. The direct database endpoint requires IPv6 unless an IPv4 add-on is enabled. For an IPv4-only backend, use the **Session pooler** URI from that panel. Do not invent a pooler hostname or region.

The server-only [db.js](db.js) uses Postgres.js, a bounded pool, disabled prepared statements for pooler compatibility, and certificate verification.

```sh
npm run db:check
npm run db:migrate
```

The migration runner applies `supabase/migrations` atomically and records checksums in private `app_internal.migrations`. Do not also apply the same files through a second migration runner. Do not edit an already-applied migration.

Configure email delivery and callback origins in Supabase Auth. Google OAuth is optional through `SUPABASE_GOOGLE_ENABLED=true`. Privileged SQL and service keys never reach the browser. Clients cannot write balances or inventories through the Data API.

Set `GAME_MODE=connected` to use Supabase authentication and cloud saves. `NEAR_SETTLEMENT_ENABLED=false` allows explicitly labelled off-chain play while the contract is being verified. Enable settlement only after NEAR accounts/keys are configured. Local development works without either service.

## NEAR release

Read [AUTH_AND_CHAIN.md](docs/AUTH_AND_CHAIN.md) for ownership, managed keys and pending settlement.

The Rust contract implements NEP-245 balances, supply, mint/burn settlement, transfers/batches, callbacks/refunds, metadata and storage registration. A disclosed controller settles validated game outcomes. Business licences are bound to their island.

**External transfer indexing and asset import/export are not complete.** Do not open public transferable-asset trading before those are integrated.

Install Rust and its `wasm32-unknown-unknown` target:

```sh
npm run contract:build
npm run test:contract
```

Configure a funded **testnet** contract account/controller, signing key and backed-up 32-byte wallet master key in `.env`. Then:

```sh
npm run contract:deploy
npm run contract:verify
```

Deployment refuses to overwrite existing code. Verification performs a real testnet mint and reads the final balance. Mainnet deployment requires a testnet verification record for the exact WASM hash, separate funded mainnet credentials and `NEAR_NETWORK=mainnet`. Accelerated simulation is disabled on mainnet. The operator pays actual gas/storage; unused storage funding is refunded.

**NEAR Auth is partial:** its SDK adapter is written, but approved Auth0 credentials, verified ownership-link proof, asset migration and live callbacks remain necessary. Supabase login plus managed wallets is not completed MPC authentication.

## Checks

```sh
npm run build
npm run lint
npm test
npm run test:contract
```

`lint` checks JavaScript syntax, including the inline renderer. The test command runs backend/API cases, real PostgreSQL SQL semantics through embedded PGlite (**not live Supabase**) and the nine original headless suites. Contract checks execute compiled Rust WASM against an emulated NEAR host; they do not replace testnet verification.

Original suites pass **321/321** after correcting timer-dependent movement assertions and the old placeholder expectation. Browser automation is unavailable: rendering, handset appearance, responsive layout and real mobile performance remain unverified.

## Architecture and hosting

- `shared/core.js`: isolated seeded economy/NPC simulation.
- `shared/merchant-rules.js`: readable pricing, merchant states and explanations.
- `shared/state.js`, `shared/world.json`: snapshots and deterministic shared world.
- `server/`: intents, fixed-step/offline simulation, persistence and settlement worker.
- `game/`: preserved world and phone, onboarding/map/market UI and network bridge.
- `supabase/migrations/`: RLS, optimistic revisions, atomic outbox and economic history.
- `contracts/economy/`: Rust contract and dependency lockfile.

Run one backend instance initially. Each player has a separate island, not shared multiplayer. Loaded islands run without browser tabs; restarted/evicted islands catch up from saved wall timestamps. Long offline periods can take time to simulate. Horizontal scaling needs distributed island leases.

`render.yaml` is a hosting template, not a deployed service. Configure secrets and the exact public `APP_ORIGIN` before deploying. See [PROJECT_AUDIT.md](PROJECT_AUDIT.md) and the requirements checklist for remaining work.


## Hackathon disclosure

The original v0.6 game was generated with Claude and supplied by the project owner. The v0.7 backend/economy/UI/NEAR work was developed with Codex. Third-party components include Three.js, Supabase JS, Postgres.js, NEAR API JS, the NEAR Auth SDK and near-sdk Rust; their licenses remain with their respective authors. The organizer guide permits AI code, templates, existing baselines and testnet entries. Track examples are guidance; the stronger integration targets here also reflect the project brief.

Dependency review currently reports 14 low-severity advisories in the legacy NEAR Auth dependency stack, with no moderate/high/critical advisories. That adapter is not enabled in the public gameplay bundle; review and verify it before enabling MPC login.
