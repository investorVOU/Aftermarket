# AFTERMARKET operations

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
| `NEAR_RPC_URL` | `https://test.rpc.fastnear.com` (checked against official provider docs) |
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
Merchant identities are separate balances in the contract, not funded native
subaccounts. Native account activation and user-controlled export are not offered.

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
