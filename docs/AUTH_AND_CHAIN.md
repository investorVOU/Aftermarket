# Authentication and asset ownership

## Current implementation and its trust boundary

Connected mode uses Supabase email magic-link / optional Google authentication. The server verifies bearer tokens with `auth.getUser`. It derives separate player/business Ed25519 implicit identities from a server-held master key; these are **managed keys**, not NEAR Auth MPC wallets. A token balance under an implicit ID does not establish that its native-NEAR account has been funded/activated.

The browser submits intents, never balances. Game inventory is an off-chain simulation record. Supabase commits it and an ordered settlement outbox atomically. A server-paid controller applies inventory deltas on NEAR; only a successful final RPC outcome produces a confirmed receipt in the UI. Pending inventory is not represented as confirmed chain ownership. The controller is privileged to mint and burn game items, and business licences are bound to their island. This is a permissioned game, not a trustless financial protocol. Game dollars are game credits, with no native-NEAR or fiat redemption promise.

The native token contract methods support ownership transfers. External transfers are not yet indexed back into simulation inventory. A conflicting subsequent settlement will fail rather than fabricate sufficient chain balances. Asset export/import and wallet migration must therefore be completed before opening transferable assets to general public trading.

## NEAR Auth investigation (8 November 2026)

The current [official NEAR Auth tutorial](https://docs.near.org/web3-apps/tutorials/near-auth) describes Google/Apple/email/passkey identities authenticated with Auth0 and signing secured by MPC. Mainnet requires approved Auth0 client credentials. The documented browser packages are `@fast-auth-near/browser-sdk` and `@fast-auth-near/javascript-provider`. The shipped SDK uses NEAR API v5 interfaces; the backend currently uses v7. `game/near-auth.js` isolates the supported v5 connection via the `near-api-js-legacy` npm alias.

That adapter initializes the provider, performs real SDK login, exposes its signer/public key and handles logout. It is not exposed as a working ownership-link button: before doing that, implement a server-issued, expiring challenge proven by a signed on-chain linking call or verified signature; connect the proof to the existing Supabase profile; migrate existing assets exactly once; and index transfers. Posting a public key is not proof of ownership. None of those steps is replaced with a fabricated account-link success.

### External requirements

1. Approved mainnet NEAR Auth Auth0 client ID (apply through the official tutorial) and current provider testnet settings for verification.
2. Correct callback/logout origins for the deployed app.
3. Supabase project, email delivery, optional Google OAuth configuration and migration deployment.
4. Funded contract/controller accounts, server-only signing key and a backed-up wallet master key.
5. Verify real login, account-link proof and contract calls on testnet before switching production to mainnet.

Supabase social sign-in is implemented as a separate application identity flow. Full NEAR Auth account linking remains partial and is tracked in `HACKATHON_REQUIREMENTS.md`.

## NEAR Intents

No cross-chain swap is necessary for ordinary game-credit and resource transactions. Adding one would increase complexity without improving the central game loop. Intents is deliberately excluded from core gameplay. A future cross-chain cosmetic purchase may justify it, after ownership transfer/indexing is complete.
