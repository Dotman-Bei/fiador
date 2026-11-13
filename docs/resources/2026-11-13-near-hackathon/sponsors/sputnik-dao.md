# Sputnik DAO: DAO / multisig infrastructure (Social Money track, DEEP)

Fetched 2026-11-13. Primary sources:
- Repo https://github.com/near-daos/sputnik-dao-contract (branch `main`, last push 2026-05-27, MIT, 117★): README, `sputnikdao2/src/{proposals,policy,bounties,lib,views,delegation,types}.rs`, `sputnikdao2/ABI.md`, `sputnikdao-factory2/src/lib.rs`, `scripts/deploy_factory_*.sh`. Read via raw.githubusercontent + `gh api`.
- On-chain checks by read-only NEAR RPC `query` view calls to `rpc.testnet.near.org` and `rpc.mainnet.near.org`, 2026-11-13. No transactions were sent.

Hackathon listing ([H] §Ecosystem): "SputnikDAO | DAO infrastructure | Docs: https://github.com/near-daos/sputnik-dao-contract#setup | Website: https://x.com/SputnikDAO".

## What it rewards / why it matters here

The Social Money brief: "Build shared budgets, programmable rewards, collective ownership and reputation-based access **on top of Sputnik DAO and Trezu**. Don't rebuild the multisig — build what communities do with it." There is no separate sponsor bounty; Sputnik is a named hint (Q-011). Trezu treasuries *are* Sputnik DAOs (see trezu.md), so anything that drives a Sputnik DAO also works with a Trezu treasury.

---

## 1. Testnet or mainnet? (kickoff question 1) → **BOTH. Testnet works.**

Factory accounts, verified on-chain 2026-11-13:

| Network | Factory account | Status (RPC) | `get_number_daos` | `get_default_version` | Source of the name |
|---|---|---|---|---|---|
| **testnet** | **`sputnikv2.testnet`** | contract deployed (code_hash `77dkUJRCHKRxJxo6UtYgBtRP6hsEX2v4vXjmFuY7dktb`) | **5634** | `[3,31]` | `scripts/deploy_factory_testnet.sh`: `export NEAR_ACCT=sputnikv2.$FACTORY` with `FACTORY=testnet` |
| testnet (legacy) | `sputnik-v2.testnet` | contract deployed (code_hash `D7dxhAZvwPQ9aUfpXANGXQdWGy9pkQ4UKM4v2YGe7yVE`); `get_number_daos` / `get_default_version` **not present**, `get_dao_list` works | n/a | n/a | README examples (`Scheduling a call: sputnik-v2.testnet.create(...)`); Trezu's testnet mock example (`omni-e2e.sputnik-v2.testnet`, whose `version` → `"2.0.0"`) |
| **mainnet** | **`sputnik-dao.near`** | contract deployed (code_hash `BXd5idTXSnC7WRfxHmi7z4crw2F5WXQJ6MZUEv8DfnnY`) | **2148** | `[3,2]` | `scripts/deploy_factory_mainnet.sh` (`sputnik-dao.$FACTORY`, `FACTORY=near`); Trezu `create_dev_treasury.rs`: `const DAO_FACTORY: &str = "sputnik-dao.near";` |

- DAO accounts are sub-accounts of the factory: `<name>.sputnikv2.testnet`, `<name>.sputnik-v2.testnet` or `<name>.sputnik-dao.near`. The factory script has `DAO_ACCOUNT_ID=$DAO_NAME.$FACTORY_ACCOUNT_ID`.
- The newest testnet DAOs on `sputnikv2.testnet` (`get_daos {from_index:5625, limit:5}`) include `bail-arbiter`, `pe-msdemo`, `covaunt26`, `harvestpool-community-garden` and `splits-proof-6fd207`. That fits other hackathon teams creating DAOs right now (inference, not confirmed).
- Version metadata (`get_contracts_metadata`): testnet stores DAO code versions `[2,0]`, `[2,1]`, `[3,0]` … `[3,3]` and more (output truncated at read). Mainnet stores `[2,0]` through `[3,2]`. **Gotcha:** DAOs from the legacy `sputnik-v2.testnet` factory report `2.0.0`. The newer proposal kinds (`ChangePolicyAddOrUpdateRole` and the like, and `FactoryInfoUpdate`) belong to the v3 code line per ABI.md ("v3" view methods add `get_factory_info`). Prefer `sputnikv2.testnet` for new testnet DAOs. Check `version` on any DAO you reuse.
- **No hosted testnet UI was verified.** Trezu's production backend is mainnet-only (trezu.md). AstroDAO's testnet app was not checked (out of scope / unverified). The direct paths on testnet are near-cli-rs, near-api-js, or a self-built UI, or Trezu run locally against testnet with its mock backend (trezu.md §Testnet).

### Testnet account and faucet

- docs.near.org "Create an Account": "A NEAR `testnet` account allows you to deploy contracts and log in to Web3 apps without spending any real money." Create one via a wallet or the CLI (`npm install -g near-cli-rs@latest` or `cargo install near-cli-rs`). "Make sure to create a `testnet` account (ending with `.testnet`, e.g. `alice.testnet`)". https://docs.near.org/getting-started/create-account.md
- docs.near.org "Token Faucet": "There are two testnet faucets: the built‑in faucet on this page - which provides native `testnet` NEAR only - and the [Testnet Faucet](https://near-faucet.io/), which supports many fungible tokens (NEAR, USDT, and more)." Testnet USDC: "use the [Circle Faucet](https://faucet.circle.com/), which provides 20 USDC on NEAR `testnet` every 2 hours." Other test FTs: swap on https://testnet.ref.finance. https://docs.near.org/getting-started/faucet.md
- [H] Q-008: "Testnet NEAR is free (near-cli faucet, near-faucet.io)."
- **Budget gotcha:** creating a DAO attaches NEAR to `create`. The README example uses `--amount 10` and its output shows "with attached 5 NEAR". Every `add_proposal` must attach exactly the policy's `proposal_bond`, 1 NEAR by default (see §4). Plan faucet top-ups.

---

## 2. Creating a DAO (factory `create`)

From README §Setup step 6 (verbatim):

```bash
export COUNCIL='["council-member.testnet", "YOUR_ACCOUNT.testnet"]'
export ARGS=`echo '{"config": {"name": "genesis", "purpose": "Genesis DAO", "metadata":""}, "policy": '$COUNCIL'}' | base64`
near call $CONTRACT_ID create "{\"name\": \"genesis\", \"args\": \"$ARGS\"}" --accountId $CONTRACT_ID --amount 10 --gas 150000000000000
```

- In the README `$CONTRACT_ID` is a self-deployed factory. To use the shared factory, call `sputnikv2.testnet` / `sputnik-dao.near` instead. The kit's deploy scripts do exactly that: `near call $FACTORY_ACCOUNT_ID create "{\"name\": \"$DAO_NAME\", \"args\": \"$DAO_ARGS\"}" --accountId $FACTORY_ACCOUNT_ID --gas $GAS_150_TGAS --amount 10`.
- Factory signature (`sputnikdao-factory2/src/lib.rs`): `pub fn create(&mut self, name: AccountId, args: Base64VecU8)`. `args` is the base64 JSON of the DAO's `new(config, policy)`.
- DAO init: `pub fn new(config: Config, policy: VersionedPolicy) -> Self`, where `VersionedPolicy::Default(Vec<AccountId>)` ("Default policy with given accounts as council") or `Current(Policy)`.
- `Config { name: String, purpose: String, metadata: Base64VecU8 }`. Per the source comment, metadata is "Generic metadata. Can be used by specific UI to store additional data. This is not used by anything in the contract."
- Factory views: `get_dao_list() -> Vec<AccountId>`, `get_number_daos() -> u64`, `get_daos(from_index: u64, limit: u64)`, `get_owner()`, `get_default_code_hash()`, `get_default_version()`, `get_contracts_metadata()`. Owner calls: `store`, `store_contract_metadata`, `set_default_code_hash`, `update(account_id, code_hash)`.

Default policy produced by `Default([...council])` (README step 7, verbatim JSON):

```json
{
  "roles": [
    { "name": "all", "kind": "Everyone", "permissions": ["*:AddProposal"], "vote_policy": {} },
    { "name": "council", "kind": { "Group": ["council-member.testnet", "YOUR_ACCOUNT.testnet"] },
      "permissions": ["*:Finalize","*:AddProposal","*:VoteApprove","*:VoteReject","*:VoteRemove"],
      "vote_policy": {} }
  ],
  "default_vote_policy": { "weight_kind": "RoleWeight", "quorum": "0", "threshold": [1, 2] },
  "proposal_bond": "1000000000000000000000000",
  "proposal_period": "604800000000000",
  "bounty_bond": "1000000000000000000000000",
  "bounty_forgiveness_period": "86400000000000"
}
```

That is: a 1 NEAR proposal bond, a 7-day proposal period (ns), a 1 NEAR bounty bond, and a 1-day forgiveness period.

---

## 3. Proposal kinds (verbatim from `sputnikdao2/src/proposals.rs`)

```rust
pub enum ProposalKind {
    ChangeConfig { config: Config },
    ChangePolicy { policy: VersionedPolicy },
    AddMemberToRole { member_id: AccountId, role: String },
    RemoveMemberFromRole { member_id: AccountId, role: String },
    /// Calls `receiver_id` with list of method names in a single promise.
    /// Allows this contract to execute any arbitrary set of actions in other contracts.
    FunctionCall { receiver_id: AccountId, actions: Vec<ActionCall> },
    UpgradeSelf { hash: Base58CryptoHash },
    UpgradeRemote { receiver_id: AccountId, method_name: String, hash: Base58CryptoHash },
    /// Transfers given amount of `token_id` from this DAO to `receiver_id`.
    /// If `msg` is not None, calls `ft_transfer_call` with given `msg`. Fails if this base token.
    /// For `ft_transfer` and `ft_transfer_call` `memo` is the `description` of the proposal.
    Transfer { /// Can be "" for $NEAR or a valid account id.
               token_id: OldAccountId, receiver_id: AccountId, amount: U128, msg: Option<String> },
    SetStakingContract { staking_id: AccountId },
    AddBounty { bounty: Bounty },
    BountyDone { bounty_id: u64, receiver_id: AccountId },
    Vote,
    FactoryInfoUpdate { factory_info: FactoryInfo },
    ChangePolicyAddOrUpdateRole { role: RolePermission },
    ChangePolicyRemoveRole { role: String },
    ChangePolicyUpdateDefaultVotePolicy { vote_policy: VotePolicy },
    ChangePolicyUpdateParameters { parameters: PolicyParameters },
}
pub struct ActionCall { method_name: String, args: Base64VecU8, deposit: NearToken, gas: Gas }
pub struct ProposalInput { pub description: String, pub kind: ProposalKind }
```

**Policy labels.** Permissions and per-kind vote policies key on these labels, from `to_policy_label()`:

| Kind | Label |
|---|---|
| ChangeConfig | `config` |
| ChangePolicy | `policy` |
| AddMemberToRole | `add_member_to_role` |
| RemoveMemberFromRole | `remove_member_from_role` |
| FunctionCall | `call` |
| UpgradeSelf | `upgrade_self` |
| UpgradeRemote | `upgrade_remote` |
| Transfer | `transfer` |
| SetStakingContract | `set_vote_token` |
| AddBounty | `add_bounty` |
| BountyDone | `bounty_done` |
| Vote | `vote` |
| FactoryInfoUpdate | `factory_info_update` |
| ChangePolicyAddOrUpdateRole | `policy_add_or_update_role` |
| ChangePolicyRemoveRole | `policy_remove_role` |
| ChangePolicyUpdateDefaultVotePolicy | `policy_update_default_vote_policy` |
| ChangePolicyUpdateParameters | `policy_update_parameters` |

README on FunctionCall: "used to a call a function on any valid account on the network including the DAO itself, any other DAO, or any other contract. This is a useful mechanism for extending the capabilities of the DAO without modifying or complicating the DAO contract code. One can imagine a family of contracts built specifically to serve the DAO as agents, proxies, oracles and banks, for example."

## 4. Entry points (exact signatures from source)

**Proposals** (`proposals.rs`):
```rust
pub fn add_proposal(&mut self, proposal: ProposalInput) -> u64          // payable
pub fn act_proposal(&mut self, id: u64, action: Action, proposal: ProposalKind, memo: Option<String>)
pub fn on_proposal_callback(&mut self, proposal_id: u64) -> PromiseOrValue<()>   // private callback
```

`Action` enum: `AddProposal` (internal), `RemoveProposal`, `VoteApprove`, `VoteReject`, `VoteRemove`, `Finalize`, `MoveToHub`.

**Bounties** (`bounties.rs`):
```rust
pub fn bounty_claim(&mut self, id: u64, deadline: U64)                  // payable: bounty_bond
pub fn bounty_done(&mut self, id: u64, account_id: Option<AccountId>, description: String)
pub fn bounty_giveup(&mut self, id: u64) -> PromiseOrValue<()>
```

`Bounty { description: String, token: OldAccountId /* "" = NEAR */, amount: U128, times: u32, max_deadline: U64 }`

**Delegation / token voting** (`delegation.rs`): `register_delegation`, `delegate(account_id, amount) -> (U128,U128,U128)`, `undelegate(...)`. These are called by the staking contract.

**Blobs / upgrade:** `store_blob` (payable, ABI), `remove_blob(hash) -> Promise`, `get_factory_info() -> FactoryInfo`, `migrate()`.

**Views** (`views.rs`): `version() -> String`, `get_config()`, `get_policy() -> Policy`, `get_staking_contract()`, `has_blob(hash)`, `get_locked_storage_amount()`, `get_available_amount()`, `delegation_total_supply()`, `delegation_balance_of(account_id)`, `delegation_balance_ratio(account_id)`, `get_last_proposal_id() -> u64`, `get_proposals(from_index: u64, limit: u64) -> Vec<ProposalOutput>`, `get_proposal(id: u64) -> ProposalOutput`, `get_bounty(id)`, `get_last_bounty_id()`, `get_bounties(from_index, limit)`, `get_bounty_claims(account_id)`, `get_bounty_number_of_claims(id)`, `get_actions_log()`.

Example calls (README, verbatim):

```bash
near call genesis.sputnik-v2.testnet add_proposal \
'{"proposal": {"description": "Add New Council", "kind": {"AddMemberToRole": {"member_id": "council_member_3.testnet", "role": "council"}}}}' \
--accountId proposer.testnet \
--amount 1

near view genesis.sputnik-v2.testnet get_proposal '{"id": 0}'
near view genesis.sputnik-v2.testnet get_proposals '{"from_index": 1, "limit": 2}'
near call genesis.sputnik-v2.testnet act_proposal '{"id": 0, "action": "VoteApprove"}' \
--accountId council_member_1.testnet
```

Transfer proposal example (`scripts/deploy_factory_testnet.sh`, verbatim):

```bash
near call $DAO_ACCOUNT_ID add_proposal '{"proposal": { "description": "Sample payment", "kind": { "Transfer": { "token_id": "", "receiver_id": "'$NEAR_ACCT'", "amount": "1337000000000000000000000" } } } }' --accountId $NEAR_ACCT --amount 1
near call $DAO_ACCOUNT_ID act_proposal '{"id": 0, "action" :"VoteApprove"}' --accountId $NEAR_ACCT  --gas $MAX_GAS
```

### Gotchas, from reading the code

1. **The bond must match exactly.** `add_proposal` does `assert_eq!(env::attached_deposit(), policy.proposal_bond, "ERR_MIN_BOND")`. The README says "minimum 1 Ⓝ", but the code requires *equality*. Read `get_policy().proposal_bond` first.
2. **`act_proposal` needs the proposal kind echoed back.** `assert!(proposal.kind == input_proposal_kind, "ERR_WRONG_KIND")`. The README's `act_proposal` example omits the `proposal` argument, but current source requires it. This is an anti-race check: the caller passes the exact `kind` it read via `get_proposal`.
3. Permission check: `policy.can_execute_action(...)` → `ERR_PERMISSION_DENIED`. Voting needs status `InProgress` (`ERR_PROPOSAL_NOT_READY_FOR_VOTE`). Double votes fail with `ERR_ALREADY_VOTED`.
4. `Transfer` with `token_id: ""` (NEAR) and a `msg` fails `ERR_BASE_TOKEN_NO_MSG`. `SetStakingContract` can only be set once (`ERR_STAKING_CONTRACT_CANT_CHANGE`). `ChangePolicy` must pass `VersionedPolicy::Current` (`ERR_INVALID_POLICY`).
5. Amounts are yocto strings (U128). Gas and deposit inside `ActionCall` are `Gas` / `NearToken` (u64 / u128 as strings in JSON).
6. Default `proposal_period` is 7 days. An expired proposal must be `Finalize`d to return the bond (README: "Finalize… cancelled when proposal has expired (this action also returns funds)").
7. Factory auto-upgrade: "By default, the factory has permission to upgrade the DAO, but this can be modified by using `FactoryInfoUpdate`."

## 5. Roles, permissions, vote policy (`policy.rs`, verbatim types)

```rust
pub enum RoleKind {
    Everyone,                       // Matches everyone, who is not matched by other roles.
    Member(U128),                   // Member greater or equal than given balance. Can use `1` as non-zero balance.
    Group(HashSet<AccountId>),      // Set of accounts.
}
pub struct RolePermission {
    pub name: String,
    pub kind: RoleKind,
    /// Set of actions on which proposals that this role is allowed to execute.
    /// <proposal_kind>:<action>
    pub permissions: HashSet<String>,
    /// For each proposal kind, defines voting policy.
    pub vote_policy: HashMap<String, VotePolicy>,
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

README (verbatim):
- Permission strings: "A role with: `["transfer:VoteReject","transfer:VoteRemove"]` means they can only vote to _reject_ or _remove_ a `transfer` proposal but they can't vote to approve." / "`["transfer:*"]` can perform any vote action on `transfer` proposals." / "`["*:*"]` has _unlimited_ permission."
- Vote policy: "You can set a different vote policy for each one of the proposal kinds." Also: "the threshold could be a fixed number (weight), so you can say that you need 3 votes to approve a proposal disregarding the amount of people in the role".
- Token voting: "DAO votes to select some token to become voting token (only can be done once, can't change later)." Users stake into the DAO's staking contract (`sputnik-staking/`) and delegate. "Undelegating will block delegating / withdrawing until one voting period passes."

## 6. Approval flows (kickoff question 2): what exists vs. what a builder adds

**Built into Sputnik DAO**, from the code above:
- **Propose → vote → auto-execute.** Any role with `<label>:AddProposal` files a proposal with the bond. Roles with `VoteApprove` / `VoteReject` / `VoteRemove` vote. On reaching the threshold the proposal executes immediately (`proposal.status == Approved` → execute). Expired proposals are `Finalize`d.
- **Per-kind thresholds.** `vote_policy` is keyed by proposal-kind label (`transfer`, `call`, `add_bounty`, …). The threshold is a ratio (e.g. 1/2) or a fixed weight (e.g. 1 vote, 3 votes). The weight is role-count or staked-token based. Quorum is a minimum count.
- **Role scoping.** Separate roles can propose vs. vote per kind. `Member(U128)` roles are gated on token balance; `Group` roles are explicit account sets; `Everyone` matches anyone.
- **Bounty flow.** `AddBounty` proposal (voted) → anyone `bounty_claim(id, deadline)` with `bounty_bond`, up to `times` claims → `bounty_done(id, …)` auto-files a `BountyDone` proposal → voted → payout to the claimer. `bounty_giveup` within `bounty_forgiveness_period` returns the bond.
- **FunctionCall** to any contract (multi-action, single receiver). Plus **Transfer** of NEAR / NEP-141, with an optional `ft_transfer_call` `msg`.
- **Signaling polls** (`Vote`), and policy changes via the `ChangePolicy*` kinds.

**Not built in** (absent from the contract source; this is what the track's example prompt asks builders to add):
- **No amount-based tiers.** `vote_policy` is selected by proposal *kind* label only, not by amount. "Small payouts auto-approve, mid-size need one council member, large become a DAO proposal" is not expressible with policy alone.
- **No auto-approval, spending limits, allowances or budgets** per member or period.
- **No reputation or track record.** Bounty claims are stored (`get_bounty_claims(account_id)`), but nothing turns completed bounties into a score or permission.
- **No off-chain notifications or indexer.** Views are paginated contract calls; Trezu runs its own Sputnik indexer for caching (trezu.md).

These gaps come from reading the code. The obvious integration surface for adding them is a separate contract that holds a DAO-granted role or a DAO-funded allowance, plus FunctionCall proposals that the DAO approves. The architect chooses the design; this pack only records the surface.

## 7. Links

- Repo / README / Setup: https://github.com/near-daos/sputnik-dao-contract#setup
- ABI list: https://github.com/near-daos/sputnik-dao-contract/blob/main/sputnikdao2/ABI.md
- Factory: https://github.com/near-daos/sputnik-dao-contract/tree/main/sputnikdao-factory2
- Staking: https://github.com/near-daos/sputnik-dao-contract/tree/main/sputnik-staking
- Test plan: `sputnikdao2/TestPlan.md`. Tests: `sputnikdao2/tests/test_{proposals,bounties,delegation,general,views,upgrade}.rs` (good integration examples; not read in full)
- NEAR docs DAO primitive (secondary): https://docs.near.org/primitives/dao
- Build prerequisites (README): NEAR account, NEAR-CLI (https://near.cli.rs), cargo-near, Rust, and Docker "for production builds"
