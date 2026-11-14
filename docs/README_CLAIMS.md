# README claim audit — November 13, 2026

This is a verification map, not a score or a guarantee of acceptance. Historical
JSON evidence retains its own timestamp and deployment scope. The new screenshots
use the unmodified hosted release `ccf254e7f71f`, not a locally substituted client.

| README claim | Verified where / how | Practical limit |
|---|---|---|
| Public hosted game and one-click guest | Real Chrome on `https://aftmarket.xyz`, fresh guest session and playable island; `SCREENSHOT_EVIDENCE.json`; live config `configured:true`, `guestEnabled:true` | Availability at the recorded time; no instant-entry or uptime guarantee |
| Screenshots show the game | Actual hosted exchange after a seven-day preview, Jobs and Playbook; no injected economy state; zero observed page errors | Desktop and resized mobile viewport, not physical-device testing |
| Finite economy, merchant prices and production | Shared engine checks; hosted week in `DEMO_CHECK_EVIDENCE.json`; new hosted UI week reached island day 8, 917 trades, yard cash zero | New screenshot run observed closure/cash exhaustion, not a new investment recovery receipt |
| Merchants close and reopen after investment | Engine rules/tests and earlier connected browser investment check, `BROWSER_EVIDENCE.json` | Separate from the newest hosted screenshots |
| Autonomous rule-based merchants | `shared/core.js`, `shared/merchant-rules.js`, deterministic simulation and NPC trade checks | Optional Groq proposals do not own balances or replace authoritative rules |
| Groq model works | Owner reports deployed `openai/gpt-oss-20b` working; hosted feature flag enabled | Provider tests are mocked; no new independent provider call in this task |
| Each merchant has its own wallet identity and inventory | `server/near.cjs`, final NEP-245 reads, distinct merchant ID in `DEMO_CHECK_EVIDENCE.json` | Contract-held, server-managed; not separately funded native NEAR accounts |
| One NEP-245 contract, exact WASM hash and deployment | `TESTNET_EVIDENCE.json`, deployed/build hash match, six compiled-WASM checks | Trusted controller and server validation; no audited-security claim |
| Hosted furniture mint | `DEMO_CHECK_EVIDENCE.json`, player furniture balance 1, matching mint event | Later sales change balances; settlement is asynchronous |
| Hosted furniture sale | `DEMO_SALE_CHECK_EVIDENCE.json`, $50 credit sale, final furniture zero and matching burn receipt | Default headless checker retains its item; optional sale check is separate |
| Merchant-funded jobs | `LIVE_JOB_EVIDENCE.json`, $55 wages, employer furniture, player furniture zero, reserve cash zero and real receipt | One recorded hosted job, not every order/state combination |
| Repeat customers, projects and calendar | `RETENTION_BROWSER_VERIFICATION.json`, `RETENTION_GAMEPLAY_EVIDENCE.json`, server/API/JSONB checks and `RETENTION.md` | Browser layout uses seeded local fixtures; gameplay checker uses a fresh local identity with no injected supplies. Separate hosted/testnet evidence is required before claiming that verification |
| Player-owned Trading Post | `LIVE_GAME_EVIDENCE.json`, acquisition through normal intents and final bound licence balance 1 | Earlier connected testnet run; separate island per user |
| Read-only inventory command | `scripts/onchain-items.cjs`; prior clean-checkout RPC read without signing key | RPC availability; explorer may not index NEP-245 balances on its account page |
| Receipt links | README hashes match the deployment/core-loop/job evidence files; `README_LINK_CHECK.json` | Explorer automated requests can return 403; recorded semantics/RPC reads are separate evidence |
| Browser-free checker | `scripts/demo-check.cjs`, hosted guest/gather/craft/week/item/mint run recorded | Several minutes for full verification, not a 60-second total; daily guest cap applies |
| Gather/craft/sell rules and costs | Shared rules and actual API loop; 3 timber, $2 labour, 8 island seconds, $50 market sale when funded | Proximity, stock/cash/capacity and preview state still validate on server |
| Phone Playbook and Jobs | Fresh hosted screenshots; earlier desktop/mobile/320px functional checks and live job | Long phone pages scroll; no physical-phone performance claim |
| Phone messages, track and text calls | `PLAYABILITY_EVIDENCE.json`, client/API checks | No real voice call or telephony |
| Offline evolution | Elapsed-time scheduler, persisted timestamps and same-engine catch-up checks | Idle unloaded islands catch up when loaded; not shared multiplayer |
| Managed wallet with invisible normal play | Actual hosted guest maps to stable contract owner; no external-wallet flow | Custodial server key; no MPC/key-export claim |
| Credits mirrored on-chain | `cash` token and settlement mapping; integer cents | Non-redeemable game credits, no real-money backing |
| Operator sponsorship | Controller code and real testnet receipts | Operator gas/storage balance required |
| Server authority and persistent economy | Atomic save/outbox, RLS/concurrency/PGlite checks plus recorded live Supabase and hosted saves | Single supported backend instance; embedded checks are not live DB tests |
| Predicted movement | Client prediction, stale-response/queue/reconciliation checks and published profiling | Not a promise of 60 FPS on all hardware; see `PERFORMANCE.md` |
| Day/night cycle and collapsible controls | Four local Chrome viewport checks; native details preference retained after reload; actual development week preview visited all four light periods. `NIGHT_SIDEBAR_VERIFICATION.json`, `CLOCK_CYCLE_VERIFICATION.json` | Deterministic visual screenshots use presented hours 12/23; separate real-clock preview uses unmodified server time. Short local FPS samples do not establish physical-device performance |
| Resend email delivery | Verified sender domain API, Supabase SMTP/redirect read-back, actual hosted form send, Resend `delivered`, actual emailed link opened island, reload retained managed identity; `EMAIL_VERIFICATION.json` | Test link consumed once; no physical inbox-placement or second-device claim. Seven mocked configuration checks are separate from live proof |
| Email satisfies the prompt; Google optional | Official Track 9 example says social or email | Implemented email button alone is not evidence of working delivery/login |
| Baseline and diff | Public November 9 import `957283d`, published checkpoint `ccf254e`, existing Git ancestry | Import already includes backend/contract code; not an untouched pre-window snapshot |
| AI, libraries and MIT | Owner history, manifests, `LICENSE` | Third-party licences remain separate |
| No Intents, MPC or shared multiplayer | Code boundaries and disclosure | Unused auth dependencies are not working integrations |
| Video/X links not provided | No verified public URLs supplied | Human demo post and approved final submission remain outstanding |

Each merchant has its own wallet identity and on-chain inventory (contract-held,
server-managed), not a separately funded native NEAR account.
