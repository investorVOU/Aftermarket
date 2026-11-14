# Track 09 — Games With Real Economies

Updated November 13, 2026. Implemented code, local checks and hosted/testnet proof
are different verification states. [README claim audit](docs/README_CLAIMS.md).

Sources: [organizer rules](https://nearhackathon.com/HACKATHON.md),
[Track 9 example](https://github.com/nearai/near-hackathon-prompt-examples/blob/main/tracks/09-games.md).
Testnet is eligible. Email or social sign-in is requested by the example; Google,
X OAuth, Intents and MPC are not prerequisites for the chosen email path.

Each merchant has its own wallet identity and on-chain inventory (contract-held,
server-managed), not a separately funded native NEAR account.

| Feature | Status | Verification / boundary |
|---|---|---|
| Functional core loop | Implemented + hosted | Gather → craft → sell, actual mint/burn and final balances; [sale proof](docs/DEMO_SALE_CHECK_EVIDENCE.json) |
| Autonomous NPC merchants | Implemented | Procurement, production, shipping, consumption, cash constraints and trade; [engine](shared/core.js) |
| Merchant identities/inventories | Implemented + testnet | Distinct per-island contract owners; [hosted merchant identity](docs/DEMO_CHECK_EVIDENCE.json), final balance reads |
| Dynamic supply/demand pricing | Implemented + hosted | [Readable rules](shared/merchant-rules.js), six changed quotes in hosted week evidence |
| Explainable merchant decisions | Implemented + hosted UI | Quote reasoning, stock, cash, financial state and arrears; [screenshots](docs/SCREENSHOT_EVIDENCE.json) |
| Closure and recovery | Implemented + engine/browser | Costs exhaust treasury; legitimate investment pays arrears and restores working capital; `docs/BROWSER_EVIDENCE.json` |
| Player-owned items | Implemented + testnet | NEP-245 mint/burn and final owner balances; pending/final states separated |
| Player-owned Trading Post | Implemented + testnet | Acquisition and bound licence balance 1; [loop evidence](docs/LIVE_GAME_EVIDENCE.json) |
| NPC-to-NPC economy | Implemented | Forestry/port/yard/workshop and farm/market trades with finite stock/cash |
| Persistence and offline economy | Implemented + DB checks | Atomic Supabase save/history/outbox; RLS/concurrency checks; elapsed-time catch-up when idle island loads |
| Week in about a minute | Implemented + hosted | Same fixed-step engine at 49×; [API evidence](docs/DEMO_CHECK_EVIDENCE.json), fresh hosted UI screenshot run |
| NEP-245 single contract | Deployed + verified | `aftermarket-game.testnet`, exact WASM hash, six compiled-WASM checks and actual receipts; [evidence](docs/TESTNET_EVIDENCE.json) |
| Managed guest entry | Implemented + hosted | Real isolated Supabase session and managed identity; no email/CAPTCHA/key/gas prompts; fresh hosted Chrome entry verified |
| Personal email login | Configured + hosted flow verified | Verified Resend sender domain, SMTP read-back, hosted email send, provider `delivered` event, actual Supabase link return and same identity after reload; [evidence](docs/EMAIL_VERIFICATION.json). Physical inbox and second-device test remain open |
| Google login | Disabled / unverified | Optional; no callback claim |
| Optional Groq proposals/dialogue | Implemented; owner-reported live | Owner's working `openai/gpt-oss-20b` unchanged. Mocked automated provider checks are not independent live proof |
| Browser-free screener | Implemented + hosted | `BASE_URL=https://aftmarket.xyz npm run demo:check`; guest, gather, craft, week, real final item/mint verification; fails non-zero |
| Read-only on-chain inspector | Implemented + testnet | `npm run near:items -- <owner-id>`, no signing key; player/merchant selector in game |
| Jobs and retention | Implemented + hosted job | Merchant cash reserves wages; delivery/cancel/expiry, reputation, courier ranks; [$55 job proof](docs/LIVE_JOB_EVIDENCE.json) |
| Regular customers and community progress | Implemented + local checks | Funded repeat orders, relationships, offline shop report, three paid market improvements and announced price events; [details and verification scope](docs/RETENTION.md) |
| Phone borrowing | Implemented + local checks | Finite treasury, fixed fees, due dates, partial/full repayment; no hosted loan receipt claimed |
| Phone Playbook | Implemented + hosted UI | Controls, first sale, jobs, business, loans, chat, offline world and optional ownership; real screenshots |
| Performance and guest recovery | Published + sampled | Prediction, serialized sync, renderer budgets, prewarm and retry; [measurements](docs/PERFORMANCE.md). Physical-device FPS unverified |
| Public repository / hosted game | Verified | Main/review published `ccf254e` before this doc update; host served it during screenshots at `https://aftmarket.xyz` |
| Tests/docs/licence/disclosure | Implemented | Build, lint, API/DB/client checks; MIT; baseline/AI/library/custody boundaries documented |
| Demo video and X demo post | Outstanding | Owner must provide actual public URLs; none invented or published by the agent |
| Final hackathon submission | Outstanding | Human contact/payout information and approval of exact payload required; no API submission performed |

## Remaining release work

1. Check the test message's inbox/spam placement, verify a personal session across
   devices and test on a physical phone. Sending domain, SMTP and the actual
   email-link return to a persistent managed identity are now verified.
2. Record the demo, publish the human's X demo post and approve the exact final
   submission before November 14 at 23:59 UTC. Keep the hosted demo available
   through judging, at least November 18. Free Render spin-down is not an uptime
   guarantee; an always-on tier is an owner decision.

## Boundaries

Separate islands, one backend instance, custodial keys and a privileged controller;
asynchronous settlement; no user key export, external-transfer indexing, shared
multiplayer or P2P market. Credits are non-redeemable and mirrored as `cash` game
cents. No mainnet activity, paid purchase, Intents swap or MPC login is claimed.
