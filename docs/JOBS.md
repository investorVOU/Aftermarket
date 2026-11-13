# Merchant jobs

Open **Phone → Jobs**. The board offers deliveries according to live merchant stock and treasury, with one active job per player. Accept an order, gather or craft its inputs, use **Show delivery location**, walk there and choose **Deliver & collect wages**. This is a real sale: the merchant receives the goods and pays from its own finite cash.

| Order | Deliver | Vacancy condition | Pay |
|---|---|---|---|
| Workshop supply run | 3 timber at Oak & Iron | Workshop has fewer than 9 timber | Current timber bid plus $1 per timber, locked on acceptance |
| Harbour restocking | 2 timber at the Port Warehouse forecourt | Port stock below 30 | $36 game credits |
| Furnish the market | 1 furniture at Harbour Road Market | Market furniture stock below 5 | $55 game credits |

The employer reserves the entire reward in a separate managed contract-ledger escrow identity when accepting the job. The reservation, active job and expiry save atomically through the same database/outbox path as trades. Reserved wages are not available for another NPC purchase. Delivery is checked on the server for distance, quantity, ownership, shop closure and storage capacity. The final trade records income and economic history, adds one reputation and increments career progress.

The board limits each order to one completion per island day. Production, NPC trade, funds and shortages determine whether it returns. Three completions earn **Trusted courier**, ten **Island specialist**; reputation contributes to the existing entrepreneur milestones. These are progression titles, not new buildings or a claim of a complete career system.

Jobs expire after two island days (14 minutes at normal time). Offline catch-up and week preview advance that clock. Cancellation or expiry returns the reserved money to the employer; the player keeps undelivered goods. A closed shop or full warehouse cannot take a delivery—wait, help the shop recover, or cancel. Cancellation never pays the player. Credit loans and wages remain non-redeemable game credits.

[Implementation](../server/employment.cjs), [conservation/restore/demand checks](../tests/employment.test.cjs), and concurrent API checks in [backend tests](../tests/backend.test.cjs). No migration or contract redeployment is needed: job state uses the existing snapshot schema and `cash`/item tokens. The checkpoint remains below the deployed contract's 100-change limit.

Local Chrome checks cover acceptance, job waypoints, cancellation and viewport fit. Live completion and settlement evidence will be added only after the published backend has been exercised successfully.
