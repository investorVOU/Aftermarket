# Regular customers and a town worth returning to

## Play the loop

1. Open **Phone → Town**. Take the Community market garden contract while the
   port can reserve its $104 payment. Buy two maize while the farm has stock.
2. Gather timber, craft a furniture set at Oak & Iron, and bring three timber,
   one furniture and two maize to the community market (-4, 14.3). Each delivery
   pays immediately from the reserve. **Mark market** opens a real waypoint.
3. Completion adds planters at the existing market, five timber spaces to your
   Trading Post and three reputation. Two further contracts add a canopy and a
   harbour banner. No project expires. The port needs real cash to sponsor one;
   its investment button transfers $20 of your game cash, without generating it.
4. Buy the Trading Post in **Business** after completing a buy and a sale. Open
   **Regulars**, compare your shelf price with each customer's budget, and choose
   **Become a regular supplier**. The first order's payment is reserved at once.
5. Stock timber or furniture from your pack. A funded customer collects when the
   full order fits their storage and their business is open. Payment goes into
   the shop till. **Withdraw $20** moves shop capital into your game wallet.
6. Leave supplies on the shelf. Subscribed customers can reserve and collect
   again on later island days when stock is needed, the price fits their budget
   and they have cash. Normal workshop purchases can also use the shop's stock;
   competing buyers make stocking decisions matter.
7. Return to the report: sales and earnings since you last marked it read,
   including ordinary NPC shop purchases. Receipts retain the latest 30 sales;
   unread counts and earnings accumulate independently of that list.

Pending regular orders do not expire or charge fines. **Pause regular orders**
stops future reservations and refunds a pending order once. Existing delivery
jobs and loans retain their separately documented deadlines; this does not
remove loan fees or job expiry.

## Customers and pricing

All price and budget policy lives in [merchant-rules.js](../shared/merchant-rules.js).
The server supplies the phone's explanation; the browser submits an intent,
never a price, quantity, cash balance or completion result.

| Customer | Needs | Starting order | Stock target |
|---|---|---:|---:|
| Oak & Iron | Timber for production | 2 | 9 |
| Harbour Road Market | Furniture for local furnishing | 1 | 4, or 8 during the festival |
| Greenfield Farm | Timber for repairs | 2 | 4 |

Quantity is limited by the unmet stock target. Three paid collections unlock
**Trusted regular**, a 3% higher budget and one extra requested unit; eight unlock
**Partner**, a 6% higher budget and two extra units. These are budget limits, not
automatic price increases. The player still chooses a competitive shelf price.
Each customer buys at most once per island day. The farm consumes up to one
timber daily for maintenance; the market consumes up to one furniture daily for
local furnishing. The workshop uses its normal production rules.

Timber prices range from $10–$24, furniture from $40–$80, adjusted by $1. Existing
orders lock the accepted price; later orders use the then-current shelf price.

## Announced market calendar

One island day is seven real minutes at normal speed. The repeating six-day
calendar gives two days of preparation, two of the furniture festival, then two
of a harvest fair. The phone shows the current phase and the next one.

- Preparation announces the upcoming festival without a price modifier.
- The festival raises furniture quote bases and regular-customer budgets 20%,
  and raises the market's furniture stock target from four to eight.
- The harvest fair lowers farm retail quote bases 20%.

Stock/demand modifiers and finite merchant cash still apply. These are game-time
events, not live-world events or LLM decisions. The same scheduler processes
normal play, offline catch-up and the accelerated week.

## Persistence, custody and accounting

[retention.cjs](../server/retention.cjs) owns the standing-order and construction
state. Existing atomic saves persist `economy.retention` and the reserve in the
game's JSONB snapshot. No schema migration, additional login or provider change
is needed. Command IDs and the existing per-island action queue protect replay
and concurrent submissions.

The new `customerdesk` identity holds reserved cash and delivered project goods.
It is a deterministic, per-island, server-managed contract-ledger identity, not
a funded native account. Shop/customer goods and cash use existing NEP-245
checkpoint settlement. Construction consumes delivered goods on completion;
landmark appearance, relationships and calendar state remain off-chain.

All twelve actors with all eight asset types plus the shop licence fit within
the deployed contract's 100-change checkpoint limit (at most 97 changes). No
contract redeployment or mainnet transaction is part of this feature.

## Verification

- `npm test`: reserve conservation, price/ownership validation, repeat purchases,
  pause/refund, offline time, project delivery, JSONB restore, report totals,
  checkpoint capacity and duplicate/concurrent API requests.
- [Browser checks](RETENTION_BROWSER_VERIFICATION.json): real local API and
  SQLite with deliberately seeded fixtures, desktop/390px/320px Chrome. These
  verify phone controls, payments, report reading, withdrawal, project delivery,
  visible planters and reload. They are not hosted or on-chain proof.
- [Minute-long week check](RETENTION_WEEK_VERIFICATION.json): the actual preview
  reached all three calendar phases and changed furniture/farm quote bases.
  Short local Chrome samples after construction stayed around 60 FPS at desktop,
  390px and 320px viewports; this is not a physical-phone performance claim.
- `BASE_URL=https://aftmarket.xyz npm run demo:retention`: fresh public guest,
  actual purchases/gathering/crafting, funded project, shop acquisition and a
  standing-order sale, followed by a matching NEP-245 receipt. No admin keys or
  injected goods are used. It can take several minutes; a temporary $20 in-game
  loan may bridge shop acquisition, then shop income is withdrawn to repay it.
  It exits non-zero if gameplay or chain verification fails.
- Against a loopback development server the same checker uses a new local
  identity, skips blockchain assertions and labels the result development-only.

Hosted verification is separate from the local fixtures. Physical-phone testing
and long-term economy balancing remain open. Islands remain separate per player;
town projects are shared with that island's NPC economy, not multiplayer projects.
