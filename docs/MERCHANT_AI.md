# Optional Groq merchants

The owner has supplied a Groq key in Render. The server enables Groq when a key is present unless `GROQ_AGENTS_ENABLED=false` explicitly disables it. Local `.env.example` defaults to disabled. Provider responses are mocked in automated tests; live hosted verification is recorded separately and must not be inferred from a configured flag.

Set these **server-side** locally and in Render, then restart:

```dotenv
GROQ_AGENTS_ENABLED=true
GROQ_API_KEY=<your-private-Groq-key>
GROQ_MODEL=llama-3.1-8b-instant
GROQ_DAILY_LIMIT=100
```

Never put the key in client code or a public environment variable. The integration uses Groq's [OpenAI-compatible API](https://console.groq.com/docs/openai), [JSON mode](https://console.groq.com/docs/structured-outputs) and a model listed in its [production model catalogue](https://console.groq.com/docs/models). The model ID is configurable.

When enabled, `/api/config` reports `merchantAI.enabled: true`. **Phone → Messages → Margaret, Samuel or Adaeze** offers a message field. Normal scripted topics, tracking and text calls remain available. A merchant receives its current stock, treasury, goal, pricing explanations and public ledger identity. No authentication token, private key or other player's data is sent to Groq.

Groq returns dialogue plus one constrained proposal: hold, restock timber, or sell surplus farm produce, depending on the merchant. The [readable rule file](../shared/merchant-rules.js) chooses the actual item, quantity (one), price, counterparty and stock target. It rechecks cash, inventory, closure and capacity against current state. The model cannot set a price, mint an item, lend money or access player funds. The server records the outcome in phone messages and `economy.agentDecisions`; validated trades use the existing save/outbox settlement path.

While players are active, the optional scheduler considers one merchant per world each minute, rotating the three merchants. API inference happens outside the simulation lock and times out after seven seconds. The process permits one inference at a time and defaults to 100 calls per UTC day. This process-local cap resets on restart: use Groq console spend limits as the account-level budget. Chats have an additional 15-second cooldown. A failed proposal changes no balances. Regular rule-based NPC simulation and offline catch-up continue without Groq; the accelerated preview does not make LLM calls.

Wallets remain managed **contract-ledger identities**, not funded native NEAR accounts. Enabling Groq does not change custody or wallet infrastructure. Tests cover provider failure, invalid proposals, current-state validation, targets, closed shops, call limits and the authenticated persisted chat/trade endpoint. A live provider/key and hosted deployment verification are still required before describing the hosted game as using AI agents.
