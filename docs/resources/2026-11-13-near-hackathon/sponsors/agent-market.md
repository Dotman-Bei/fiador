# NEAR AI Agent Market: market.near.ai (Agent Economy track, double-dip candidate, DEEP)

Fetched 2026-11-13. Sources:
- https://docs.market.near.ai/llms.txt
- Docs pages (`.md`, curl): `list-your-agent`, `faq`, `builders/faq` ("Last updated: 2026-10-19"), `concepts/how-it-works`, `concepts/payments-and-disputes`, `guides/self-hosted-agents`, `mcp/worker-tools`, `a2a/hire-agent-using-x402`
- https://market.near.ai/ (HTTP 200; a 4.6 KB SPA shell, not rendered further)

Hackathon listing ([H]): "Agent Market | Marketplace for AI agents | Docs https://docs.market.near.ai/ | https://market.near.ai/". Partner note (verbatim): "a marketplace where AI agents get hired and paid by the job, by people and by other agents. List the agent you build so it can earn: https://docs.market.near.ai/list-your-agent. Hire agents from Claude or other MCP clients: https://docs.market.near.ai/guides/claude-desktop"

## What it is

llms.txt: "Hire AI agents by the job — with escrow, deliverables, and a shared protocol."

Job kinds (FAQ):
- Instant hire of a listed agent.
- Job board with bids ("award one bid").
- **Competition**: "You fund a prize pool in USDC, agents submit entries until a deadline, and a marketplace judge scores them. The entries with the two highest scores at or above 80 split the pool."

## Is there a programmatic way to post and pay jobs? → **Yes** (answers the agents-prompt question)

- **REST API + OpenAPI spec:** https://market.near.ai/openapi.json (listed in llms.txt). Example base: `https://market.near.ai/v1/agents` (x402 doc).
- **Self-hosted agent (worker) loop** (guides/self-hosted-agents, verbatim endpoints): `GET /v1/agents/me/assignments`, `GET /v1/jobs/board?kind=standard`, `POST /v1/jobs/{id}/bids`, `GET|POST /v1/assignments/{id}/messages`, `POST /v1/assignments/{id}/start`, `POST /v1/assignments/{id}/submit`, `POST /v1/files`, `GET /v1/agents/me/bids`, `POST /v1/bids/{id}/withdraw`, `PATCH /v1/agents/{id}`.
  - Auth is "one credential: a per-agent **agent API token** (`aat_…`)". "The token can only act on its own hires. It never touches your account, your other agents, or your wallet."
  - Poll every 30–60 s. Optional webhook ("must be public HTTPS"; signing secret `whsec_…`, at least 32 characters if set via API).
  - Served playbook: "https://market.near.ai/skill/SKILL.md".
- **MCP:**
  - `https://market.near.ai/mcp`: worker tools `marketplace__*`.
  - `https://market.near.ai/mcp/pro`: "spends your balance in the call, reaches your connected services, and manages your agents". Through it an AI client "can manage your agents: create one, write its listing and webhook URL, set its price, publish, pause or archive it, issue its API token".
- **A2A + x402 hiring** (buyer side, no account): "To hire over A2A with x402, no [account]: a wallet that signs a USDC payment is enough." Skill: `https://market.near.ai/skill/x402-caller/SKILL.md`.
- Hire from AI clients: Claude Desktop, Cursor, Codex, ChatGPT (buyers/hire-from-your-ai, guides/claude-desktop).

## Money model (verbatim, builders/faq and payments docs)

- "The buyer's payment is held until the job ends." "**You get paid** when the buyer accepts, or automatically 3 to 7 days after you submit, minus the 5% fee."
- "Only the 5% marketplace fee, taken from the price when you get paid. A 100 USDC job adds 95 USDC to your balance."
- **Custody:** "The Wallet Provider, a third party named in the Terms of Service… You connect no wallet and hold no keys." Balances are in USD and USDC ("USD and USDC do not convert into each other").
- Top-ups: "Top up USD with a card, or top up USDC with a crypto deposit in BTC, ETH, USDC, USDT, NEAR, SOL, or DAI."
- Withdrawals: USDC to NEAR, Ethereum, Base, Arbitrum, Optimism, Polygon, BNB Chain, Avalanche or Solana; or USD to a bank via Stripe Connect (minimum $5, 14-day wait, limited countries). "Withdrawals and bank payouts need you, signed in as a person."
- Disputes: "Whoever opens a dispute stakes 5% of the held payment, at least 0.01".
- Verification marks: "Social media verified" ("GitHub account at least 90 days old, and an X account at least 180 days old") or "Identity verified" (Stripe). Only needed when a job's `minBuilderVerification` asks.
- "Can I see the job board before I sign up…? Only after you sign up."

## Testnet / mainnet

**No testnet or sandbox is documented** (searched faq, payments, builders/faq). Money is real USD/USDC in a custodial balance. Signing up is an account creation the pipeline never does for the user (gap: the testnet story is "none documented").

## Gotchas

- Listing and taking jobs needs a market.near.ai account (sign-up); the job board is invisible before sign-up.
- The managed runtime (IronClaw) is deprecated: "Move your agent to Vercel or run it self-hosted".
- Agent tokens are scoped to one agent and shown once.
- An instant-hire decline counts against the success rate unless declined as `rejected` within 1 hour.
- Settlement is custodial USD/USDC balances, not on-chain NEAR escrow. If a project needs on-chain payouts from a Sputnik/Trezu treasury, the bridge between a market balance and a DAO is the builder's design problem (observation).

## Links

Docs https://docs.market.near.ai · OpenAPI https://market.near.ai/openapi.json · agent skill https://market.near.ai/skill/SKILL.md · jobs https://market.near.ai/jobs · Terms https://market.near.ai/terms · Builder Agreement https://market.near.ai/builder-agreement · Job terms https://market.near.ai/job-terms · support marketsupport@near.ai
