# Authentication and asset ownership

## What is real in this testnet release

Supabase email magic-link / optional Google is the application's identity flow.
The backend verifies bearer tokens with `auth.getUser`. Each Supabase user ID maps
deterministically to a managed Ed25519 owner ID derived using a server-held master
key. The same authenticated account returns to the same island and ledger identity.
Guest entry creates an isolated real Supabase Auth session without sending email.
Guest signup was verified in Chrome mobile emulation; the live API verification
gathered timber, crafted furniture and sold it with real final testnet balances.
Google was disabled when checked. Actual inbox delivery and Google callbacks are
not yet verified; configuring a provider is not the same as verifying its login.

The NEP-245 contract is deployed at `aftermarket-game.testnet`; the controller is
`aftermarket-ctrl.testnet`. The exact deployed WASM and a real mint were verified.
See `TESTNET_EVIDENCE.json` and `LIVE_GAME_EVIDENCE.json` for public evidence.

## Managed ledger identities, not MPC

These are server-managed keys. Normal play asks for no seed phrase, wallet popup
or gas prompt. This is **not NEAR Auth/MPC**. The unused SDK adapter is a scaffold
and is not part of the public gameplay bundle. The official NEAR Auth documentation
was investigated, but its account-link proof, migration and callbacks are not a
working feature of this release and are not claimed as such.

Each player and merchant has a separate owner ID in the multi-token contract.
Merchant inventories and game-credit balances are real on-chain balances under
those IDs. Native NEAR accounts/subaccounts are not funded/activated for each
merchant: this is the smallest disclosed contract-ledger implementation. The
controller and contract are the two actual faucet-funded named testnet accounts.

The public inspector uses `mt_batch_balance_of` directly. An explorer's native
account page may not enumerate NEP-245 tokens; the receipt's NEP-245 owner/item
logs and final contract views are the evidence of ownership.

## Settlement and its limits

The client sends whitelisted intents, never balances or inventories. Supabase
commits validated state, a durable command ID and the settlement outbox atomically.
The server-paid controller applies net item/game-credit deltas on testnet; an
ordered worker records final results. Pending gameplay is not a confirmed chain
balance. The inspector reads final RPC state rather than echoing a local number.

The contract binds wallets to islands and rejects unauthorized mint/burn and
replayed revisions. A replay returns false; it cannot replace the original mint
receipt. If a checkpoint is confirmed without its original receipt after recovery,
the UI says so and offers a final balance query instead of inventing a receipt.

This is a permissioned game: the controller can mint/burn inventory and credits.
The `cash` token mirrors non-redeemable integer game cents; it is not native NEAR,
a stablecoin or a redeemable cash claim. Native gas/storage is paid from faucet
testnet funds. Daily operating expenses burn game credits, not real money.

The contract's standard transfer/batch/callback methods exist and are checked.
External transfers are not indexed into the simulation, so this game does not
offer user asset export or a public external marketplace. Business licences are
bound to their island. Custody, indexing and export would require further work
before a public transferable-asset release. This task does not use mainnet.

## NEAR Intents decision

The game-credit economy does not need a cross-chain swap. Intents was not forced
into the core loop. The stretch quote panel is skipped while hosted verification
and the owner's publication/demo steps remain open. No swap, paid quote, mainnet
transaction or working Intents integration is claimed.

Operational configuration and key handling: [OPERATIONS.md](OPERATIONS.md).
