# Release verification — November 10, 2026

## Completed

| Check | Observed result |
|---|---|
| `npm ci` in a clean publication checkout | Passed; dependencies installed from lockfile without private configuration |
| `npm run build` | Passed in the workspace and clean checkout; browser bundle and server/shared syntax checks |
| `npm run lint` | Passed for 45 JavaScript modules and the inline renderer |
| `npm test` | 35 backend/API/PostgreSQL/DOM/runtime checks and 321 original game checks passed in both checkouts |
| `npm run contract:build` | Passed with Rust 1.90.0; exact deployed artifact hash unchanged |
| `npm run test:contract` | Six compiled-WASM checks passed; this is an emulated host, separately from live evidence |
| Testnet deployment/verification | Real deployment and mint; deployed WASM bytes match the build; `TESTNET_EVIDENCE.json` |
| Live game | Real guest → movement/gathering → craft → sale → First Trade → contract → Trading Post purchase; final item/licence balances and matching mint/burn events; `LIVE_GAME_EVIDENCE.json` |
| Browser | Chrome guest entry in mobile emulation, restored connected session, player/merchant inspector, seven-day preview, closure and investment recovery; `BROWSER_EVIDENCE.json` |
| UI follow-up | Mobile and desktop phone-to-inspector route, visible close controls while scrolled, no overlapping camera/phone controls; no JavaScript exceptions |
| Live Supabase | Four migrations, seven RLS-protected tables, browser commit denied, service commit allowed, service API read and anonymous read denial |
| Dependency audit | 14 low advisories; zero moderate, high or critical. Primarily legacy unused NEAR Auth dependencies; no forced dependency upgrade applied |
| Repository visibility | GitHub read-only API returned `private:false`; no visibility change performed |

The restricted runner blocked network requests under the initial npm deployment
and verification launches. The same project scripts completed when invoked directly
through the permitted Node runtime. A separate npm audit launch had an endpoint
error; a Node-wrapped npm CLI audit then returned the counts above. These transport
errors are not represented as successful initial commands.

The live verifier originally started a second worker alongside the QA server. That
exposed a receipt overwrite on an idempotent replay. The verifier now accepts
`VERIFY_BASE_URL` to test the running service, and settlement updates preserve the
original receipt. Replay/failure result handling has a dedicated check. The final
live loop used one worker and matched the actual NEP-245 owner/item event before
recording each receipt.

## Publication hygiene

The publication checkout is scanned before committing and again after committing:
configured secret values (including decoded database password), private-key and
service-token patterns, tracked private/generated paths and all available history
blobs. `.env`, `.local/`, `.tooling/`, `.deployments/`, dependencies and build outputs
are ignored. Only public IDs, hashes, receipt links and game screenshots belong in
the source/evidence files. The pre-commit audit found zero findings across 85 staged files and all 83 blobs in the three available imported-history commits. A post-commit audit is also performed at handoff. A scan is
not a claim that a private file was published.

## Not verified / not performed

- Real email inbox delivery, Google OAuth and cross-device personal login.
- Physical phones, as distinct from real Chrome mobile viewport/touch emulation.
- Public Render deployment, uptime or the eventual production callback origin.
- External transfer reconciliation, MPC, Intents, shared multiplayer or P2P trading.
- New Git publication, paid services, mainnet activity, X posting or hackathon submission.

Render needs the owner's service URL/account access, environment configuration and
approval to publish the local branch. Free-tier sleeping is disclosed in OPERATIONS.

## Browser captures

[Desktop economy](images/economy-desktop.png), [mobile economy](images/economy-mobile.png),
[desktop inspector](images/testnet-inventory-desktop.png),
[mobile inspector](images/testnet-inventory-mobile.png). These are actual local
connected testnet captures, not mockups or a claim of hosted deployment.
