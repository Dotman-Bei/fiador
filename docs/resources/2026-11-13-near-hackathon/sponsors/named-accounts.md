# Named Accounts / Top Level Accounts (TLA): nearaccounts.com (Social Money hint "NAMED ACCOUNTS", DEEP)

Fetched 2026-11-13. Sources:
- https://nearaccounts.com/ (SPA; rendered in Chrome, full `innerText` read)
- https://docs.nearaccounts.com/llms.txt (curl)
- https://docs.nearaccounts.com/docs/concepts and /docs/status (SPA; Chrome `get_page_text`)
- https://github.com/houseofstake/tla-contracts README (`gh api`; last push 2026-10-15; no license)
- Track prompt notes in tracks/12-social.md and tracks/10-nfts.md

"Named accounts" in the track hint can mean two things. **(a)** Ordinary NEAR named accounts (`alice.near`, `alice.testnet`, sub-accounts): core protocol, no partner needed. **(b)** The new **Top Level Accounts** marketplace at nearaccounts.com, which the Social prompt links as "Top Level Accounts". Both are recorded here.

## (a) Ordinary named accounts (protocol)

- docs.near.org: "some wallets will readily allow you to create [named accounts](https://docs.near.org/protocol/accounts-contracts/account-id.md#named-address) (e.g. `alice.testnet`), which are easier to remember." https://docs.near.org/getting-started/create-account.md
- Sub-accounts and implicit accounts: https://docs.near.org/protocol/tutorials/creating-implicit-and-named-accounts.md ("Create implicit accounts through transfers and named accounts through parent-account contracts or CreateAccount actions.")
- Testnet: `*.testnet` accounts, funded by faucet (see sputnik-dao.md §1).
- The Social example prompt: "Reputation is tied to named accounts and every point is traceable to a finished bounty."

## (b) nearaccounts.com: Top Level Account names (House of Stake)

- **Home page (verbatim, Chrome):** "FIND YOUR NAME ON NEAR. Search available names, explore open namespaces, or browse names for sale." Stats at read time: "79 NAMES REGISTERED", "1,008 NAMESPACES", "88.51 NEAR REGISTRY REVENUE". Sections: Rent A Name, Find A Name For Sale (Marketplace), Open New Namespaces. Footer: "© 2026 NEAR Stiftung (NEAR Foundation)". Page title: "NEAR Accounts | Account Names for Humans, Businesses, and Agents".
- **Docs, "Accounts & Ownership" (verbatim excerpts):**
  - "A rented account is a real NEAR account at an address such as alice.degen, not just a domain name. It has its own balance, transaction history, and rental period."
  - "Rented accounts have no access keys, so you do not receive a private key or seed phrase. Instead, you control each account through your ownership account."
  - "Every action from a rented account needs both accounts. Your ownership account approves the action, and the rented account carries it out. Apps see the rented account as the sender. You can also give the rented account limited permission ahead of time. House of Stake pays the network fee… for supported actions."
  - **"For safety, a rented account cannot: Add or delete access keys. Delete itself. Deploy a contract. Perform native validator actions."**
  - Meteor Wallet integration and fast-auth sign-in are "(Coming Soon)".
- **Contracts repo README (verbatim):** "A rented name is a real NEAR account, created under its TLA, running a shared wallet contract and leased to its owner for a fixed term. The owner controls it from an account they already have, whether that is a wallet, a Ledger, **a multisig or a DAO**."
  - Contracts: `hos-wallet` (global wallet contract every leased name runs), `wallet-impl-deployer`, `registrar`, `tla-registry` ("The lease ledger and name collection: rental, renewal, pricing, reclaim and business TLAs"), `hos-extension`, `mpc-recovery`, `registrar-opener`, `hos-common`.
  - Standards: "Names are NEP-171 tokens with NEP-177 metadata, NEP-181 enumeration and NEP-297 events. Leased accounts implement NEP-641 for authorization, which is still a draft, so that interface may change."
- **Prompt repo note (tracks/10-nfts.md, verbatim):** "a rented name is a NEP-171 NFT that is also a real NEAR account the owner runs from any wallet. There's no SDK yet — you build on the contracts directly, which are live and audited on mainnet."

### Testnet / mainnet

From the docs "Deployment Status" page (verbatim):
- "Marketplace resale requires NEAR Intents. **Intents settlement is mainnet-only.**"
- Name rental: "Verify the deployed contract IDs before integrating."
- "Contract account IDs depend on the deployment. Read them from the active environment configuration and verify them against the deployment record before use."
- "Business TLAs: Handled case by case. The current frontend has no self-service business application."
- "Recovery… waits 72 hours before it can finish."

**No testnet deployment or contract IDs are published** (gap). Renting a name means signing in and paying on mainnet, which the pipeline never does on the user's behalf.

### Gotchas for an architect

- A rented TLA account **cannot deploy a contract**, so it can't host the project's own contract. It can hold funds, be a payee, and act as a member identity.
- Control is via the ownership account (NEP-641 draft authorization), which can be a DAO per the README. A DAO owning a name is a documented possibility; no example was found.
- There is no SDK; integrate against `tla-registry` / `hos-wallet` directly. The repo has an integration test workspace (`integration/`, near-workspaces).

## Links

- https://nearaccounts.com · docs https://docs.nearaccounts.com (index /llms.txt: Overview, Get Started, Accounts & Ownership, Marketplace & Portfolio, Opening New TLAs, Pricing/Renewals/Expiry, Recovery, Technical Overview, Deployment Status) · Telegram https://t.me/NEARAccounts
- Contracts https://github.com/houseofstake/tla-contracts · sharded NFT items draft https://github.com/houseofstake/tla-contracts/blob/main/docs/sharded-nft-items.md
- Not read (bounded): docs pages Technical Overview, Pricing, Opening New TLAs (SPA; reachable via Chrome)
