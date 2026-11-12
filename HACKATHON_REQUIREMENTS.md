# Track 09 — Games With Real Economies

Updated November 12, 2026. Implementation, local verification, live testnet evidence
and a public hosted deployment are different states.

Sources: [live organizer rules](https://nearhackathon.com/HACKATHON.md),
[track example](https://github.com/nearai/near-hackathon-prompt-examples/blob/main/tracks/09-games.md),
and [NEAR Builders](https://nearbuilders.org/build). Testnet entries are eligible.
Track integrations are hints; this project deliberately uses NEP-245 and managed
frictionless authentication. It does not claim NEAR Auth/MPC or Intents.

| Requirement | Status and evidence |
|---|---|
| [x] Functional core loop | Gather → reserve ingredients → craft → sell; real API and final testnet balances verified in `docs/LIVE_GAME_EVIDENCE.json`. Contracts and Trading Post management remain playable. |
| [x] Autonomous NPC merchants | Actual procurement, stock, production, shipping, cash constraints and deterministic decisions; not LLM balances. |
| [x] NPC identities and inventories | Separate per-island owner IDs and real NEP-245 balances; inspect `/api/ownership?actor=ts` or exchange selector. These are managed contract-ledger identities, not funded native subaccounts. |
| [x] Dynamic pricing / supply-demand | `shared/merchant-rules.js`; stock targets, demand pressure, bounded integer quotes, production and consumption. |
| [x] Readable reasoning | Quote explanations and tooltips; stock, treasury, financial state and arrears are visible. |
| [x] Player-owned assets | Real testnet mint/burn receipts and final `mt_batch_balance_of` reads under each player's managed owner ID. Pending inventory is labelled separately. |
| [x] Player-owned market | First Trade → contract-funded Trading Post acquisition verified through normal API intents; final on-chain bound licence balance = 1 and matching mint receipt. Stocking, price competition, capital and upgrades remain playable. `docs/LIVE_GAME_EVIDENCE.json`. |
| [x] NPC-to-NPC economy | Forestry/truck, port/yard, yard or player post/workshop, farm/market; snapshots settle per-merchant item and game-credit balances. |
| [x] Persistent/offline evolution | Supabase atomic saves/history/outbox; same fixed-step catch-up after restart or eviction. Local SQLite development stays available without credentials. |
| [x] Merchant closure/recovery | Yard pays a $90 daily lease; unpaid expenses close it. Investment pays arrears and restores working capital. Pure-engine checks and actual Chrome week/recovery interaction passed. |
| [x] One-week preview | 49× for 60 seconds, same economic rules. Browser run showed closure/reopening, price history and transaction totals. `docs/BROWSER_EVIDENCE.json`. |
| [x] NEP-245 contract | Compiled Rust WASM, six emulated-host checks; actually deployed at `aftermarket-game.testnet`; exact deployed hash and mint verified. `docs/TESTNET_EVIDENCE.json`. |
| [x] Frictionless managed guest entry | Real isolated Supabase Auth session, stable managed identity, no email confirmation/wallet popup/gas prompt; live API and mobile Chrome guest entry verified. |
| [~] Personal email / Google | Code and server verification implemented. Google disabled when checked; actual inbox, OAuth redirects and cross-device social sign-in still need operator verification. Guest convenience is not claimed as verified Google/email ownership. |
| [x] On-chain inspector | Player/merchant selector reads final RPC balances; `npm run near:items -- <owner-id>` works without a signing key. Phone NEAR app links to it. |
| [x] Documentation and licence | Screener-ordered README, MIT, operations guide, explicit custody/game-credit/baseline/AI disclosures. |
| [~] Baseline separation | Local `baseline-import` tag and `hackathon/track-09-testnet` branch. Oldest available import already contains in-window backend work; not mislabelled as pre-window. Review diff/submission tag publication awaits approval. `docs/BASELINE.md`. |
| [x] Public repository | GitHub read-only API confirmed `private:false`. No visibility change was made. Current new branch remains local until approved. |
| [ ] Complete public hosted demonstration | Render Blueprint and environment handoff prepared. Real remote service URL/access and approved Git publication are still needed. |
| [ ] Human demo post and final submission | Owner must record the video, publish X post, provide payout/contact details and confirm the exact API payload. Nothing submitted or posted by the agent. |

## Verified evidence

- Two faucet-funded named testnet accounts; private keys/master key remain local
  and ignored. No mainnet transaction, paid service or real-fund spend.
- Actual deployed WASM hash, deployment transaction and verified mint receipt.
- Normal authenticated API gathering three timber, furniture production and sale;
  final balances plus matching NEP-245 receipt events were checked.
- Separate live merchant balance query; player credit balance after the basic
  loop was 9,800 non-redeemable game cents before later investment.
- Real Chrome mobile guest sign-in; connected session resume, final item inspector,
  one-minute week preview, merchant closure and legitimate recovery; no browser
  JavaScript exceptions in that check. Physical devices remain unverified.
- Build, syntax lint, game/API/database checks and compiled-WASM checks are recorded
  in `docs/RELEASE_CHECKS.md` after final execution. Embedded PGlite is not presented
  as a live Supabase test.

## Known boundaries

Managed custody and a privileged controller; separate islands and a single backend
instance; asynchronous ordered settlement; no external-transfer indexer, user key
export, shared multiplayer or P2P marketplace. The contract already has `cash`, so
non-redeemable credits are mirrored there without adding a separate currency
contract. Native NEAR pays only operator gas/storage on testnet.

## Remaining owner actions

Approve the exact branch/tag publication; configure and verify Render using
`docs/OPERATIONS.md`; provide the actual demo URL; configure/verify personal email
and optional Google callbacks; test a real cross-device session and physical
mobile device; record a video; publish the X post; confirm the submission payload
before November 14 at 23:59 UTC. Keep the demo available through November 18,
ideally November 25. Free Render cold starts are not an uptime guarantee.

The Intents stretch is deliberately skipped while these core release steps remain
open. No quote-only panel, swap or Intents integration is claimed.

## November 12 follow-up

- Implemented movement prediction with authoritative reconciliation, close-wall
  camera clearance, persisted phone conversations, remote text calls and tracking.
- Chrome desktop/mobile viewport messaging, call history, tracking and close controls
  passed with added network delay and no page errors: `docs/PLAYABILITY_EVIDENCE.json`.
- Added `npm run demo:check`: real API guest, gathering, crafting, seven-day economy
  and independent final balance/mint receipt verification; failures exit non-zero.
  The current live rerun result is recorded in `docs/RELEASE_CHECKS.md`.
- Added faster ordered settlement draining and bounded stale-nonce recovery.
  Pending checkpoints are never reported as successful mints. NPCs remain distinct
  contract-ledger owners, not individually funded native accounts.
