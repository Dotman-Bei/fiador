# Trezu: multisig treasury UI on top of Sputnik DAO (Social Money track, DEEP)

Fetched 2026-11-13. Sources:
- Docs repo https://github.com/NEAR-DevHub/trezu-docs (last push 2026-10-27; source of the docs site https://docs.trezu.org, all 16 `.mdx` pages read)
- App repo https://github.com/NEAR-DevHub/trezu (last push **2026-11-13**, 10★, no license file; README, CLAUDE.md, `nt-fe/README.md`, `nt-fe/constants/*.ts`, `nt-fe/scripts/testnet-mock-backend.mjs`, `nt-be/examples/*.rs`, `nt-cli/src/config.rs`, `contracts/README.md`, `contracts/bulk-payment/README.md`, `sandbox/README.md`, `docs/trezu-custom-proposal-template/{README,SKILL}.md`)
- Live sites https://trezu.org and https://docs.trezu.org (HTTP 200 via curl; the app at trezu.app was not logged into)

Hackathon listing ([H]): "Trezu | Multisig treasury for Web3 teams | Docs https://github.com/NEAR-DevHub/trezu-docs | https://trezu.org/ | https://github.com/NEAR-DevHub/trezu".

## 1. What Trezu is (verbatim)

- App repo README: "A comprehensive treasury management platform for NEAR DAOs. Manage members, process payments, create vesting schedules, track balances, and handle multi-signature approvals through **Sputnik DAO integration**."
- Docs "What is a Treasury?": "a treasury is a multisig wallet, where each member controls their own wallet and is assigned a specific role. To perform any action, team members need to create proposals - limited by their role - and submit them for voting. If a proposal reaches the required voting threshold, then it gets executed automatically by the system." Also: "Your funds are held by the treasury, which is a multisig wallet smart contract on NEAR."
- **A Trezu treasury = a Sputnik DAO.** The docs FAQ: "If you previously created a `.sputnikdao.near` DAO, just sign in with the same account that created it and your treasury will be there, ready to use." The repo's `nt-fe/constants/config.ts` has `APP_ACTIVE_TREASURY = "/trezu-demo.sputnik-dao.near"`, and `nt-be/examples/create_dev_treasury.rs` has `const DAO_FACTORY: &str = "sputnik-dao.near";` ("DAO creation args matching sputnik-dao factory v3"). The custom-template SKILL calls it "trezu (a SputnikDAO treasury UI on NEAR)".
- Non-custodial: "Trezu is a non-custodial solution, which means we do not have access to your private keys or funds."
- Two treasury types:
  - **Public** treasuries.
  - **Confidential** treasuries: "deployed on a **private shard** on NEAR". Balances, proposal contents, payments and swaps are visible only to the team; members and votes stay public.
- Login: NEAR, Ethereum and Solana wallets, or **passkeys** ("Passkeys let you securely access Trezu using your device's built-in authentication"). Ledger is supported (`guides/ledger.mdx`).

## 2. Testnet or mainnet? (kickoff question 1) → **production is MAINNET-ONLY; testnet is local-dev only**

- `nt-fe/README.md`, verbatim: "**The production backend is mainnet-only.** To open a NEAR **testnet** DAO in the UI without building `nt-be`, run the dev-only mock backend, which serves proposals, policy and config straight from testnet RPC view calls and forwards every other `/api` route to the real backend". Commands:

  ```bash
  bun run testnet:mock
  NEXT_PUBLIC_NEAR_NETWORK=testnet \
  NEXT_PUBLIC_NEAR_RPC_URL=https://rpc.testnet.fastnear.com \
  NEXT_PUBLIC_BACKEND_API_BASE=http://127.0.0.1:8889 \
  bun run dev
  ```

  Then "open `http://localhost:3000/<dao>.sputnik-v2.testnet/requests`… Execution-transaction links, assets and activity stay empty for testnet DAOs (no indexer)."
- Mock endpoints, from the header of `nt-fe/scripts/testnet-mock-backend.mjs`, verbatim: `GET /api/proposals/{dao}`, `GET /api/proposal/{dao}/{id}`, `GET /api/treasury/config?treasuryId`, `GET /api/treasury/policy?treasuryId`, `GET /api/proposals/{dao}/proposers`, `GET /api/proposals/{dao}/approvers`, `POST /api/monitored-accounts` (no-op), `GET /api/proposal/{dao}/{id}/tx` (404). Defaults: `MOCK_PORT` 8889, `MOCK_NEAR_RPC_URL` `https://rpc.testnet.fastnear.com`, `MOCK_FORWARD_TARGET` `https://api.trezu.app`.
- Network constant: `nt-fe/constants/network-ids.ts` → `export const NEAR_NETWORK_ID = "near";`, with `WRAP_NEAR_TOKEN_ID = "wrap.near"`, both mainnet.
- **Local sandbox:** `sandbox/README.md` is a Docker image with a local NEAR sandbox, the treasury backend, a "Sputnik DAO Indexer: Proposal caching service", PostgreSQL, and pre-deployed `bulk-payment.near`, `sputnik-dao.near`, `wrap.near` and `intents.near`. Ports: 3030 (RPC), 8080 (backend), 5001 (indexer).
- **Practical consequence (inference):**
  - On testnet, a builder works against a Sputnik DAO on `sputnikv2.testnet` or `sputnik-v2.testnet` directly. Optionally they run Trezu's frontend locally with the mock backend to show it in the Trezu UI.
  - On mainnet, any `*.sputnik-dao.near` DAO appears in hosted trezu.app.
  - Q-010 makes testnet-only entries eligible.
  - **Gotcha:** Trezu's testnet example uses the *legacy* `sputnik-v2.testnet` factory, whose DAOs report version 2.0.0. Whether the mock UI also works with `sputnikv2.testnet` (v3) DAOs was **not verified** (gap).

## 3. Roles and approval flows (kickoff question 2)

Trezu's three roles (docs `governance/members-and-roles.mdx`, verbatim permission matrix):

| Action | Requestor | Finance | Governance |
|---|---|---|---|
| Create Payment Requests | ✅ | ❌ | ❌ |
| Create Stake Delegation Requests (Stake/Unstake/Withdraw) | ✅ | ❌ | ❌ |
| Create Asset Exchange Requests | ✅ | ❌ | ❌ |
| Vote on Treasury Transaction Requests | ❌ | ✅ | ❌ |
| Create Add/Edit/Delete Member Requests | ❌ | ❌ | ✅ |
| Create Voting Duration Update Requests | ❌ | ❌ | ✅ |
| Create Theme/Logo Update Requests | ❌ | ❌ | ✅ |
| Create Voting Thresholds Requests | ❌ | ❌ | ✅ |
| Vote on Configuration Requests | ❌ | ❌ | ✅ |
| Delete Own Pending Requests | ✅ | ❌ | ✅ |
| Delete Others' Pending Requests | ❌ | ❌ | ❌ |

"Members can have multiple roles assigned, and will have the combined permissions granted by each of their assigned roles". The repo README names them "proposer, approver, financial member".

**Voting rules** (`governance/voting-settings.mdx`, verbatim):
- "A voting threshold is the **minimum number of votes required for a proposal to be approved**."
- "Treasuries separately configure voting thresholds for Governance and Finance proposals". The **Governance threshold** covers editing members and updating voting settings. The **Finance threshold** covers payments, swaps and staked assets.
- **Voting duration** is "a single setting that applies to all proposals in the treasury". "If the required number of votes is reached within the voting duration, the proposal is approved and executed immediately… [otherwise it] expires and is automatically rejected".
- Swaps: "Swap requests remain open for **24 hours**." Fee: "We currently charge a 0.7% fee on the amount being swapped… The underlying swap protocol - NEAR Intents".

Request flows in the docs:
- Single payment, bulk payment (CSV `alice.near, 10.50`; template `assets/files/bulk-payment-template.csv`), staking, swap, governance change.
- All are "Pending" in **Requests**, voted by the relevant role.
- Receipts: "Generate PDF Receipt"; public treasuries can also share a receipt link.

**Custom proposal templates** (repo `docs/trezu-custom-proposal-template/`). This is the main builder-facing extension point:
- "trezu… lets a DAO turn a recurring on-chain action into a **reusable form**. The form is defined by a JSON **manifest**… members fill to file a FunctionCall proposal."
- To author one: "open your DAO → **Custom → New template → Code tab**, paste the manifest, and **Save**". "Authoring a template requires your DAO's `ChangePolicy` permission".
- Manifest shape (verbatim):

  ```json
  {
    "version": 1,
    "id": "usdc-payout",
    "title": "USDC Payout",
    "binding": { "receiver_id": "usdc.near", "method_name": "ft_transfer",
                 "deposit": "1", "gas": "30000000000000" },
    "fields": [
      { "name": "recipient", "label": "Recipient", "type": "account", "required": true },
      { "name": "amount", "label": "Amount (micro-USDC)", "type": "amount", "required": true },
      { "name": "note", "label": "Memo", "type": "text" }
    ],
    "args": { "receiver_id": "{{recipient}}", "amount": "{{amount}}", "memo": "Payout: {{note}}" },
    "summary": "Pay {{amount}} USDC to {{recipient}}"
  }
  ```

- Field types: `account`, `token`, `uint`/`amount` ("whole-number string in **base units**, u128-safe"), `number`, `text`, `select` (needs `options`), `bool`, `json`.
- Rules: deposit and gas are "integer strings in base units — no decimals"; `id` must be a slug and must not be `create`, `new` or `about`.
- **Implication:** a builder's own contract can be driven from inside Trezu by shipping a manifest for it.

**What Trezu does NOT document** (searched all 16 docs pages):
- No amount-based tiers, auto-approval, per-member spending limits or reputation.
- Thresholds are per *Governance vs Finance* category, as counts.
- This matches the gaps in sputnik-dao.md §6.

## 4. API / SDK

- **No public SDK.** No API reference appears in the docs site's nav (`docs.json` lists only user-guide pages).
- Production backend base URLs:
  - `nt-cli/src/config.rs`: `api_base: "https://api.trezu.app"`
  - README "Quick Links": "Production Backend: https://near-treasury-backend.onrender.com"
  - These are internal app backends; no public contract or stability guarantee was found (gap). Route shapes visible in the mock: `/api/proposals/{dao}`, `/api/treasury/policy?treasuryId=…`, etc.
- **CLI:** `nt-cli` (Rust) covers treasuries, assets, requests/proposals, payments, address book, members, activity and auth. Its README is 14 bytes, so usage is undocumented beyond the source.
- **Telegram bot** integration for treasury notifications, with local setup in the README.
- **AI skill files** in the repo under `.agents/skills/` (near-intents, sandbox, etc.), plus the custom-proposal-template skill.

## 5. Bulk-payment contract: a reference "extend the DAO via FunctionCall" pattern

From `contracts/bulk-payment/README.md` (mainnet account `bulk-payment.near` in its examples):
- Methods: `calculate_storage_cost(num_records: u64) -> NearToken`, `buy_storage(num_records: u64, beneficiary_account_id: Option<AccountId>) -> NearToken`, `view_storage_credits(account_id)`, `submit_list(list_id: ListId, token_id: String, payments: Vec<PaymentInput>, submitter_id: Option<AccountId>) -> ListId`, `approve_list(list_id)`, `reject_list(list_id)`, `view_list(list_id) -> PaymentList`, `payout_batch(list_id) -> u64`, `get_payment_transactions(list_id)`, `ft_on_transfer(...)`, `mt_on_transfer(...)`.
- Token support includes NEAR Intents (`nep141:<token_contract>`, "`ft_withdraw` via intents.near").
- Repo README: "Bulk payment processing (up to 100 payments per batch)", "Content-addressed payment lists (SHA-256)".
- DAO proposal pattern (verbatim):

  ```bash
  near call dao.sputnik-dao.near add_proposal \
    '{"proposal": {"description": "Bulk payment: <list_id>", "kind": {"FunctionCall": {"receiver_id": "bulk-payment.near", "actions": [{"method_name": "approve_list", "args": "<base64>", "deposit": "<total_amount>", "gas": "150000000000000"}]}}}}' \
    --accountId member.near
  ```

- `contracts/README.md` shows testnet deploy of the same contract: `near deploy <account-id> ./target/wasm32-unknown-unknown/release/bulk_payment_contract.wasm --networkId testnet`. **No canonical testnet bulk-payment account is published** (gap).

## 6. Gotchas

- The hosted app's mainnet-only backend means testnet demos need the local mock UI, or a self-built UI.
- **How Trezu roles map onto the Sputnik policy.** Verified 2026-11-13 by a read-only mainnet `get_policy` view on `trezu-demo.sputnik-dao.near`; that DAO's `version` → `"2.3.1"`.

  | Trezu UI role | Sputnik role name | Kind | Permissions (verbatim) | Per-kind vote_policy |
  |---|---|---|---|---|
  | Requestor | `Requestor` | Group (7 accounts) | `call:AddProposal`, `call:VoteRemove`, `transfer:AddProposal`, `transfer:VoteRemove` | `call`, `transfer`: RoleWeight, quorum 0, threshold `"1"` |
  | Finance | `Approver` | Group (7) | `call:Finalize`, `call:RemoveProposal`, `call:VoteApprove`, `call:VoteReject`, `transfer:Finalize`, `transfer:RemoveProposal`, `transfer:VoteApprove`, `transfer:VoteReject` | `call`, `transfer`: RoleWeight, quorum 0, threshold `"1"` |
  | Governance | `Admin` | Group (2) | `add_bounty:*`, `add_member_to_role:*`, `bounty_done:*`, `config:*`, `factory_info_update:*`, `policy:*`, `policy_add_or_update_role:*`, `policy_remove_role:*`, `policy_update_default_vote_policy:*`, `policy_update_parameters:*`, `remove_member_from_role:*`, `set_vote_token:*`, `upgrade_remote:*`, `upgrade_self:*` | each of those kinds: RoleWeight, quorum 0, threshold `"1"` |

  - `default_vote_policy`: RoleWeight, quorum 0, threshold `[1,2]`. `proposal_bond`: **`0`** (Trezu treasuries use a zero bond, unlike the 1 NEAR Sputnik default). `proposal_period`: `604800000000000` (7 days).
  - The "Finance threshold" is the fixed-weight threshold on `call` and `transfer` in the Approver role. The "Governance threshold" is the threshold on the Admin role's kinds.
  - Trezu payments and custom templates are Sputnik `transfer` and `call` proposals. A builder integrating with a Trezu treasury files `transfer` / `call` proposals as a `Requestor` member.
- Custom templates require `ChangePolicy` permission to author.
- Confidential treasuries run on a private shard and do not share receipt links. Their deposit and withdraw flows are separate guides (`guides/funding-confidential-treasuries.mdx`).
- The docs repo has no license; the app repo has no license file.

## 7. Links

- Docs: https://docs.trezu.org (source https://github.com/NEAR-DevHub/trezu-docs)
- App: https://trezu.app · Landing https://trezu.org · X https://x.com/TrezuApp
- Demo video (from config.ts): https://youtu.be/KIQeS2Y0AWY
- Demo treasuries (mainnet): `trezu-demo.sputnik-dao.near`, `trezu-confidential.sputnik-dao.near`
