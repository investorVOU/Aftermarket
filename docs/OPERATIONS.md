# AFTERMARKET operations

Email delivery and exact Resend/Supabase SMTP configuration are in
[EMAIL_DELIVERY.md](EMAIL_DELIVERY.md). SMTP is configured on Supabase; adding a
Resend key to Render alone does not enable email sign-in delivery.

## November 13 publication and guest recovery

The owner authorized publication to main and the review branch. No force push or
default-branch change was needed. The phone credit system needs no new migration or credential: debt and lender cash
use the existing atomic snapshot/outbox save. Its live chain settlement still
needs verification after deployment. Keep the existing wallet master key.

See [performance and connection evidence](PERFORMANCE.md) for the measured guest
timeout, hosted/client comparison and Render guidance. The current Blueprint's
free service may sleep; choosing an always-on instance is an owner action and was
not performed here. No Supabase setting change was identified as necessary to fix
the observed client timeout. Personal email/Google callbacks remain unverified.

Optional Groq setup is in [MERCHANT_AI.md](MERCHANT_AI.md). Add `GROQ_API_KEY` only
to private server environment variables. A server key enables the integration
unless `GROQ_AGENTS_ENABLED=false` is explicitly set. Use that flag to disable it.

The faster guest route now prefetches availability (without creating accounts),
reuses the identity verified by password sign-in, skips an impossible prior save
for a new guest and sends its atomically saved island in the guest response.
The client can enter when that saved response arrives, while the Supabase SDK persists the session;
it no longer needs an extra world request or a warm-up read after fresh config.
No anonymous-auth setting change is required. Cold starts and upstream latency
remain outside this code's control; performance claims need live measurements.

Guest preparation keeps at most one unused private session ready while the
welcome page opens. Claimed identities are never shared. Preparation counts
toward the daily demo account cap and can be disabled with
`DEMO_GUEST_PREWARM=false`. It creates no on-chain assets until a player claims
and saves the island. The prewarm slot is in memory, not a shared demo login.

The browser retries transient configuration reads automatically. Guest POSTs
carry a private random request ticket; one retry recovers the same response
instead of creating another identity. The server caches tickets for five minutes,
within one process. A restart discards this cache. Never log ticket/session values.
Validation and capacity errors are not automatically retried. For judging traffic,
review `DEMO_GUEST_DAILY_LIMIT` (maximum 200); the Blueprint and unset-value
default now use 200. Existing Render services can retain the older explicit value
30: change that environment variable to 200 and save/redeploy. A Git push does not
automatically replace manually configured Render environment variables. The cap
counts real demo identities created during the preceding rolling 24 hours, not
calendar-day midnight. Failed public entry at the cap does not mean a database
outage. Do not delete existing players to reset it. `/api/config` reports the
effective `guestDailyLimit` without listing accounts or exposing their data.
An always-on Render instance is still required to avoid free-tier spin-down waits.

[Merchant delivery jobs](JOBS.md) use the existing JSON snapshot and transactional
outbox. No migration is needed. Preserve the wallet master key when deploying:
the new `jobdesk` reserve is another managed contract-ledger identity.

The normal screener command retains the crafted item. For an additional real
sale and matching burn receipt check:

```powershell
$env:BASE_URL='https://aftmarket.xyz'
$env:DEMO_CHECK_SELL='true'
npm run demo:check
```

The optional run writes `docs/DEMO_SALE_CHECK_EVIDENCE.json`; it does not replace
the original retained-item proof. It creates a real guest and uses testnet gas
through the hosted operator. Configuration/guest requests allow 60 seconds for
service startup, and failures still exit non-zero.

This release is **testnet-only**. Never put signing keys, Supabase secret keys,
database credentials, refresh tokens or the wallet master key in Git, screenshots
or public logs. The deployment key is not needed by the web server.

## Local modes

A fresh clone runs without credentials using `npm ci` and `npm start` on Node
22.14 or newer. It uses SQLite in `.local/`, a local identity, and no on-chain
assets. The UI says LOCAL DEVELOPMENT. Do not copy a development identity or
SQLite database into a public service.

For connected play, create `.env` from `.env.example` only if it does not already
exist. Supply your own credentials or use the project's private operator copy.
The UI's guest path uses real Supabase Auth and testnet settlement. It requires
the server-only Supabase secret key; Google configuration is not needed for it.

## Environment variables

| Variable | Connected testnet deployment |
|---|---|
| `GAME_MODE` | `connected` |
| `HOST` | `0.0.0.0` on Render; `127.0.0.1` locally |
| `PORT` | Render supplies it; local default 8080 |
| `SUPABASE_URL` | `https://ytfioiujcitikvgbfxwg.supabase.co` for this project |
| `SUPABASE_PUBLISHABLE_KEY` | Project publishable/anon key; may reach the browser |
| `SUPABASE_SECRET_KEY` | Server only; required for HTTPS persistence and guest provisioning |
| `DATABASE_TRANSPORT` | `rest` for HTTPS RPC; `postgres` for direct Postgres.js |
| `DATABASE_URL` | Needed for migrations and optional direct SQL transport; percent-encode the password |
| `NEAR_NETWORK` | `testnet`; the settlement/deploy commands refuse mainnet |
| `NEAR_RPC_URL` | `https://test.rpc.fastnear.com` (FASTNEAR testnet endpoint) |
| `NEAR_SETTLEMENT_ENABLED` | `true` |
| `NEAR_CONTRACT_ID` | `aftermarket-game.testnet` |
| `NEAR_SIGNER_ID` | `aftermarket-ctrl.testnet` |
| `NEAR_SIGNER_PRIVATE_KEY` | Controller key; server only |
| `NEAR_WALLET_MASTER_KEY` | Backed-up 32-byte hex key; derives stable managed identities |
| `NEAR_STORAGE_DEPOSIT` | Maximum attached storage funding per checkpoint; default 0.2 testnet NEAR; unused funding refunded |
| `DEMO_GUEST_ENABLED` | `true` to expose the isolated guest entry path |
| `DEMO_GUEST_DAILY_LIMIT` | Default 30; quota checked against real Auth users, creation serialized by the single server |
| `SUPABASE_GOOGLE_ENABLED` | `true` only after Google OAuth is configured in Supabase |
| `APP_ORIGIN` | Exact HTTPS custom-domain origin, or omit on Render to use `RENDER_EXTERNAL_URL` |
| `NEAR_DEPLOY_PRIVATE_KEY` | Contract account key: local deployment only, **omit from Render** |

Do not change the wallet master key for existing islands: it changes their
identities. The server rejects a mismatch with an already saved wallet.
Keep one backend instance; distributed island leases are not implemented.

## Database

The four migrations in `supabase/migrations/` were applied to this project.
Use a complete reachable URI from Supabase's Connect panel for a new database:

```sh
npm run db:check
npm run db:migrate
npm run db:verify
```

The migration runner uses transactions and private `app_internal.migrations`
checksums. Do not edit applied migrations or apply these files through a second
migration runner. Public game tables have RLS; clients read only their own rows
and cannot write balances or invoke privileged commits. `commit_game` atomically
writes the snapshot, durable command ID, history and settlement outbox.

HTTPS RPC calls use the same PostgreSQL transaction function as direct SQL.
`DATABASE_TRANSPORT=rest` avoids requiring a persistent TCP pooler connection on
the web host. Direct SQL remains available for migrations and local operations.

## Authentication

Configure Supabase Auth Site URL and allowed redirects to the deployed app's
exact origin. Configure SMTP for reliable real email delivery. For Google,
configure its OAuth client in Supabase and enable `SUPABASE_GOOGLE_ENABLED`.
Google was disabled when checked; real inbox/Google callbacks have not been
verified. The server verifies access tokens using `auth.getUser`.

Guest entry is a demo convenience: the server creates an isolated, preconfirmed
Supabase account at a generated `.invalid` address and signs it in with a random
server-generated password. No email is sent. Only its session tokens are returned
to that browser. The admin client is separate from the signed-in client. Guest
accounts have the same own-player RLS isolation, and their demo origin is stored
in server-controlled `app_metadata`. They are not proof of a verified email or
Google identity. Signing out or losing the browser session loses guest access.

The server caps creation to prevent unbounded demo signup. With REST transport,
it stops guest creation at 1,000 total Auth users pending an operator quota review.
No shared demo password, server key or private wallet key reaches the browser.
NEAR Auth/MPC is not used by this release.

## Testnet accounts and deployment

Created and final-RPC-verified: `aftermarket-game.testnet` and
`aftermarket-ctrl.testnet`, funded by the official faucet. Keys are in the local
ignored `.env` and `.local/near/`; the owner must back them up privately.

The current Rust CLI was installed locally but could not initialize the protected
Windows profile directory. Provisioning used the official archived JavaScript CLI
4.0.13 with an explicit project-local key and the current official faucet service;
the configured RPC's chain ID was checked as testnet before creation. This is not
a mainnet operation. For new operator provisioning, use the current
[official CLI documentation](https://docs.near.org/tools/cli).

```sh
npm run contract:build
npm run test:contract
# Only for a NEW, empty contract account configured in .env:
npm run contract:deploy
npm run contract:verify
npm run near:preflight
```

Deployment refuses an account that already has code. The v7 SDK returns
`codeHash`, not the raw RPC field `code_hash`; the guard uses that actual SDK
interface. Verification compares the final deployed WASM bytes with the local
build, performs a real mint and reads the final balance before recording
`.deployments/testnet-verification.json`. Public evidence is in
`TESTNET_EVIDENCE.json` and `LIVE_GAME_EVIDENCE.json`.

The relayer pays testnet gas/storage and serializes settlement. Supabase commits
the authoritative intent and outbox first; pending inventory is not a confirmed
on-chain balance. Replay protection makes retrying a checkpoint safe. The controller
can mint/burn resources and non-redeemable game credits; disclose that trust boundary.
Each merchant has its own wallet identity and on-chain inventory (contract-held, server-managed), not a separately funded native NEAR account.
User-controlled key export is not offered.

Read items without a signer:

```sh
npm run near:items -- <managed-owner-id>
```

`npm run verify:live` is an **opt-in live integration check**. It creates a real
guest, walks via normal movement intents, gathers, crafts and sells, then checks
final balances and matching NEP-245 receipt events. It writes session material
only to ignored `.local/qa/`. It spends faucet testnet NEAR, never real funds.
Do not run it as a default unit test or on mainnet.

If the connected server is already running, set `VERIFY_BASE_URL` to its origin
before running the verifier. This tests the existing service and avoids starting
a second worker against the same outbox. Without it, stop other connected server
instances before running the self-hosted verifier. The Rust toolchain is pinned
to 1.90.0 and dependencies are locked; `near:preflight` compares the actual local
artifact with final deployed code rather than assuming every compiler build is
byte-for-byte identical.

Set `VERIFY_BUSINESS=true` to include First Trade, harvesting for a real workshop
contract and Trading Post acquisition, then verify the bound licence's actual
mint event and balance. This extended check was completed on testnet; it is a
longer progression check than the short gather/craft/sell walkthrough.

## Render

Deploy the single Node Web Service described in `render.yaml` after the owner
approves pushing the local branch. Build: `npm ci && npm run build`. Start:
`node server/index.cjs`. Health: `/api/health`. Do not use a static-site service.
Render supplies `PORT`; the server binds `0.0.0.0` and defaults to connected mode.
An explicitly configured hosted development mode is rejected.

Set the secret variables from the table. The Blueprint includes public IDs and
testnet settings, not secrets. Its free plan was chosen to avoid spending real
funds. Free services can sleep and cold-start; timestamp catch-up advances their
economy on resume. This is not an uptime guarantee. To keep a continuously warm
demo through **2026-11-18** (ideally November 25), the owner must select and fund
an appropriate always-on plan or accept free-tier cold starts. No paid plan was
created or funded by the agent.

After deployment, verify `/api/health` reports configured testnet, guest login,
a saved trade after refresh, an on-chain receipt, and reopening the same email
account on another device. Replace the README's demo/video/X placeholders only
with actual public URLs. Live Render verification remains pending the service URL
and account access; local successful binding is not a deployed demo.

## Failures and recovery

- Pending settlements: inspect the ordered outbox, controller testnet balance,
  storage funding and RPC health. A failed head job delays later jobs. Never mark
  a failed job confirmed manually. The UI's inspector reads final RPC state.
- Lost connection: reload confirmed state; durable command IDs and optimistic
  revisions protect atomic writes. Do not restore only one side of a DB/chain pair.
- Free-tier sleep: expect catch-up; offline time uses the same simulation rules.
- Multiple servers: unsupported for the same island; keep a single instance.
- External token transfers: contract transfer methods exist, but transfer indexing
  back into gameplay is not implemented. This demo does not expose asset export.

## Publication and submission

The repository was already public when checked read-only. The local branch/tag
plan is in `BASELINE.md`. No push, visibility change, paid action, mainnet call,
social post or hackathon submission is authorized by this document.

Before November 14, 23:59 UTC, the owner must approve the exact Git publication,
record the video, publish the X post and confirm the final submission payload.
The agent must not create the mainnet prize-payout account on the owner's behalf.

## Browser-free screener check

With a private configured local `.env`:

```sh
npm ci
npm run demo:check
```

The check starts the real server on an available loopback port when needed. It
reuses a running connected server on `PORT`/8080 to avoid a second relayer. Do not
run multiple connected server instances against the same island/database.

To use the hosted demo from a fresh clone without operator keys:

```sh
BASE_URL=https://aftmarket.xyz npm run demo:check
```

PowerShell:

```powershell
$env:BASE_URL='https://aftmarket.xyz'
npm run demo:check
```

The HTTPS custom domain and actual guest/session requests were verified on
November 12. `DEMO_BASE_URL` remains a supported alias. `DEMO_RPC_URL` selects a testnet RPC for
independent receipt queries. The default is the FASTNEAR testnet endpoint.
Development/off-chain targets fail explicitly. Movement uses collision-checked
`/api/sync`; gathering/crafting use normal validated actions, without teleporting
or changing balances directly. Allow roughly 2–3 minutes; a settlement backlog
or unavailable RPC can exceed that time and fail verification. Successful public
evidence goes into `docs/DEMO_CHECK_EVIDENCE.json`, without credentials or sessions.

`POST /api/guest` with JSON `{}` returns a real isolated session and managed
wallet ID after saving the initial world. Keep its access/refresh tokens private.
Use Bearer authorization for gameplay endpoints. The client needs no email,
CAPTCHA, Supabase admin key or NEAR key; the server needs its private operator
configuration and available guest capacity.

The normal relayer now drains up to eight consecutive checkpoints per cycle,
stopping at the first failure and preserving original receipts on replay. It
refreshes a stale signer nonce and retries the same protected checkpoint at most
twice. Operator recovery uses:

```sh
npm run settlement:drain
```

Prefer stopping the normal server first, then restarting it after recovery.
Recovery validates testnet and processes at most 250 stored checkpoints or ten
minutes. It does not change simulation balances, skip failed jobs or invent
confirmations. A retiring relayer can still cause nonce contention; stop that
process rather than starting more workers. Windows may protect a process started
outside this agent session; its owner must restart that terminal to load the new
server code and `.env` values.

## Phone and movement

NPC dialogue now persists in phone threads, capped at 100 messages per contact.
Messages and in-game text calls read the deterministic NPC state. Tracking follows
live positions without teleporting. Calls do not connect to real phone numbers or
voice services.

Presentation movement predicts collision-checked steps between server responses,
reconciles snapshots above a 0.65 m error and stops predicting after one second without an update. Server
position/range checks, inventory and all economic mutations stay authoritative.
Close walls raise the camera; a minimum-distance overhead fallback avoids placing
it inside the player's head. Browser viewport checks with added network delay
are recorded in `PLAYABILITY_EVIDENCE.json`; physical-device frame rate is unverified.

## aftmarket.xyz deployment handoff

Hosted `/api/config` returned connected testnet with `configured:true` and
`guestEnabled:true`. An actual guest session loaded successfully with
`Origin: https://aftmarket.xyz`. No Supabase or Render credential change is
currently established as necessary for guest entry.

Keep Render `APP_ORIGIN=https://aftmarket.xyz`, `GAME_MODE=connected`,
`NEAR_NETWORK=testnet`, `NEAR_SETTLEMENT_ENABLED=true`, and
`DEMO_GUEST_ENABLED=true`. The Blueprint now supplies that exact public origin.
The existing signer/master/Supabase secret keys must remain unchanged and private.
Use the prepared publication plan before redeploying the candidate; no Git push,
default-branch change or Render settings change is performed by these file edits.

For personal email/Google login, the operator must set Supabase Site URL and
allowed redirect URLs to `https://aftmarket.xyz` (and configure SMTP/Google if
offered). These callbacks remain unverified; Google is disabled in observed
hosted config. Do not enable its button until the provider works end to end.

After approved publication, deploy the reviewed commit in Render and rerun:

```powershell
$env:BASE_URL='https://aftmarket.xyz'
npm run demo:check
```

The checker slows near route waypoints based on measured HTTP latency so it does
not repeatedly overshoot them on a distant server. This uses ordinary bounded
movement input, not a teleport or balance bypass. Its complete route/week/chain
result is distinct from guest authentication alone; see `README_CLAIMS.md`.

The candidate removes synchronous persistence from movement responses. A single
background save captures a snapshot, then permits simulation while its database
commit is pending; financial actions still queue behind it and remain exclusive.
Autosaves are not enqueued repeatedly while a save is active. Snapshot revisions,
outbox checkpoints and command deduplication retain their existing atomic commit.

## QuickNode fallback

Set `QUICKNODE_RPC_URL` to the private **NEAR testnet** endpoint in the local
`.env` and Render secret environment. Its URL contains a credential and must
never be placed in browser code, README examples, screenshots or Git. The local
`.env` also stores `QUICKNODE_API_KEY` as supplied by the operator; the endpoint
itself authenticates JSON-RPC, so that broader API key is not transmitted for RPC
or used for account/billing management. No additional SDK dependency is needed.

Primary RPC remains `NEAR_RPC_URL`; the private endpoint is the fallback. Both
reads and the existing NEAR SDK's transaction transport use the same bounded
router. Each provider must report `chain_id: testnet` before receiving queries
or signed transactions. A failed provider cools down for 30 seconds; transport
retries reuse exactly the same signed transaction bytes. Deterministic nonce or
contract errors do not get disguised as network failover. Endpoint URLs and
upstream response bodies are excluded from error messages and public config.

Use NEAR `status`, `block` and `query` methods. `eth_blockNumber` is an Ethereum
method and is not used. QuickNode documents direct JSON-RPC access; its separate
SDK does not support native Windows. Read-only real fallback verification with a
deliberately failed primary is recorded in `QUICKNODE_VERIFICATION.json`.

The local `.env` is not uploaded during Git publication. Set the secret
`QUICKNODE_RPC_URL` in the existing Render service to activate its fallback,
then redeploy. The broader `QUICKNODE_API_KEY` is stored locally as requested
but is not required by the authenticated endpoint's RPC calls; the Blueprint
does not request that unused management credential. Keep signer and wallet-master
credentials unchanged. The Blueprint contains no private endpoint value.
