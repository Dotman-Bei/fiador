# Idea Forge Brief — Good Standing: a credit union seat for Sputnik DAOs

> The working title "Good Standing" is provisional and the builder may rename it. One live entry in the
> same track is called "Standing Order"; "Surety" is a clean alternative with no neighbour in the field.
> This brief is the single source of truth handed to the architect (Step 1). It fixes what gets built
> and why, not how.

## Event + constraints

- **Date written:** 2026-11-13
- **Hackathon:** NEAR HACKATHON, https://nearhackathon.com/. Rules: https://nearhackathon.com/HACKATHON.md
  and the home-page FAQ, both quoted in `docs/resources/2026-11-13-near-hackathon/event.md`.
  Prize pool $250,000: one grand prize of $55,000, plus 1st $10,000 / 2nd $3,000 / 3rd $2,000 in each
  of 13 tracks.
- **Hard deadline** (a calendar fact; idea-forge does not gate on it, and the guide makes the
  calendar-fit call): **2026-11-14 23:59 UTC = 2026-11-15 00:59 WAT**. The repo must be public by then
  and stay public through judging.
- **Team:** the builder plus an autonomous agent pool (architect → executor pool → reviewer).
- **Builder skills:** Solidity/DeFi, TypeScript/React, Python/ML.
- **Risk appetite:** safe-feasible.
- **Network:** NEAR **testnet only**. Testnet-only projects are eligible in every track (rule Q-010).
- **Frontend:** the product has a web UI. `docs/design/frontend-contract.md` applies: visual design is
  out of scope for this brief and for the plans.

## Problem

A community that keeps its money in a Sputnik DAO can only give it away. Every payment out is a one-way
payout, so a member who needs a short float (a venue deposit to front, a gap before a payout lands) can
either ask the whole council to vote a grant or go without. Communities solved this long ago with credit
unions and co-operative societies: small loans to known members, sized by whether they repaid the last
one and backed by a fellow member's word. Sputnik DAO and Trezu have none of the pieces that needs: no
amount tiers, no automatic approval for trusted members, no limits, and no record of who kept their word.

## Solution (one line)

Good Standing gives a Sputnik DAO a credit desk: a contract holding one narrow seat in the DAO's own
policy lends treasury NEAR to members as native Sputnik proposals, instantly within a limit earned by
on-time repayment, above that limit when another member co-signs with their own standing, and by a
normal council vote for anything larger, and every repayment returns to the same treasury.

Terms used in this brief:

| Term | Meaning |
|---|---|
| **Desk** | The one custom contract. It never holds loan funds. |
| **Seat** | A role in the DAO's Sputnik policy whose only member is the desk's account. The role may add and approve `transfer` proposals and nothing else. |
| **Standing** | A member's credit limit in NEAR, kept by the desk. It rises with each on-time repayment and drops to zero on default. |
| **Co-signer** | A member who pledges part of their own unused standing to raise another member's limit for one loan. |
| **Lane** | One of three approval routes for a loan request (table below). |
| **Book cap** | The most NEAR that may be out on loan at once. The council sets it by proposal. |

## Must-have demo features

1. **The credit desk contract with three lanes.** This is the only custom on-chain surface and the
   project's security-sensitive core.

   | Lane | When it applies | What happens on-chain |
   |---|---|---|
   | Standing | The amount fits the borrower's unused standing and the book cap has room | The desk files a `Transfer` proposal on the DAO and approves it in the same transaction chain. The DAO pays the borrower directly. No council vote. |
   | Co-signed | The amount is above the borrower's unused standing, and co-signers have pledged enough of theirs to cover the gap | Same as above. The pledged standing stays locked until the loan is repaid. |
   | Council | Anything larger | The desk files the `Transfer` proposal and does not vote. The council votes it like any other proposal. Once approved, the desk tracks it as a loan. |

   - **Repayment:** the borrower sends NEAR to the desk, which forwards it to the DAO account in the same
     transaction chain. An on-time repayment raises the borrower's standing by a step the DAO has set
     and releases the co-signers' pledges.
   - **Default:** once the term and a grace period have passed, anyone can mark the loan defaulted. The
     borrower's standing goes to zero and each co-signer loses the standing they pledged.
   - **Parameters** (starter standing, maximum standing, book cap, loan term, growth step) can be changed
     only by the DAO itself, through a proposal. The desk has no other admin.
   - These are the behaviours the demo must show. The architect fixes the formulas and the data model.

2. **Governed by the multisig it sits on.** The council seats the desk, admits members, sets the caps
   and unseats the desk through ordinary Sputnik proposals. After the council unseats it, the next loan
   request fails inside Sputnik itself with a permission error. The scripted story shows this, because
   it proves the multisig stays in charge.

3. **A public board and flows anyone can reproduce with no wallet and no secrets.**
   - A read-only board at `/app` over a seeded testnet DAO. It shows the treasury balance, the loan
     book (open, repaid, defaulted), and each member's standing with the loans behind every point. Each
     row carries its Sputnik proposal id, so every point of reputation is traceable to a named account
     and a repaid loan.
   - A `verify` command that reads the DAO and the desk through public RPC and checks every loan record
     against its Sputnik proposal (kind, receiver, amount, status).
   - A scripted flow that needs no secrets: it makes a throwaway testnet account from the public faucet,
     joins the demo DAO's small capped visitor line, borrows, is refused above its limit, repays, and
     sees its standing rise.
   - Members borrow, co-sign and repay through a testnet wallet in `/app`. This is in scope but is not
     on the demo's critical path: the video and the screeners rely on the board and the scripts.

**If the calendar is tight, cut in this order:** (1) wallet-connected member actions in `/app`, leaving
the board read-only and all writes scripted; (2) the faucet-based visitor flow, leaving `verify` and the
contract's unit tests as the reproducible checks. Never cut the desk contract with its three lanes and
default handling, the seeded testnet DAO, the board, `verify`, or the builder's own story script.

## Target sponsor track(s)

- **Social Money (`social`), PRIMARY.** Track text: "Build shared budgets, programmable rewards,
  collective ownership and reputation-based access on top of Sputnik DAO and Trezu. Don't rebuild the
  multisig — build what communities do with it." Good Standing is reputation-based access to a shared
  budget. It uses the existing DAO for custody and for approvals, and it adds all four things the pack
  found missing from both Sputnik and Trezu: amount-based tiers, automatic approval for trusted
  members, limits, and reputation from completed obligations.
- **AI Security & Defense (`security`), optional secondary.** The track's Build line opens with
  "spending limits, policy engines, sandboxed wallets, reputation", and the desk is exactly a policy
  engine that enforces limits and reputation on a signer seat. The same line then frames the track
  around AI agents, which this project does not target. Tick it only if the submission can say that
  plainly. Do not bend scope toward it.
- **Real-World Money (`realworld`): not claimed.** Its Build line is payroll, invoicing, remittances,
  merchant payments and stablecoin rails for real businesses. A NEAR-denominated member credit desk is
  not that.
- **Agent Economy (`agents`): not targeted.**
- Whether one project can win in more than one track is not stated anywhere (pack gap; organizers
  only). The plan is Social Money first.

## Judging criteria (published)

**No criteria weights are published** (checked 2026-11-13; `event.md` §5). What is published, verbatim:

- Home-page FAQ, "How will projects be judged?": "Claude Code & Codex screen every project first: they
  check that it runs and does what the README says. The human judges above make the decisions. Previous
  NEAR hackathons evaluated technical implementation, design, impact, originality and sustainability —
  a good guide to prepare by."
- Rule Q-017: "Screening, not deciding: reproducibility check, feature verification, structured report,
  preliminary score. Humans decide; low AI score alone cannot reject."
- HACKATHON.md §1: write the README "for a machine reader as well as a human one: what the product is,
  the problem it solves, and how to try it as "do X - see Y" steps a judge can follow. No marketing."
- Track hint for Social Money: "Don't rebuild the multisig — build what communities do with it."

Human judges: Illia Polosukhin (NEAR Protocol), Eddy Lazzarin (a16z crypto), Mert Mumtaz (Helius),
Avichal Garg (Electric Capital), Kain Warwick (Synthetix & Infinex), Haseeb Qureshi (Dragonfly),
Stepan Gershuni (cyber•Fund).

## Why it wins

**The white space.** The live field was read on 2026-11-13: 97 Social Money entries, 91 with a readable
demo post (see "Prior-art evidence" below). Five of them answer the same question, how a DAO pays small
amounts without a vote: Petty Cash, Hat Tip, Patch Fund, Rescue Room and Standing Order. Patch Fund is
the track's example prompt almost word for word. Seven more are savings circles and group pots. None of
the 91 readable posts describes lending from a DAO treasury. Good Standing takes the tiers the track
asks for and applies them to credit, the one place where trust has to exist before the money moves, and
where the money comes back.

**The head-to-head**, on the criteria previous editions used (technical implementation, design, impact,
originality, sustainability):

- **Against Patch Fund, which is the example prompt shipped:** Good Standing wins on originality,
  because it is credit rather than a bounty board and no other entry does it. It also wins one specific
  point of technical implementation: standing is computed by the contract from repayments that arrive
  on-chain, so no person has to judge whether work was finished.
- **Against Petty Cash and Hat Tip, the strongest "pay without a vote" entries:** it ties on custody,
  since their posts also describe payments leaving the DAO through the DAO's own proposals. It wins on
  sustainability, and the win is visible on screen. A payout tool ends its demo with a smaller
  treasury. This one ends with the balance restored and the same NEAR ready to lend again.
- **Impact and design:** no claimed edge. Budget rules help every DAO today, and member credit is a
  new use of a treasury. Design is decided in the Design pass.

No criterion shows a clear loss. These claims rest on the competitors' public one-line demo posts;
their repos were not opened. Do not claim the contract-seat pattern itself as new: Hat Tip's post
describes "a keyless NEAR contract" that files proposals in the Sputnik DAO.

## Demo money shot (~15 seconds)

On the public board, Ada asks the treasury for 6 NEAR. Her standing covers 4, so the desk refuses.
Bayo co-signs 2 from his own standing. The desk files a Sputnik transfer proposal and approves it in
the same transaction, and 6 NEAR leaves the DAO treasury for Ada with no council vote. She repays, the
treasury balance is back where it started, and both standings tick up.

The longer demo adds two beats. A borrower lets a loan run past its term: their standing drops to zero
and so does the slice their co-signer pledged. Then the council unseats the desk with one vote and the
next request is refused by Sputnik itself.

## Out of scope (explicit)

- **No mainnet.** Build and demo on testnet. No real NEAR is needed.
- **No dependence on hosted Trezu.** Its hosted app is mainnet-only. The product has its own UI over a
  testnet Sputnik DAO. No Trezu custom-template manifest ships unless it has been verified end to end.
- **Nothing mainnet-only or undocumented on testnet on the demo's critical path:** no Agent Market, no
  near.social writes, no nearaccounts TLA names, no NEAR Intents.
- **No new multisig and no custody in the desk.** Loans are paid from the DAO account by Sputnik's own
  `Transfer` proposals. Repayments are forwarded to the DAO account.
- **No bounty board, no payouts for work, no spending budgets or allowances.** Other entries occupy
  those, and they are not this product.
- **No interest-rate model, collateral tokens, liquidations or NEP-141 loans.** Loans are in NEAR and
  interest-free. A flat fee paid to the treasury is a stretch, not a must-have.
- **No off-chain credit scoring, ML, AI agents, KYC or identity proofs.** Membership is the council's
  native vote. Standing comes only from on-chain repayments.
- **No indexer and no backend service.** The UI and the scripts read public RPC views.
- **No token, no NFT badges, no reputation that travels between DAOs.**
- **No installer wizard for arbitrary existing DAOs.** Seating and unseating are shown on the demo DAO
  through scripted native proposals.
- **No fork of the Sputnik contracts.** Use the deployed testnet factory.
- **No visual design in the brief or the plans.** Follow `docs/design/frontend-contract.md`.
- **No secrets in the repo.** Env-var names only.

## Feasibility notes for the architect (primitives, not design)

Two sources are kept apart below. **[PACK]** facts are transcribed from
`docs/resources/2026-11-13-near-hackathon/sponsors/sputnik-dao.md` and `sponsors/trezu.md`. **[LIVE]**
facts are idea-forge's own read-only checks on 2026-11-13 (public RPC view calls, no transactions, plus
the Sputnik source at `near-daos/sputnik-dao-contract` `main`, commit `5434a59`, dated 2026-05-27).
[LIVE] facts are not in the pack.

### 1. Network and factory [PACK]

| Network | Factory account | Status | Notes |
|---|---|---|---|
| **testnet (use this)** | **`sputnikv2.testnet`** | contract deployed, code_hash `77dkUJRCHKRxJxo6UtYgBtRP6hsEX2v4vXjmFuY7dktb`, `get_default_version` `[3,31]` | DAO accounts are `<name>.sputnikv2.testnet` |
| testnet (legacy, avoid) | `sputnik-v2.testnet` | code_hash `D7dxhAZvwPQ9aUfpXANGXQdWGy9pkQ4UKM4v2YGe7yVE` | its DAOs report `2.0.0` |
| mainnet (not used) | `sputnik-dao.near` | code_hash `BXd5idTXSnC7WRfxHmi7z4crw2F5WXQJ6MZUEv8DfnnY`, `get_default_version` `[3,2]` | Trezu treasuries live here |

- A Trezu treasury is a Sputnik DAO. Trezu's production backend is mainnet-only, and Trezu's local
  testnet mock was shown only with the legacy factory, so it is untested with `sputnikv2.testnet` DAOs.
- No hosted testnet Sputnik UI was verified. There is no indexer for testnet DAOs: "Views are paginated
  contract calls; Trezu runs its own Sputnik indexer for caching."

### 2. Creating the DAO [PACK]

```rust
// sputnikdao-factory2/src/lib.rs
pub fn create(&mut self, name: AccountId, args: Base64VecU8)      // args = base64 JSON of the DAO's new(config, policy)
// sputnikdao2
pub fn new(config: Config, policy: VersionedPolicy) -> Self
// VersionedPolicy::Default(Vec<AccountId>)  "Default policy with given accounts as council"
// VersionedPolicy::Current(Policy)          a full policy object
// Config { name: String, purpose: String, metadata: Base64VecU8 }
```

README example, verbatim (its `$CONTRACT_ID` is a self-deployed factory; call `sputnikv2.testnet` instead):

```bash
export COUNCIL='["council-member.testnet", "YOUR_ACCOUNT.testnet"]'
export ARGS=`echo '{"config": {"name": "genesis", "purpose": "Genesis DAO", "metadata":""}, "policy": '$COUNCIL'}' | base64`
near call $CONTRACT_ID create "{\"name\": \"genesis\", \"args\": \"$ARGS\"}" --accountId $CONTRACT_ID --amount 10 --gas 150000000000000
```

- The README attaches 10 NEAR to `create`. Its sample output shows "with attached 5 NEAR".
- The default policy from `Default([...council])` has `"proposal_bond": "1000000000000000000000000"`
  (1 NEAR), `"proposal_period": "604800000000000"` (7 days), a role `all` of kind `Everyone` with
  `["*:AddProposal"]`, and a role `council` with
  `["*:Finalize","*:AddProposal","*:VoteApprove","*:VoteReject","*:VoteRemove"]`.
- Trezu-style policies use `proposal_bond` `0`. Trezu expresses a fixed vote count as threshold `"1"`
  on a per-kind `vote_policy` with `weight_kind` RoleWeight and quorum 0.
- [LIVE] Custom policies at creation work on the testnet factory:
  `harvestpool-community-garden.sputnikv2.testnet` runs a custom role set with `proposal_bond`
  `100000000000000000000000`.
- [LIVE] Storage locks most of the creation deposit. `bail-arbiter.sputnikv2.testnet`, created this
  week, holds 5.999 NEAR with `storage_usage` 540,765 bytes, and its `get_available_amount` returns
  `592349999999999999999999` (0.59 NEAR). Send the loan float to the DAO on top of the creation deposit.

### 3. Proposal entry points and types [PACK]

```rust
pub fn add_proposal(&mut self, proposal: ProposalInput) -> u64          // payable
pub fn act_proposal(&mut self, id: u64, action: Action, proposal: ProposalKind, memo: Option<String>)
pub fn on_proposal_callback(&mut self, proposal_id: u64) -> PromiseOrValue<()>   // private callback

pub struct ProposalInput { pub description: String, pub kind: ProposalKind }
pub struct ActionCall { method_name: String, args: Base64VecU8, deposit: NearToken, gas: Gas }

// The ProposalKind variants this build touches:
Transfer { /// Can be "" for $NEAR or a valid account id.
           token_id: OldAccountId, receiver_id: AccountId, amount: U128, msg: Option<String> },
FunctionCall { receiver_id: AccountId, actions: Vec<ActionCall> },
AddMemberToRole { member_id: AccountId, role: String },
RemoveMemberFromRole { member_id: AccountId, role: String },
ChangePolicyAddOrUpdateRole { role: RolePermission },
ChangePolicyRemoveRole { role: String },
```

- `Action` enum: `AddProposal` (internal), `RemoveProposal`, `VoteApprove`, `VoteReject`, `VoteRemove`,
  `Finalize`, `MoveToHub`.
- Policy labels used in permissions and per-kind vote policies: `Transfer` → `transfer`, `FunctionCall`
  → `call`, `AddMemberToRole` → `add_member_to_role`, `RemoveMemberFromRole` →
  `remove_member_from_role`, `ChangePolicyAddOrUpdateRole` → `policy_add_or_update_role`,
  `ChangePolicyRemoveRole` → `policy_remove_role`.
- Views: `version() -> String`, `get_config()`, `get_policy() -> Policy`, `get_available_amount()`,
  `get_last_proposal_id() -> u64`, `get_proposals(from_index: u64, limit: u64) -> Vec<ProposalOutput>`,
  `get_proposal(id: u64) -> ProposalOutput`.
- Transfer example, verbatim from `scripts/deploy_factory_testnet.sh`:

  ```bash
  near call $DAO_ACCOUNT_ID add_proposal '{"proposal": { "description": "Sample payment", "kind": { "Transfer": { "token_id": "", "receiver_id": "'$NEAR_ACCT'", "amount": "1337000000000000000000000" } } } }' --accountId $NEAR_ACCT --amount 1
  near call $DAO_ACCOUNT_ID act_proposal '{"id": 0, "action" :"VoteApprove"}' --accountId $NEAR_ACCT  --gas $MAX_GAS
  ```

### 4. Roles and vote policy [PACK]

```rust
pub enum RoleKind { Everyone, Member(U128), Group(HashSet<AccountId>) }
pub struct RolePermission {
    pub name: String,
    pub kind: RoleKind,
    pub permissions: HashSet<String>,              // "<proposal_kind>:<action>"
    pub vote_policy: HashMap<String, VotePolicy>,  // keyed by proposal-kind label
}
pub enum WeightKind { TokenWeight, RoleWeight }
pub enum WeightOrRatio { Weight(U128), Ratio(u64, std::num::NonZeroU64) }
pub struct VotePolicy { pub weight_kind: WeightKind, pub quorum: U128, pub threshold: WeightOrRatio }
pub struct Policy {
    pub roles: Vec<RolePermission>,
    pub default_vote_policy: VotePolicy,
    pub proposal_bond: NearToken,
    pub proposal_period: U64,
    pub bounty_bond: NearToken,
    pub bounty_forgiveness_period: U64,
}
```

- "You can set a different vote policy for each one of the proposal kinds." Vote policy is chosen by
  proposal kind only, never by amount. That is why amount tiers need a contract.
- The pack names the integration surface: "a separate contract that holds a DAO-granted role or a
  DAO-funded allowance, plus FunctionCall proposals that the DAO approves." It leaves the design to the
  architect. This brief uses the DAO-granted role, so custody never leaves the DAO.

### 5. Gotchas from the code [PACK]

1. **The bond must match exactly.** `add_proposal` does
   `assert_eq!(env::attached_deposit(), policy.proposal_bond, "ERR_MIN_BOND")`. The README says
   "minimum 1 Ⓝ" but the code requires equality. Read `get_policy().proposal_bond` first.
2. **`act_proposal` needs the proposal kind echoed back** in current source:
   `assert!(proposal.kind == input_proposal_kind, "ERR_WRONG_KIND")`. The README's example omits it.
3. Permission failure is `ERR_PERMISSION_DENIED`. Voting needs status `InProgress`
   (`ERR_PROPOSAL_NOT_READY_FOR_VOTE`). A double vote fails with `ERR_ALREADY_VOTED`.
4. `Transfer` with `token_id: ""` and a `msg` fails `ERR_BASE_TOKEN_NO_MSG`. `ChangePolicy` must pass
   `VersionedPolicy::Current` (`ERR_INVALID_POLICY`).
5. Amounts are yocto strings (U128). Gas and deposit inside `ActionCall` are strings in JSON.
6. Default `proposal_period` is 7 days. An expired proposal must be `Finalize`d.
7. "By default, the factory has permission to upgrade the DAO, but this can be modified by using
   `FactoryInfoUpdate`."

### 6. What the live testnet contract actually does [LIVE]

- **The deployed testnet build is older than `main`.** DAOs created this week on `sputnikv2.testnet`
  report `version` → `"2.3.1"`. Their `get_proposal` output looks like this, with `vote_counts` as
  numbers and no `last_actions_log` field, both unlike `main`:

  ```json
  {"id":0,"proposer":"raymond-bail.testnet","description":"…","kind":{"FunctionCall":{"receiver_id":"v1.dontbail.testnet","actions":[{"method_name":"void_event","args":"eyJldmVudF9pZCI6Nn0=","deposit":"1","gas":"30000000000000"}]}},"status":"Approved","vote_counts":{"council":[2,0,0]},"votes":{"dolapo-bail.testnet":"Approve","raymond-bail.testnet":"Approve"},"submission_time":"1794520858324890345"}
  ```

  Take JSON shapes from a live DAO, not from `main`. Parse cross-contract results tolerantly.
- **Bond equality is confirmed on the deployed build.** `add_proposal` probed as a view call panicked
  with `ERR_MIN_BOND` (`left: 0`, `right: 1000000000000000000000000`).
- **`act_proposal` on the deployed build appears not to require `proposal`.** Probed as a view call
  (no transaction), it reached the permission check with `proposal` omitted, with it present, and with
  an unknown extra argument. `main` requires `proposal` and carries `#[deny_unknown_arguments]`. The
  factory can upgrade DAOs, so write the one call that is valid on both: send exactly `id`, `action`,
  `proposal` (the kind as filed) and optionally `memo`. The first testnet integration test settles it.
- **A contract account can hold a seat.** Permission checks in `add_proposal` and `act_proposal` use
  `env::predecessor_account_id()`, so a contract can propose and vote.
- **One seat-holder can approve alone.** `Policy::proposal_status` evaluates only the roles of the
  account that just voted. For a `Group` role under `RoleWeight` the total weight is the group size, and
  `WeightOrRatio::Weight(w)` resolves to `min(w, total_weight)`. A `Group` role with one member
  therefore approves on that member's single vote. Roles of kind `Everyone` are skipped.
- **Execution is detached.** On approval `act_proposal` calls
  `internal_execute_proposal(...).detach()`, so the caller's callback confirms only that the vote was
  recorded. Confirm the payout through `get_proposal(id).status`: `Approved` stays `Approved` on
  success and becomes `Failed` if the transfer fails. `ProposalStatus` values: `InProgress`,
  `Approved`, `Rejected`, `Removed`, `Expired`, `Moved`, `Failed`.
- **`add_proposal` returns the new id** (`u64`, the previous `last_proposal_id`). The desk must only
  ever vote on an id returned to it by its own `add_proposal` call. Its single vote approves, so voting
  on any other id would hand out treasury funds.
- **Bond 0 with an `Everyone` role that can add proposals means free proposal spam.** Scope
  `AddProposal` on the demo DAO deliberately.
- **Other teams are creating DAOs on this factory right now** (`get_number_daos` 5,636 at read time),
  so the factory is live and exercised.
- Sputnik `main` builds with `near-sdk = { version = "5.24", features = ["global-contracts"] }`, a
  pointer for choosing the desk's SDK version.

### 7. Funds, RPC and accounts

- [PACK] Free testnet NEAR: the built-in faucet at https://docs.near.org/getting-started/faucet and
  https://near-faucet.io. Rule Q-008: "Testnet NEAR is free (near-cli faucet, near-faucet.io)."
- [PACK] Rule Q-009: public RPC is free, https://docs.near.org/api/rpc/providers. Trezu's dev mock
  defaults to `https://rpc.testnet.fastnear.com`. [LIVE] That endpoint answered every view call made
  for this brief.
- [PACK] Reputation is tied to named accounts. Ordinary `*.testnet` named accounts and sub-accounts are
  core protocol; no partner is needed.
- Estimate, not from the pack: about 30 testnet NEAR in total. That covers the DAO creation deposit
  (6 to 10), the desk account and its contract storage (a few), the treasury float for loans (10 to
  15), and about 1 each for roughly eight persona accounts.
- [PACK] The prompt repo's setup step offers NEAR agent skills for coding agents:
  `npx skills add near/agent-skills` (`near-api-js`, `near-kit`, `near-smart-contracts`, `near-dapp`).

### 8. What the AI screeners must be able to do

Claude Code and Codex follow the README's "do X - see Y" steps and check that the project runs and does
what the README says. Every step must work with no secrets and no human wallet:

- **Always available:** the hosted board (a static front end with no server, so any free static host
  works; a hosted demo should stay up to 2026-11-18, ideally 2026-11-25), the same board run locally,
  and `verify`, which is read-only against public RPC.
- **Live write path:** the faucet-based visitor flow. Its only external dependency is the public
  testnet faucet. If the faucet is down, the README must say so and point at `verify`.
- **Offline proof:** the contract's unit tests.
- The README must not claim anything the screeners cannot check. Keys live in environment variables
  only, and the README names the variables.

### 9. Build machine, probed 2026-11-13 [LIVE]

| Tool | State |
|---|---|
| rustc / cargo | 1.99.0 installed |
| rustup targets | `wasm32v1-none`, `x86_64-pc-windows-gnu` installed. **`wasm32-unknown-unknown` is not installed.** |
| cargo-near, near CLI, wasm-opt | not installed |
| WSL distro, Docker | none |
| Node / npm | v22.23.4 / 10.9.9 |

- The path contains a space ("VIBE CODE"), which breaks unquoted shell-outs (runsheet blocker B3).
- Unverified, so check before planning around it: which Rust toolchain the chosen near-sdk version
  needs to emit wasm the NEAR runtime accepts (pin it with `rust-toolchain.toml`), and whether the
  near-workspaces sandbox runs on Windows without WSL. If it does not, run integration tests against
  live testnet or on Linux CI, and commit the built wasm so nobody needs Rust to reproduce the demo.

### 10. Longest pole and the day-1 dependency

- **Longest pole, highest effort and most review:** the desk contract. It holds a seat that can move
  treasury funds, and its core is an asynchronous chain: request → `add_proposal` → callback →
  `act_proposal` → callback, with standing and pledge accounting that must stay correct when any step
  fails. Everything else is TypeScript against fixed, already-deployed interfaces.
- **Day-1 external dependency:** testnet NEAR from the faucet, on accounts whose keys live only in
  environment variables. Funding, deploying and creating the DAO are human-gated steps.
- **Day-1 smoke test, before any feature work:** from this Windows machine, (a) build and deploy a
  trivial contract to testnet and call it; (b) create one DAO on `sputnikv2.testnet` with a custom
  policy and bond 0; (c) have that contract account file a `Transfer` proposal and approve it alone,
  then read the proposal back as `Approved`. If (a) fails locally, build the wasm on Linux CI instead.

### 11. Build surface, for the guide's calendar-fit call

One Rust contract (the desk). Three scripts (seed and story, `verify`, visitor flow). Two web surfaces
(landing page at `/`, product at `/app`). The README. Human-gated: faucet funding, testnet deploy,
static hosting, and at submission the repo's public flip and the X post.

## Rubric mapping (why this won, for the record)

**Weights.** No event weights are published, so the kit's default four axes stand, with the
safe-feasible shift of 5 points from Novelty to buildability: **Intrinsic buildability 40 · Demo WOW +
story 25 · Theme + track fit 20 · Novelty 15** (maximum 500). The criteria previous editions named map
onto them: technical implementation and "runs as the README says" → buildability; design and the
demo's story → WOW; impact, sustainability and the track text → fit; originality → Novelty.

**Field.** 30 candidates plus 8 bolder rewrites, across shared budgets, programmable rewards,
collective ownership, reputation-based access, governance mechanics, real-world money and ML. Two of
the 30 (a mutual-credit ledger, participatory budgeting) were added when the white-space check sent the
search back to the pool.

**Buildability gate.** One knockout: a DAO-owned nearaccounts TLA name (mainnet-only, no testnet
contract ids published). Nothing else needed an external approval, paid service or live market.

**White-space check against the live field.** Most of the obvious candidates were already shipped by
someone: the earned-trust bounty board (Patch Fund), budget envelopes (Petty Cash, Rescue Room),
recurring payroll (Standing Order), peer-allocation rewards (FairShare, Hat Tip), a proposal decoder
(Proposal X-Ray, QuorumGuard), rotating savings (seven entries). Those scored 1 or 2 on Novelty.

| Candidate | Buildability ×40 | WOW ×25 | Fit ×20 | Novelty ×15 | Total |
|---|:-:|:-:|:-:|:-:|:-:|
| **Good Standing: credit desk with co-signers** | 4 (160) | 4 (100) | 5 (100) | 4 (60) | **420** |
| Optimistic payouts with a council veto window | 4 (160) | 4 (100) | 5 (100) | 2 (30) | 390 |
| Pooled funds with a pro-rata exit right | 4 (160) | 4 (100) | 3 (60) | 4 (60) | 380 |
| Budget envelopes | 4 (160) | 4 (100) | 5 (100) | 1 (15) | 375 |
| Mutual-credit ledger governed by the DAO | 4 (160) | 3 (75) | 3 (60) | 5 (75) | 370 |
| Dues-based mutual-aid fund | 4 (160) | 4 (100) | 4 (80) | 2 (30) | 370 |
| Treasury succession switch | 4 (160) | 3 (75) | 3 (60) | 4 (60) | 355 |
| Earned-trust bounty board (the track's example) | 4 (160) | 3 (75) | 5 (100) | 1 (15) | 350 |
| Proposal decoder (no custom contract) | 5 (200) | 2 (50) | 3 (60) | 1 (15) | 325 |

Every candidate with a custom contract scores 4, not 5, on buildability: the contract toolchain is not
yet installed on the build machine and the sandbox may not run there. Neither is an external blocker.

**Pressure test of the top three.**
- *Good Standing:* no hidden external dependency. It needs no indexer, oracle, API key or real funds.
  Time-dependent steps (terms, defaults) run on minute-scale terms on the demo DAO. The Sputnik
  behaviours it relies on were checked against source and a live DAO (section 6). Stays at 4.
- *Optimistic payouts:* buildable, but it would be the sixth entry answering "what should a DAO pay
  without a vote". In the head-to-head it cannot claim an originality edge. Dropped.
- *Pro-rata exit right:* the promise "you can always leave with your share" holds only if every council
  power is routed through the module, policy changes included. One gap voids the claim in front of
  judges who know the mechanism. Re-scored to buildability 3 (340).

**Head-to-head.** See "Why it wins": a defensible win on originality and sustainability, and no clear
loss. Good Standing is the committed winner.

## Prior-art evidence (live pass, 2026-11-13)

Method: the public build log `GET https://nearhackathon.com/api/projects?page=N&track=social` (the same
call the home page makes; names, tracks and demo links only) returned 97 Social Money entries. Each
entry's public demo post was then read through X's public embed endpoint: 91 readable, 2 deleted, 4
with non-X links. A name scan of every entry across all tracks (923 at the time, 927 an hour later)
found one lending project, "setllend" (`defi`, a fixed-rate USDC order book), and no community credit
desk. Posts are one-liners and the field is still growing, so this is evidence, not proof.

| Entry (tracks) | What its demo post says |
|---|---|
| Patch Fund (security, social) | "pays open-source security fixes from a Sputnik DAO treasury… Small payouts go out on earned trust, mid ones need one council co-sign, big ones a DAO vote." |
| Petty Cash (realworld, social) | "gives a Sputnik DAO budgets with rules: inside them a payment leaves the DAO in seconds, outside them it's a normal council vote." |
| Hat Tip (social) | "pays by peer thanks: a keyless NEAR contract files them in the Sputnik DAO; trusted members' small ones pass at once." |
| Rescue Room (security, agents, social) | "Small everyday spends go through instantly, within a rolling allowance - Anything bigger is held and scored by an AI" |
| Standing Order (5 tracks incl. social) | "vote once, and your team gets paid every period… 400+ payouts so far" |
| FairShare (social) | "peer allocation of credit. A Sputnik DAO funds a round, members give each other points for the work they saw, and the contract settles payouts deterministically on-chain" |
| Headcount (social) | "pays the ones that look independent, and sends linked groups to a council vote." |
| Sputnik Settlement Ledger (realworld, social) | "17 mutual debts became 4 transfers in one Sputnik DAO proposal, with the ledger hash inside it." |
| Proposal X-Ray (security, social) | "open any Sputnik or Trezu DAO and see what each proposal really sends, to whom, and what it changes." |
| Kring (realworld, social) | "Freelancers don't get sick pay… Deposits stay in your own pot, two drawn peers vouch, healthy pots send gifts." |
| OwnGround (social) | "A community pools NEAR, acquires a productive asset through DAO governance, earns revenue… and distributes the earnings" |
| Njangi, Passpot, Ajo Onchain, NearThrift, Roda, Joulity, Farm Ajo | Rotating savings circles and group pots; Njangi and Passpot keep each circle's money in its own Sputnik DAO. |

Two names to avoid: "Vouch" (`security`, `agents`) and "AgentTab" are both live entries.

## Architect kickoff block

Paste this into a new, fresh session opened at the architect's seat settings. The architect does not
continue the idea-forge conversation.

```
KIT: the build-system kit checkout is at C:\Users\bamig\Documents\VIBE CODE\Hackathons\build-system
(read-only doctrine). Resolve every kit path in this prompt (architect/SKILL.md, references/...,
prompts/...) inside it. The project repo is never the kit.

SESSION SETTINGS: tier top · effort xhigh, or high for a one-task plan-bug fix
(references/model-routing.md §Seat settings). Start by stating the exact model id you are running
as. If it is below this campaign's top-tier binding (claude-opus-5-5, per
docs/tollgate/2026-11-13-tollgate.md §Routing), warn me and wait for my go before anything
else. (In an autopilot dispatch, just state it — the autopilot logs drift.)

You are the ARCHITECT for this build. Load and follow architect/SKILL.md (and its references/).
Do not write product code. Your only deliverables are: an approved spec, executor-ready plan
documents, docs/superpowers/manifest.json, the pre-filled docs/gates/submission-draft.md
(build-time facts marked TBD-post-build), and the Stack requirements section appended to the
tollgate report docs/tollgate/2026-11-13-tollgate.md (references/tollgate.md).

PROJECT: Good Standing — a credit union seat for Sputnik DAOs: members borrow treasury NEAR instantly
within a limit earned by on-time repayment, get more when another member co-signs, and anything larger
goes to a normal council vote. Every loan is a native Sputnik proposal and every repayment returns to
the treasury.

REPO: Dotman-Bei/good-standing — the project repo (canonical; sync it before reading anything).
Renamed from Dotman-Bei/near-hackathon-2026 on 2026-11-13; the local clone is still at
C:\Users\bamig\Documents\VIBE CODE\Hackathons\near-hackathon-2026.

DOCS: docs/idea-forge/2026-11-13-good-standing-brief.md, docs/resources/2026-11-13-near-hackathon/
(the resource pack; read INDEX.md first, then sponsors/sputnik-dao.md and sponsors/trezu.md),
docs/design/frontend-contract.md, docs/tollgate/2026-11-13-tollgate.md,
docs/guide/2026-11-13-near-hackathon-runsheet.md, https://nearhackathon.com/ (rules:
https://nearhackathon.com/HACKATHON.md)

CONSTRAINTS: NEAR testnet only, on the Sputnik DAO factory sputnikv2.testnet. One Rust contract
(near-sdk; pin and probe the toolchain first: the build machine is Windows with rustc 1.99.0, no
wasm32-unknown-unknown target, no cargo-near, no WSL, no Docker). TypeScript strict + ESM on
Node >= 20 (machine has v22.23.4) for scripts and a React web app. No backend service and no indexer:
the UI reads public RPC views. Follow docs/design/frontend-contract.md. Hard deadline 2026-11-14
23:59 UTC = 2026-11-15 00:59 WAT (idea-forge did NOT gate on it; the guide makes the calendar-fit
call), team = solo + AI. Target track(s): social (primary); security is an optional secondary tag
that must not shape scope. Must land the demo money shot. AI screeners (Claude Code and Codex) must
be able to run the project from the README's "do X - see Y" steps with no secrets and no human wallet:
a public read-only board over a seeded testnet DAO, a read-only verify command, and a scripted flow.
No secrets in the repo, env-var names only. Sputnik specifics the plans must respect: the proposal
bond must equal the policy's bond exactly, act_proposal echoes the proposal kind, and JSON shapes come
from the live 2.3.1 testnet contract, not from main (brief, Feasibility notes 5 and 6). Out of scope:
mainnet; any dependence on hosted Trezu; Agent Market, near.social writes, nearaccounts TLA names and
NEAR Intents on the demo path; a new multisig or any custody in our contract; a bounty board, payouts
for work, spending budgets or allowances; interest-rate models, collateral, liquidations, NEP-141
loans; off-chain scoring, ML, AI agents, KYC; a token, NFT badges, cross-DAO reputation; an installer
wizard for arbitrary DAOs; a Sputnik fork; visual design in the plans.

EXECUTION TARGET: built in Claude Code by the orchestrator — the main session dispatches a fresh
subagent per task (orchestrator/SKILL.md). Every task must be self-contained per
references/task-contract.md — paste upstream signatures into each task, declare Provides/Requires, and
give exactly one gate command per task. Hand off at the reviewed plan + manifest (the default —
omit the manifest only when the build has no deploy/key/fund tasks) and the
orchestrator builds it. (For an external multi-account pool instead, stop at the manifest for a kernel.)

GIT ON THIS MACHINE: the default git credential helper stalls. For fetch/push use:
git -c credential.helper= -c "credential.helper=!gh auth git-credential" <command>

Start with Stage 1 (Ingest): read every doc above, then confirm the target/runtime/deadline back to
me before asking your first brainstorming question.
```
