# The economy is the gameplay

Design agreed before this update's implementation:

| Cadence | Player choice | Economic consequence |
|---|---|---|
| Every 30 seconds | Gather timber, reserve ingredients for furniture, compare merchants, sell | Production consumes inputs; trades move finite cash and inventory; quotes respond to stock |
| Every five minutes | Follow shortages, stock a business, invest in a closed shop, repay an advance | Working capital, storage, operating bills and debt compete for the same cash |
| Each session | Inspect offline changes, decide the next investment, preview a week | The same deterministic simulation advances production, NPC trades, prices and bills |

## Back Alley Credit

Local candidate feature, not yet verified on the hosted deployment. Open **Phone → Back Alley Credit**. Marlow starts with $200 in game credits, lending $20 or $50 at a fixed 20% fee. The due date is three island days (21 minutes at normal speed). Offline time and the week preview count. Overdue debt gets exactly one $5 late fee, without compounding, automatic deductions or asset seizure. Outstanding debt blocks further advances. Repay up to $10 or clear the tab.

The server's [credit rules](../server/credit.cjs) conserve cash between player and lender, validate amounts and reserves, and save debt with the existing atomic snapshot/outbox transaction. Repayment fees count as an expense, not earned trade income. Duplicate action IDs use the existing durable command protection. [Local browser evidence](CREDIT_VERIFICATION.json) records three viewport sizes. Lender cash is included in the normal NEP-245 checkpoint payload under a separate contract-ledger identity; no live loan receipt is claimed yet. Debt terms remain off-chain. These credits cannot be redeemed for real money.
