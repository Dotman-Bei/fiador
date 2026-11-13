# Tracks: all 13 (with form ids)

Fetched 2026-11-13. Sources:
- **[H]** https://nearhackathon.com/HACKATHON.md §Tracks
- **[HP]** home page §01
- **[P]** per-track prompt files at https://github.com/nearai/near-hackathon-prompt-examples/tree/main/tracks

The "Build" lines are verbatim from [H]; [HP] carries identical text. Submission counts come from the public build log, `GET https://nearhackathon.com/api/projects?track=<id>` (`total` field), read 2026-11-13 about 10:50 UTC. They are live and still growing.

## Rules that apply to every track

- **Prize per track** ([H] §Prizes): 1st $10,000 · 2nd $3,000 · 3rd $2,000, paid in NEAR. One grand prize overall: $55,000.
- **Sponsor:** there are no per-track sponsor bounties. All prizes come from the one $250,000 pool. Tracks *name* protocols as hints, not as sponsors.
- **Minimum bar to qualify:** the same for all tracks. Q-011: "**Mandatory integrations?** None. Hints are hints. Own contract on NEAR that fits the track is enough." [H]: "The Hints column is what the organizers hope to see in each track… They are hints and wishes, not requirements, and so are the protocols named in the Build column (Q-011). Lean on the ones that fit the idea and name them in the README." The prompt file "is a starting point, not a requirement."
- **Testnet:** testnet-only entries are eligible in every track (Q-010). NEAR Intents is mainnet-only (Q-007).
- **Multi-track:** tick every track that fits; it is still one submission. Whether one project can win in several tracks is **not stated** (gap; see event.md §7).

## Summary table

| # | Form id | Track | Tagline | Hints [H] | Live entries |
|---|---|---|---|---|---|
| 01 | `defi` | Unstoppable DeFi | Markets that never close | TRADING, NEAR INTENTS, CHAIN SIGNATURES | 158 |
| 02 | `thesis` | Investment Thesis | Make the long-term case | ONCHAIN DATA, DASHBOARDS, RESEARCH | 60 |
| 03 | `privacy` | Privacy & Private AI | Private by design | PRIVATE AI, TEE, NEAR AI CLOUD | 179 |
| 04 | `business` | Autonomous Business | The company of one. Or none | AI AGENTS, NEAR INTENTS, CHAIN SIGNATURES | 164 |
| 05 | `swarms` | AI Swarms | Many agents. One economy | MULTI-AGENT SYSTEMS, NEAR INTENTS, SUB-ACCOUNTS | 102 |
| 06 | `security` | AI Security & Defense | Trust, but verify | AGENT SECURITY, FUNCTION CALL KEYS, TEE ATTESTATION | 410 |
| 07 | `agents` | Agent Economy | Give AI a wallet | AGENT COMMERCE, NEAR INTENTS, CHAIN SIGNATURES | 387 |
| 08 | `realworld` | Real-World Money | Bring the boring money onchain | STABLECOINS, NEAR INTENTS, META TRANSACTIONS | 211 |
| 09 | `games` | Games With Real Economies | The economy is the gameplay | AGENT NPCS, SOCIAL LOGIN, NEAR INTENTS, NEP-245 | 84 |
| 10 | `nfts` | NFTs That Do Something | What comes after the JPEG | DYNAMIC NFTS, NEP-171, SUB-ACCOUNTS | 87 |
| 11 | `memecoins` | Memecoins With Mechanics | The joke needs rules | MEMECOINS, TOKEN MECHANICS, NEP-141 | 74 |
| 12 | `social` | Social Money | Coordinate value together | SPUTNIK DAO, TREZU, NAMED ACCOUNTS | 95 |
| 13 | `open` | Open Innovation | Something we haven't seen | EXPERIMENTAL, CHAIN ABSTRACTION, BUILD YOUR OWN | 205 |

Total public entries at read time: 909. Entries are multi-tagged, so the column sums to more than 909.

---

## Per track: verbatim description, start-here resources, notes

### 01 · `defi` · Unstoppable DeFi
- **Build:** "Build exchanges, perps, lending, vaults and trading agents that settle across chains through NEAR Intents. Deep liquidity, no custodian, nobody to switch it off."
- **Required tech:** none mandatory. Hints: NEAR Intents (mainnet-only, Q-007), Chain Signatures, Rhea.
- **[P] start here:** 1Click API quickstart https://docs.near-intents.org/integration/distribution-channels/1click-api/quickstart · Chain Signatures https://docs.near.org/chain-abstraction/chain-signatures/getting-started · Rhea guide https://guide.rhea.finance/ · Agent API https://docs.agentsonintents.com/integration/agent-api/overview · Aurora Intents https://intents.aurora.dev/

### 02 · `thesis` · Investment Thesis
- **Build:** "Build a long-term investment thesis for NEAR and back it with data: onchain analytics, live dashboards and models anyone can re-run. Judged on the evidence, not the conviction."
- **[P] start here:** NEAR BigQuery https://docs.near.org/data-infrastructure/big-query · data infra https://docs.near.org/data-infrastructure/what-is · Intents Explorer API https://docs.near-intents.org/integration/distribution-channels/1click-api/explorer/introduction
- **[P] note:** "NEAR pays to store the BigQuery dataset, but you pay normal BigQuery costs for the queries you run."

### 03 · `privacy` · Privacy & Private AI
- **Build:** "Explore confidential computation, private finance and AI that protects sensitive data. Build intelligence without exposure."
- **[P] start here:** NEAR AI Cloud quickstart https://docs.near.ai/cloud/quickstart · verification https://docs.near.ai/cloud/verification · example repo https://github.com/near-examples/nearai-cloud-verification-example · Agent API https://docs.agentsonintents.com/integration/agent-api/overview

### 04 · `business` · Autonomous Business
- **Build:** "Build AI-native businesses with treasury, sales, procurement, cross-chain payments via NEAR Intents and revenue sharing. Humans only set the constraints."
- **[P] start here:** AI and NEAR https://docs.near.org/ai/introduction · OutLayer https://app.outlayer.ai/docs/getting-started · 1Click API https://docs.near-intents.org/integration/distribution-channels/1click-api/about-1click-api · Agent API · PingPay Agent Pay https://pingpay.gitbook.io/docs/pingpay-api/agent-pay-facilitator

### 05 · `swarms` · AI Swarms
- **Build:** "Build coordination markets, bidding, collective purchasing, intent-based settlement and emergent economies between agents."
- **[P] start here:** What are intents https://docs.near-intents.org/getting-started/what-are-intents · Tools for AI https://docs.near.org/getting-started/tools-for-ai · NEAR MCP server https://github.com/nearai/near-mcp · Top Level Accounts https://nearaccounts.com/ · Agent API

### 06 · `security` · AI Security & Defense
- **Build:** "Build spending limits, policy engines, sandboxed wallets, reputation and scam detection. Give AI money without giving it the keys to everything."
- **[P] start here:** Access keys https://docs.near.org/protocol/accounts-contracts/access-keys · OutLayer · NEAR AI Cloud verification · Agent API policies & limits https://docs.agentsonintents.com/integration/agent-api/policies-and-limits
- **[P] note:** "An account that holds only function-call keys can't transfer NEAR or add keys, and it can lock itself out if the gas allowance runs out."
- The most crowded track (410 entries).

### 07 · `agents` · Agent Economy (double-dip candidate)
- **Build:** "Build agents that earn, spend, negotiate, hire other agents and pay for APIs, compute or data — with crypto directly or through NEAR Intents."
- **[P] start here:** NEAR AI Agent Market https://market.near.ai/jobs · NEAR MCP server https://github.com/nearai/near-mcp · 1Click API · Agent API overview https://docs.agentsonintents.com/integration/agent-api/overview · PingPay Agent Pay facilitator
- **[P] note (verbatim):** "The Agent API gives each agent a policy-bound wallet… create its demo key in the [partner dashboard](https://partners.demo.agentsonintents.com/dashboard) and point the agent at the base URL https://api.demo.agentsonintents.com. The demo keys are temporary and rotate after the demo period. The PingPay Agent Pay facilitator lets agents pay HTTP 402 (x402) paywalls in USDC on Base and settles to a NEAR recipient through NEAR Intents."
- **[P] example prompt requirement:** "Look at the NEAR AI Agent Market (market.near.ai) and find out how jobs get posted and paid programmatically. If there's no public way to do it, tell me before building around it." The answer is in sponsors/agent-market.md: there is a REST + MCP API and an OpenAPI spec.
- Second most crowded track (387 entries). The full list is in prior-art-agents-submissions.md.

### 08 · `realworld` · Real-World Money
- **Build:** "Build payroll, invoicing, remittances, merchant payments and stablecoin rails for real businesses. Something a normal company could use tomorrow."
- **[P] start here:** 1Click quickstart · meta-transaction relayer https://docs.near.org/web3-apps/tutorials/meta-transactions · NEP-141 https://github.com/near/NEPs/blob/master/neps/nep-0141.md · PingPay Agent Pay
- Trezu's payments, bulk payments and vesting features overlap naturally with this track. That is an observation, not a rule.

### 09 · `games` · Games With Real Economies
- **Build:** "Build NPCs with wallets, player-owned markets and economies that evolve without a dev patch. Judged on the game loop, not the token — bonus if players never notice the chain."
- **[P] start here:** NEP-245 https://github.com/near/NEPs/blob/master/neps/nep-0245.md · near-dapp skill https://github.com/near/agent-skills/tree/main/skills/near-dapp · What are intents

### 10 · `nfts` · NFTs That Do Something
- **Build:** "Build NFTs as accounts — assets that own money, earn royalties, hold inventory, carry credentials, memberships or access rights. Ownership with behavior."
- **[P] start here:** NEP-171 https://github.com/near/NEPs/blob/master/neps/nep-0171.md · Access keys · near-smart-contracts skill · TLA contracts https://github.com/houseofstake/tla-contracts · Sharded NFT items draft https://github.com/houseofstake/tla-contracts/blob/main/docs/sharded-nft-items.md
- **[P] note (verbatim):** "In the Top Level Accounts system a rented name is a NEP-171 NFT that is also a real NEAR account the owner runs from any wallet. There's no SDK yet — you build on the contracts directly, which are live and audited on mainnet."

### 11 · `memecoins` · Memecoins With Mechanics
- **Build:** "Build memecoins where the meme does something — supply that reacts to the community, treasuries with rules, onchain rituals and challenges. Judged on the mechanic, not the chart."
- **[P] start here:** NEP-141 · meme.cooking https://meme.cooking/ · near-smart-contracts skill

### 12 · `social` · Social Money (PRIMARY)
- **Build ([H], verbatim):** "Build shared budgets, programmable rewards, collective ownership and reputation-based access on top of Sputnik DAO and Trezu. Don't rebuild the multisig — build what communities do with it."
- **[P] wording differs slightly:** "…on top of Sputnik DAO and Trezu. Leave the multisig alone and build what communities do with it." **Lean on:** "Sputnik DAO, Trezu, named accounts"
- **Required tech:** none mandatory (Q-011). The brief says "on top of Sputnik DAO and Trezu", and the example prompt asks the builder to "Use the existing DAO or Trezu treasury for custody and approvals. Don't write a new multisig."
- **[P] start here:** Sputnik DAO contract https://github.com/near-daos/sputnik-dao-contract · Trezu docs https://github.com/NEAR-DevHub/trezu-docs · Trezu repo https://github.com/NEAR-DevHub/trezu · near.social https://near.social/ · near.social agent guide https://near.social/skill.md · Top Level Accounts https://nearaccounts.com/
- **[P] note (verbatim):** "Posts, replies and follows on near.social are writes to the `social` account, and the transaction always shows as failed (CodeDoesNotExist) because the account has no contract. That's expected — the data still lands. Confirm with `GET https://api2.near.social/v1/tx/{tx_hash}`."
- **[P] example prompt (verbatim):**
  > Build [a bounty board with earned trust] for a community that already runs its treasury on Sputnik DAO or Trezu. Members post small bounties, contributors claim and finish them, and payouts flow from the treasury. People who finish bounties build a track record, and a good track record raises how much they can be paid without a full council vote.
  >
  > Requirements:
  > - Use the existing DAO or Trezu treasury for custody and approvals. Don't write a new multisig.
  > - Reputation is tied to named accounts and every point is traceable to a finished bounty.
  > - Tiers: small payouts auto-approve for trusted contributors, mid-size ones need one council member, large ones become a normal DAO proposal.
  > - A public board showing open bounties, claims, payouts and each contributor's record.
  >
  > Read the Sputnik DAO contract and the Trezu docs first, then tell me which approval flows already exist and which ones we need to add.
- 95 entries. The full list is in prior-art.md. One of the least crowded tracks after thesis, memecoins, games and nfts.

### 13 · `open` · Open Innovation
- **Build:** "Have an idea that refuses to fit a category? Explore new ways for money, intelligence and ownership to work together."
- **[P] start here:** Chain Signatures · NEAR docs · HACKATHON.md
