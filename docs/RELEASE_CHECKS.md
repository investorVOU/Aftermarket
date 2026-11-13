# Release verification — November 10, 2026

## November 13 publication and QuickNode

The owner authorized publishing the reviewed game to main. Publication uses a
history-preserving update of main and the review branch; existing tags and the
GitHub default-branch setting remain unchanged.

QuickNode NEAR testnet fallback was verified with a deliberately unavailable
primary. It returned final block 277456966 and the exact deployed WASM hash.
A separate real verification mint completed through the new SDK transport:
`7yT5Uec8gUApUq6fh1pCyLgzbwxu3v9nq96MLwTqHhBv`.
`QUICKNODE_VERIFICATION.json` and `QUICKNODE_SETTLEMENT_EVIDENCE.json` contain
public evidence only. The URL token and API key remain in ignored local `.env`.

Build, syntax lint (57 modules plus renderer), 51 backend/API/database/client/RPC
checks and 322 game checks passed. The contract is unchanged; six WASM checks
are run separately. A private fallback must also be configured in Render's
environment; Git publication never uploads the local `.env`.

## Current unpublished review — November 12

This section supersedes earlier release handoff text for the current candidate.
No Git push/fetch, tag mutation, default-branch change or Render deployment was
performed in this review task. Exact proposed commands are in
`PUBLICATION_APPROVAL.md` and await the owner's approval.

- Build and syntax lint passed (55 modules plus inline renderer); 46 backend/API/
  database/DOM/movement/queue checks and 322 game checks passed. Six compiled-WASM
  checks passed separately: 374 checks total.
- Hosted `https://aftmarket.xyz` game/config/health/client returned HTTP 200.
  Config reported connected testnet, configured and guest enabled. Real guest
  authentication with the custom-domain Origin and session/world loading passed.
- Hosted headless gather/craft/week completed and all six merchant quotes changed.
  Final furniture ownership/receipt verification failed. A subsequent read found
  344 pending checkpoints and this guest's 33 checkpoints still pending. A passing
  hosted chain loop is not claimed.
- The read-only inspector ran in a clean checkout without a signing key and read
  the recorded player's Trading Post licence as 1 at final block 277405388.
- Candidate desktop/mobile Chrome inventory and receipt UI passed against the real
  hosted API with local renderer/client/CSS interception, not a deployment.
  Verification details stay closed by default. Current/candidate FPS and latency
  samples are in `MOVEMENT_PROFILE.json`; no physical-device performance claim.
- README local targets exist and GitHub checkpoint/diff URLs returned HTTP 200.
  Canonical explorer links match recorded hashes but returned HTTP 403 to this
  automated client; the README documents the RPC fallback.
- GitHub API reports the review branch as current default and both historical
  tags already published. Both November 9 main fixes are ancestors of checkpoint
  `58d2cca`; no published tag is proposed for moving.

The new backend moves autosave persistence off the movement response, permits
simulation during a background save, and retains exclusive durable economic
actions. Local queue/transaction checks passed. Hosted backend latency after that
change remains unverified until an approved deployment.

## November 12 follow-up

- Movement prediction, camera clearance, persistent in-phone conversation, NPC text
  call/tracking and the browser-free `demo:check` are implemented. The previous
  dialogue/phone checks were updated to verify the requested phone interaction.
- `npm run build` passed. An intermittent Windows parent-directory access failure
  was addressed with absolute esbuild entry/output paths and symlink preservation.
- Clean publication checkout: build and syntax lint passed (51 modules plus the
  inline renderer); 41 backend/API/database/DOM/movement/settlement checks and 322
  original game checks passed. The six compiled-WASM checks also passed separately.
- Chrome desktop (1280×800) and mobile (390×844) viewport checks passed with added
  120 ms sync-request delay: message reply, persisted call record, NPC tracking and
  close controls; no page exceptions. `PLAYABILITY_EVIDENCE.json` and
  `images/phone-chat-{desktop,mobile}.png`. This is local API QA, not hosted QA.
- The live headless check created real guests, gathered/crafted furniture and
  advanced the actual seven-day simulation. All six merchant quotes changed.
  Its initial final-balance/receipt checks **failed**, including RPC access/errors
  and a settlement backlog (218 pending checkpoints when inspected). They are
  not presented as successful new mint evidence. Prior verified on-chain evidence
  remains separately recorded in `LIVE_GAME_EVIDENCE.json`.
- Recovery exposed concurrent nonce contention with the protected existing server.
  The relayer now batches ordered jobs and retries only stale nonces with a fresh
  signer, without skipping failures or replacing original receipts. The alternate
  generic NEAR RPC answered status but rejected transactions as deprecated; it was
  removed again. Defaults use FASTNEAR from the current official provider list.
- Subsequent recovery did confirm real checkpoints, including
  [checkpoint 574](https://testnet.nearblocks.io/txns/48AaJZiyxSpeBhNcDb4RH6sF6RS8xYmaYAN6v3rJpmvU).
  This demonstrates relaying stored game revisions; it is not represented as a
  passing new `demo:check` or as an empty queue.
- Windows denied stopping the existing local server, so loading new server code
  requires restarting that process from its owning terminal. No second game server
  was started against the connected database. Operator recovery results and final
  publication are reported separately rather than assumed successful.

The table below records the earlier November 10 verification, not a claim that
every external service was reverified on November 12.

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
