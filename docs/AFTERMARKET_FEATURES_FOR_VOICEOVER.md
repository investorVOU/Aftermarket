# Aftermarket — feature brief for Rackz's voice-over

This is a factual brief to give GPT when writing the narration. It is not a
finished script. Use the implemented features below, and match the narration to
the actual screen recording. Updated November 14, 2026.

## The game in two sentences

Aftermarket is a 3D island economy game where you gather resources, make goods,
take merchant jobs, trade and build your own business. The economy is the
gameplay: merchants have limited stock and money, prices respond to shortages,
shops can go broke, and your investments can help them reopen.

Play: https://aftmarket.xyz

NEAR Hackathon track: **Track 9 — Games With Real Economies**.

## What the player actually does

- Explore a low-poly island town on desktop or mobile-sized layouts. Walk with
  WASD/arrows or the touch joystick, orbit and zoom the camera, and use nearby
  interactions. The phone contains a map with destination markers.
- The island clock drives dawn, daylight, dusk and night. Windows and streetlamps
  brighten at night. Camera buttons sit inside a collapsible side panel, and the
  objective card can be collapsed with its preference remembered on that browser.
  These visuals and controls have local Chrome verification; match claims about
  the hosted version to the actual deployed footage.
- Gather timber in the forest. Bring three timber to Oak & Iron Workshop and
  craft furniture for $2 in game credits. Production takes eight island seconds.
- Sell furniture through the phone marketplace for $50 in game credits when
  the buyer has the money and capacity. The server checks stock and funds.
- Open Jobs, accept a merchant's shortage-driven order, obtain the requested
  goods and deliver them at its location. The employer reserves wages from its
  own cash when you accept; delivery transfers the goods and pays once.
- Earn reputation and courier progression: three completed jobs unlock Trusted
  courier; ten unlock Island specialist. Orders have deadlines and can expire.
- Progress toward buying the Trading Post. Stock it, set prices, manage capital
  and upgrades, and compete for workshop orders. Its ownership has a bound
  business licence on NEAR testnet.

## The living economy — the main story

- Autonomous rule-based merchants buy supplies, produce goods and trade with
  other merchants. The workshop needs inputs; farms supply market goods;
  forestry, the port and the timber yard participate in supply chains.
- Every merchant has finite cash and inventory. They cannot buy unlimited goods
  or spend money they do not have.
- Prices respond to stock targets and recent demand. Shortages raise quotes;
  excess stock reduces them. The exchange explains the reason behind each quote.
- Expenses matter. Timber Supply pays a daily operating lease. If it cannot pay,
  it closes and accumulates arrears. A player's legitimate investment pays the
  arrears and restores working capital so it can reopen.
- Price history, merchant cash, stock and transaction counts are visible. A fresh
  hosted seven-day preview reached day 8 with 917 trades and a closed timber yard;
  these are recorded observations, not guaranteed numbers for every island.
- The **Seven days. One minute.** preview accelerates the same economic rules.
  Offline elapsed time is caught up when an idle island is loaded again.

Useful narration idea: "You are not just selling items into an endless shop.
Your choices change what the town can produce, what it can afford and what it
needs next."

## The phone is the player's toolkit

- **Playbook:** controls and practical guides for a first sale, jobs, business
  ownership, borrowing, conversations and the offline economy.
- **Map:** mark destinations and find the forest, workshop and other locations.
- **Jobs:** see real merchant needs, accept work, track a delivery and earn wages.
- **Business / Marketplace:** craft, trade and work toward owning the Trading Post.
- **Messages:** chat-style NPC conversations, track an NPC and start an in-game
  text call. Calls are text interactions, not real voice or telephone calls.
- **Inventory and Receipts:** see belongings and economic actions. Technical
  wallet identities and explorer links sit inside optional verification details.
- **Back Alley Credit:** borrow $20 or $50 in non-redeemable game credits from a
  finite lender, with a disclosed fixed fee and due date. Local financial/API and
  browser checks passed; no hosted loan receipt has been recorded. Keep this an
  optional segment, and show it only if the recorded live interaction succeeds.

## How NEAR fits without interrupting play

- Real game items use one deployed **NEP-245 multi-token contract on NEAR testnet**:
  `aftermarket-game.testnet`.
- Normal play uses a managed in-game wallet. Players do not handle seed phrases,
  approve wallet popups or pay gas prompts; the operator sponsors testnet fees.
- Email sign-in uses Supabase links delivered by Resend. Hosted email delivery,
  actual link return and persistence after reload have been verified. Guest
  entry is also available with one click and no signup.
- Each merchant has its own wallet identity and on-chain inventory (contract-held,
  server-managed), not a separately funded native NEAR account.
- Frequent simulation stays off-chain. Ordered server checkpoints settle token
  ownership and game-credit changes asynchronously. A recent action can be
  pending before its final receipt appears.
- Game credits are non-redeemable game units. They are not real dollars, native
  NEAR, investment returns or money that players can cash out.

Possible narration: "The chain is there when you want to verify ownership. It
does not interrupt the ordinary game loop."

## AI merchants — accurate wording

The core economy uses deterministic rules. Groq adds merchant dialogue and
bounded business proposals using the owner's working `openai/gpt-oss-20b` setup.
The server validates proposals; AI cannot invent balances, bypass ownership or
override pricing safeguards. Live provider operation is owner-reported; automated
provider tests use mocks.

Say: "Autonomous merchants with explainable economic rules, supported by AI
dialogue and bounded proposals."

Do not say every merchant is an independent AI with a funded native NEAR account,
or that an LLM controls the money.

## A suggested 90-second footage sequence

1. **0–12 seconds:** show the island. Introduce the problem: most game markets
   have endless buyers; here the town has to keep itself in business.
2. **12–35 seconds:** gather timber, craft furniture, sell it or complete a job.
   Show inventory, a completed production job and the wage/sale receipt.
3. **35–60 seconds:** open the exchange; point out a price reason and merchant
   cash. Show a shortened recording of the real week preview and a shop closing.
   Show investment/reopening only if it actually happens in the captured run.
4. **60–78 seconds:** show Jobs, the Playbook and business progression. Explain
   that the town's shortages create the player's next opportunity.
5. **78–90 seconds:** open optional on-chain verification and a real testnet
   receipt. End with Aftermarket, NEAR Track 9, and `aftmarket.xyz`.

Keep each claim on screen while it is spoken. A 90-second narration does not
mean a fresh player completes every progression milestone in 90 seconds.

## Claims to avoid

- No mainnet or real-money earnings claim. This is testnet.
- No shared multiplayer island: each player has a separate persistent island.
- No Google or X login claim; Google is currently disabled.
- No NEAR Auth/MPC, NEAR Intents, self-custody or native merchant-account claim.
- No guaranteed instant guest entry, 60 FPS on every device or inbox placement.
- No claim that the game has already won, been submitted or been endorsed by judges.
- Do not call a previous recorded player's business the new guest's business.

## Copy this prompt into GPT with this file

> Write a 90-second voice-over script for Rackz to narrate a screen-recorded demo
> of Aftermarket for NEAR Hackathon Track 9. Use this feature brief as the factual
> source. Sound confident, natural and conversational, with light Nigerian Pidgin
> where it fits Rackz's delivery; avoid forced slang or exaggerated promises.
> Lead with the economic consequence of the player's actions, then show the
> gather/craft/trade loop, merchant jobs, changing prices and a business closing.
> Explain invisible NEAR ownership briefly near the end. Give two columns:
> spoken narration and matching footage. Separate optional shots that require
> a successful live interaction. Keep within roughly 180–210 spoken words.
> Preserve the wallet and testnet boundaries. Do not add unimplemented features.

## Evidence for the script writer

- Hosted gather/craft/week and real item mint: `docs/DEMO_CHECK_EVIDENCE.json`.
- Hosted sale and burn receipt: `docs/DEMO_SALE_CHECK_EVIDENCE.json`.
- Real merchant-funded $55 delivery: `docs/LIVE_JOB_EVIDENCE.json`.
- Hosted email callback and guest entry: `docs/EMAIL_VERIFICATION.json`.
- Actual exchange, Jobs and Playbook images: `docs/SCREENSHOT_EVIDENCE.json`.
- Ownership boundaries and current limitations: `README.md` and
  `HACKATHON_REQUIREMENTS.md`.
