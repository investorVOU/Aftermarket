# README claim audit — November 12, 2026

Scope matters: local checks, earlier testnet evidence, the current hosted game,
and the unpublished candidate are separate results. The public host is
**https://aftmarket.xyz**, supplied by the owner and verified over HTTPS.

| README claim | Verified where / how | Limit |
|---|---|---|
| Public playable URL | Hosted `/`, `/api/config`, `/api/health` and `/client.js` returned HTTP 200; `HOSTED_VERIFICATION.json` | Availability at the recorded time, not an uptime guarantee |
| One-click guest without signup/email/CAPTCHA | Hosted config reported `configured:true`, `guestEnabled:true`; actual `POST /api/guest` with the custom-domain Origin issued a session; `/api/session` loaded its world and managed identity | API verified; restored real-session Chrome entry also worked. Personal email/Google entry was not verified |
| Managed in-game wallet, no setup/keys/gas prompts | Real hosted guest mapped to a 64-character owner; server derives managed identities; no external wallet flow is used | Custodial key model, not MPC or an individually funded native account |
| Autonomous rule-based merchants buy inputs and produce/trade | Deterministic engine, conservation and supply/demand checks; earlier real API/testnet loop; hosted week run changed all six prices | Not AI agents/LLM decisions; each player has a separate island |
| Merchants run out of cash, close and reopen after investment | Local engine and earlier Chrome week/investment checks; `BROWSER_EVIDENCE.json`, `shared/merchant-rules.js` | Closure/recovery was not newly verified on the hosted URL |
| Real NEP-245 items | Previously deployed contract and actual mint/burn receipts; `TESTNET_EVIDENCE.json`, `LIVE_GAME_EVIDENCE.json` | Current hosted end-to-end receipt result is recorded below; a configured flag alone is not chain proof |
| Contract account and exact WASM hash | Values match both recorded build/deployed hashes in `TESTNET_EVIDENCE.json` | Historical final-state verification; not a fresh deployment this turn |
| Deployment/mint explorer links | Hashes come directly from `TESTNET_EVIDENCE.json`; external link checks in `README_LINK_CHECK.json` | HTTP reachability does not independently prove transaction semantics; recorded verification checked those |
| `near:items` needs no signing key | Rerun from a clean checkout without a signing key: final block 277405388, Trading Post licence = 1; source in `scripts/onchain-items.cjs` | Subject to RPC availability; does not imply the example player still holds previously sold items |
| Terminal-only `demo:check` exists and fails non-zero | Script and local checks; initial hosted run failed movement on a high-RTT route | Candidate adds `BASE_URL` alias and latency-aware movement. Final hosted rerun status is below, not presumed successful |
| Gather three timber, craft with $2/eight seconds, sell for credits | Local engine/API checks and earlier authenticated testnet loop; latest hosted run gathered/crafted successfully | Full hosted sale not part of the current headless check, which retains furniture to verify its mint |
| Seven days in about a minute | Same engine at 49×; earlier browser check and latest hosted API week run; all six prices changed | The complete onboarding + preview + settlement takes longer than 60 seconds |
| Phone conversations, tracking, text calls | Local API Chrome desktop/mobile checks, `PLAYABILITY_EVIDENCE.json` | Not real telephony or voice; not reverified through a new hosted contact call this turn |
| Player-owned Trading Post and bound licence | Local progression checks; earlier real API acquisition and mint receipt in `LIVE_GAME_EVIDENCE.json` | Not newly acquired through the hosted URL this turn |
| Offline elapsed-time evolution | Scheduler and same-engine offline checks; persisted timestamps | Catch-up is on loading an idle island; no always-on/shared multiplayer claim |
| Readable merchant pricing and explanations | Source `shared/merchant-rules.js`, quote UI, local checks and hosted price observations | Rule-based economic model, not unrestricted market prediction |
| Friendly inventory/receipts and collapsed verification | Candidate Chrome desktop/mobile against real hosted API; verified details closed by default and readable final balances when opened | Candidate renderer/client intercepted locally in Chrome; not deployed |
| Immediate movement; no balance authority on client | Local prediction/threshold/order/queue checks; real hosted API profiling with candidate client | Server autosave/timeout changes are locally checked and still need deployment |
| Render performance | `MOVEMENT_PROFILE.json`, same installed headless Chrome, six-second alternating movement samples | Small samples, changing network/server load, no physical-device FPS claim |
| Merchant ledger identities and mirrored game credits | `server/near.cjs`, contract and previous player/merchant final balance queries | Managed-key-derived contract-held ledger identities; not native accounts. Credits are non-redeemable |
| Privileged operator sponsors testnet fees | Relayer/contract code and recorded real controller receipts | Trusted controller; no mainnet transaction or real-fund spend claimed |
| Supabase transaction/outbox persistence | Atomic commit/RLS/concurrency checks plus earlier live database verification; hosted session persisted | Single supported backend instance; no distributed island lease |
| Baseline starts with November 9 import of earlier v0.6 | Available history and published `957283d`; source comparison | Import already includes backend/contract work, not an untouched pre-window baseline |
| Published checkpoint/diff and tags exist | Unauthenticated GitHub API returned review branch `58d2cca`, main `b478308`, tags at `957283d` and `586d638` | Current candidate is unpublished. The old submission tag is not called the final candidate |
| AI/library/MIT disclosure | Existing project history, package manifest/lockfiles, Rust manifest and LICENSE | Baseline generated with Claude; subsequent backend/NEAR work with Codex assistance; no audited-security claim |
| No other-chain, Intents or NEAR Auth/MPC claim | Current code and integration boundaries | Unused NEAR Auth dependencies do not constitute a working integration |
| Google disabled and email/OAuth unverified | Hosted config `googleEnabled:false`; no callback/inbox check performed | Operator must configure and verify these if offered |

## Hosted terminal rerun — November 13

The latest latency-aware checker **passed** against `https://aftmarket.xyz`:
real API guest, gathering three timber, crafting one furniture, the actual
seven-day preview, distinct merchant owner, final player furniture balance = 1
and its matching NEP-245 mint event. No email, CAPTCHA or player signing key was
used for gameplay. Independent RPC checking used the operator's locally configured
primary/fallback transport; a fresh clone defaults to the public primary.

Receipt: `J2NJm9TAymoEym8PYgryd5vxxxbym13bvY8UsMqpszSd`.
Public evidence: `DEMO_CHECK_EVIDENCE.json`. This check retains furniture to verify
the mint; it does not claim a new hosted furniture sale or business acquisition.
The November 12 failures/backlog are historical observations, preserved in
`HOSTED_VERIFICATION.json`. A later operator recovery read found no pending head
before this new test. No checkpoint was manually marked confirmed.

| Quote | Before | After |
|---|---:|---:|
| timber | 18.75 | 13.75 |
| workshop | 17.25 | 17.00 |
| furniture | 87.00 | 93.75 |
| maize | 6.00 | 3.25 |
| cassava | 5.50 | 3.00 |
| milk | 5.00 | 4.00 |

QuickNode fallback separately passed a forced-primary-outage test, final testnet
block/code queries and a real verification mint. See `QUICKNODE_VERIFICATION.json`
and `QUICKNODE_SETTLEMENT_EVIDENCE.json`. Endpoint credentials stay private. The
hosted fallback configuration itself still depends on Render environment settings.

## Movement observations

| Metric | Deployed client | Candidate client/renderer |
|---|---:|---:|
| Desktop FPS | 21.64 | 22.31 |
| Mobile viewport FPS | 26.30 | 32.37 |
| Desktop median sync latency | 473 ms | 547 ms |
| Mobile median sync latency | 426 ms | 479 ms |
| Desktop p95 sync latency | 5,378 ms | 1,027 ms |
| Mobile p95 sync latency | 1,232 ms | 929 ms |
| Maximum simultaneous sync requests | 1 | 1 |

Network median latency did **not** improve. These are observations, not controlled
benchmarks establishing a general speedup. Candidate samples had zero stationary
movement frames; the deployed desktop sample included an autosave stall. The
candidate limits small-error correction, serializes state requests, refreshes
input when a request is sent, and ignores stale snapshots. Its adaptive pixel
ratio and 15 Hz shadow updates reduce rendering work on slow devices.

`apply()` continues updating the authoritative snapshot player. It does not replace
the independently predicted render position. Corrections start above 0.65 m;
large divergence above 4 m snaps to server state. Input prediction and server
movement expire after one second without an update. The server candidate also
moves autosaving off `/api/sync` and permits simulation during background saves;
financial actions remain exclusive and durably committed. That backend change
was not deployed to the hosted URL during these client comparisons.
