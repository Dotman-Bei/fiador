# Other ecosystem partners (SHALLOW pass)

Fetched 2026-11-13. "What it is" and the doc links are verbatim from [H] §Ecosystem (https://nearhackathon.com/HACKATHON.md); [HP] §04 shows the same list. Reachability is an HTTP status from a `curl -L` GET on each docs URL. **No docs were read beyond reachability unless noted.** These are leads, not extracted facts.

[H] guidance (verbatim): "Read the docs before integrating anything; verify endpoints, contract addresses and SDK versions there instead of assuming them."

| Partner | What it is | Docs | Website | GitHub | Docs reachable | Track fit (from track hints / [P] links) |
|---|---|---|---|---|---|---|
| NEAR Intents | Cross-chain execution | https://docs.near-intents.org/ (index `/llms.txt` 200) | https://intents.near.org/ | https://github.com/near/intents | 200 | defi, business, swarms, agents, realworld, games |
| Aurora | Ethereum on NEAR | https://doc.aurora.dev/ | https://aurora.dev/ | https://github.com/aurora-is-near | 200 | defi ([P]: Aurora Intents https://intents.aurora.dev/) |
| HOT | Chain abstraction | https://docs.hotdao.ai/ | https://hot-labs.org/ | https://github.com/hot-dao | **DNS failure ("Could not resolve host: docs.hotdao.ai")**, so a gap | open / chain abstraction |
| Rhea | DeFi on NEAR | https://guide.rhea.finance/ (SDK docs https://github.com/rhea-finance/rhea-sdk-docs 200) | https://rhea.finance/ | https://github.com/rhea-finance | 200 | defi |
| meme.cooking | Memecoin launchpad | https://docs.meme.cooking/ | https://meme.cooking/ | (none; [HP] shows "API") | 200 | memecoins |
| HEX | Cross-chain swaps | https://hot-labs.gitbook.io/hex/concepts-and-systems/interactive-blocks | https://hex.exchange/ | none | 200 | defi |
| SVRN | Sovereign technology | https://svrn.net/research/near-protocol | https://svrn.net/ | none | 200 | thesis (research) |
| OutLayer | Secure transactions for AI agents | https://app.outlayer.ai/docs/getting-started | https://outlayer.ai/ | https://github.com/out-layer/outlayer | 200 | business, security |
| GoMining | Bitcoin mining superapp | https://docs.gomining.com/ | https://gomining.com/ | none | 200 | (no track names it) |
| NEAR Builders | Builder community | https://nearbuilders.org/build | https://nearbuilders.org/ | https://github.com/nearbuilders | 200 | all ($10 NEAR AI credits, Q-000) |
| Gulf Labs | Invests in blockchain infrastructure | none | https://gulf-labs.com/ | none | site 200 | (investor; no docs) |
| BRRRAIN | Memecoin with AI rewards | https://brrrain.fun/docs/ | https://brrrain.fun/ | none ([HP] shows "API") | 200 | memecoins |
| NEAR Business | Confidential multisig treasury | https://docs.business.near.com/ | https://business.near.com/ | none | 200 | business, realworld; **adjacent to Social** (treasury/multisig) |

## Partner notes in [H] (verbatim)

- **NEAR Intents:**
  - Q-006: "1Click JWT? Not required. Without it, 0.2% fee. Register at https://partners.near-intents.org."
  - Q-007: "Testnet for Intents? None exists or is planned. Mainnet, separate dev accounts, tiny amounts, dry: true quotes."
- **Rhea:** "NEAR's DEX and lending protocol. Looking for something to build? Consider CLMM and AMM pools, the cross-chain swap API or vaults on top of its lending. SDKs and API docs: https://github.com/rhea-finance/rhea-sdk-docs. CLI: https://guide.rhea.finance/developers-1/cli-trading"
- **NEAR Business:** "a confidential multisig built on NEAR Intents. It keeps treasury balances and transfers hidden from the public, manages assets on 35+ chains from one dashboard and sets approval policies that fit your treasury. Sign up: https://business.near.com/create?ref=og. Demo: https://app.trupeer.ai/view/OEoiJVjUh/near-business-create-and-manage-a-treasury"
  - Observation: this is a second multisig-treasury product in the ecosystem, alongside Trezu, which also has confidential treasuries. It is not named in the Social track.

## Gaps

- HOT docs domain did not resolve on 2026-11-13. Try https://hot-labs.org/ or the GitHub org.
- No partner other than those in the deep files was checked for testnet addresses.
