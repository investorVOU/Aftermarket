# Render deployment

The Node simulation and outbox worker use a persistent process. Deploy the whole application as one Render **Web Service**, using the root `render.yaml`. A single ordinary Vercel Function is not this backend's hosting model; moving to Vercel would require a separate simulation/worker service or an architectural change.

## Initial playable cloud deployment

Repository: https://github.com/investorVOU/Aftermarket

1. Connect the repository to Render and create the Blueprint/Web Service from `render.yaml`.
2. Build: `npm ci && npm run build`. Start: `node server/index.cjs`. Host: `0.0.0.0`. Health: `/api/health`.
3. Set server secrets `DATABASE_URL`, `SUPABASE_PUBLISHABLE_KEY`, `SUPABASE_SECRET_KEY`. The project URL is already in the Blueprint. Never put credentials in source or build arguments.
4. Use `GAME_MODE=connected`, `NEAR_SETTLEMENT_ENABLED=false` for Supabase-backed play while NEAR is being verified. The UI explicitly says off-chain inventory; it does not claim ownership receipts.
5. Render's public URL is used as the allowed request origin automatically. If using a custom domain, set `APP_ORIGIN` to its exact HTTPS origin.
6. In Supabase Auth, set Site URL and allowed redirects to the public app origin. Configure email delivery and optional Google OAuth before testing sign-in.
7. Sign in as a real user, complete a trade, refresh, then sign in on a second device and verify the same inventory. Do not claim that verification until it has actually succeeded.

The free plan is explicitly selected to avoid an unrequested paid service. Free instances can sleep; timestamp catch-up restores elapsed economic progression. An always-on paid plan can be chosen for continuous public-demo availability. Do not run multiple backend instances until distributed island ownership is implemented.

## Enable NEAR

After testnet contract deployment and verification, set `NEAR_SETTLEMENT_ENABLED=true` and the corresponding network/RPC/contract/controller/master-key secrets. Initial activation updates saved wallet identities transactionally. Keep testnet and mainnet saved worlds isolated. Mainnet deployment scripts require a verification record for the same WASM hash.

Full NEAR Auth MPC linking and external transfer indexing are still tracked as incomplete. Native gas/storage is paid by the configured relayer; game dollars remain game credits.

## Live database evidence

Four migrations have been applied to `ytfioiujcitikvgbfxwg`. Verification confirmed seven RLS-protected game tables, server-only commit execution, service API access and anonymous read denial. `npm run db:verify` repeats these checks without creating users or inventing play sessions.
