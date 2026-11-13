# Fiador Desk Contract Implementation Plan

**Goal:** Build the Fiador desk: the one custom contract, holding a narrow `desk` seat in the DAO policy, that lends treasury NEAR to members as native Sputnik Transfer proposals through three lanes (standing, co-signed, council), settles repayments deterministically, and reconciles every loan with Sputnik.
**Architecture:** One near-sdk 5.30.1 crate (`contract/desk`, lib `fiador_desk`) split by responsibility: `lib.rs` (state, init, helpers), `types.rs`, `errors.rs`, `params.rs`, `gas.rs`, `sputnik.rs` (JSON in/out), `governance.rs` (DAO-only levers), `lending.rs` (the ask chain and the single `file_transfer` routine), `requests.rs` (co-signing), `repay.rs` (settlement), `council.rs` (council lane and reconciliation), `visitors.rs`, `views.rs`. Reserve-then-file: every reservation is made before any cross-contract call and callbacks commit or roll back exactly. The desk never holds loan funds.
**Tech Stack:** Rust 1.99.0 (pinned in `rust-toolchain.toml`, target `wasm32-unknown-unknown`), near-sdk =5.30.1 (`--cfg near` from `.cargo/config.toml`; `unit-testing` feature for tests), the repo's `npm run cargo` launcher (Windows: MSYS2 mingw64 on PATH, `AWS_LC_SYS_PREBUILT_NASM=1`).
**Source spec:** docs/superpowers/specs/2026-11-13-fiador-design.md

Conventions for every task: run every command from the repo root; the executor never runs git; no secrets anywhere. Every task here is security-sensitive and pinned to the top tier. Code blocks are complete file contents unless a step says "append". Gate filters use the full test-module path (`tests::<module>::`) so counts are exact. These tasks were developed and run together before planning: the full suite is 96 passing tests with no warnings on rustc 1.99.0.

---

### Task 21: Desk crate scaffold: state, types, errors, params, gas, test helpers

**Files:**
- Create: `contract/desk/Cargo.toml`
- Create: `contract/desk/Cargo.lock`
- Create: `.gitattributes`
- Create: `contract/desk/src/lib.rs`
- Create: `contract/desk/src/errors.rs`
- Create: `contract/desk/src/types.rs`
- Create: `contract/desk/src/params.rs`
- Create: `contract/desk/src/gas.rs`
- Create: `contract/desk/src/governance.rs`
- Create: `contract/desk/src/sputnik.rs`
- Create: `contract/desk/src/lending.rs`
- Create: `contract/desk/src/requests.rs`
- Create: `contract/desk/src/repay.rs`
- Create: `contract/desk/src/council.rs`
- Create: `contract/desk/src/visitors.rs`
- Create: `contract/desk/src/views.rs`
- Create: `contract/desk/src/tests/mod.rs`
- Create: `contract/desk/src/tests/common.rs`
- Test: `contract/desk/src/tests/init.rs`
- Create: `contract/desk/src/tests/governance.rs`
- Create: `contract/desk/src/tests/sputnik_json.rs`
- Create: `contract/desk/src/tests/ask_chain.rs`
- Create: `contract/desk/src/tests/cosign.rs`
- Create: `contract/desk/src/tests/repay.rs`
- Create: `contract/desk/src/tests/council.rs`
- Create: `contract/desk/src/tests/visitors.rs`
- Create: `contract/desk/src/tests/views.rs`
- Create: `contract/desk/src/tests/gas_headroom.rs`

**Depends on:** Task 1
**Effort:** high
**Model tier:** top
**Requires:** `npm run cargo -- <cargo args>`
**Provides:** `contract/desk: crate fiador_desk (near-sdk =5.30.1): Desk { dao, params, members, loans, requests, book }, new(dao: AccountId, params: Params) -> Self, get_config() -> ConfigView`, `contract/desk JSON: Params { starter_standing: U128, max_standing: U128, growth_step: U128, book_cap: U128, loan_term_sec: u64, grace_sec: u64, request_ttl_sec: u64, visitor_slots: u32, visitor_starter: U128, visitor_window_sec: u64, visitor_deposit: U128, proposal_bond: U128 }`, `contract/desk JSON: ConfigView { dao: string, params: Params, book: U128, member_count: u32, loan_count: u64, request_count: u32 }`, `contract/desk JSON: Lane = "Standing" | "Cosigned" | "Council"; LoanStatus = "Filing" | "Voting" | "AwaitingCouncil" | "Active" | "Repaid" | "RepaidLate" | "Defaulted" | "Refused" | "NotFunded" | "Voided"`, `contract/desk JSON: AskResult = { "Held": { gap: U128, expires_at_ms: u64 } } | { "Loan": { loan_id: u64, status: LoanStatus, proposal_id: u64 | null } }`, `contract/desk JSON: MemberView { account_id: string, standing: U128, drawn: U128, pledged: U128, unused: U128, open_loans: u32, visitor: SeatView | null, repaid_on_time: u32, defaults: u32 }; SeatView { joined_at_ms: u64, expires_at_ms: u64, deposit: U128, loans_taken: u32 }`, `contract/desk JSON: LoanView { id: u64, borrower: string, principal: U128, borrower_part: U128, cosigner: string | null, pledge: U128, lane: Lane, status: LoanStatus, proposal_id: u64 | null, created_at_ms: u64, due_at_ms: u64, closed_at_ms: u64 }`, `contract/desk JSON: RequestView { borrower: string, amount: U128, gap: U128, expires_at_ms: u64, expired: bool }`, `contract/desk/src/errors.rs: every ERR_* refusal string`, `contract/desk/src/tests/common.rs: base test helpers (NEAR, T0, acc, desk_id, dao_id, params, at, as_desk, new_desk, with_members, ok_u64, ok_empty, failed, proposal_with_status, member, last_loan, transfers_to)`

Context: `npm run cargo -- <args>` (Task 1) runs cargo from the repo root with MSYS2 on PATH and `AWS_LC_SYS_PREBUILT_NASM=1`; `rust-toolchain.toml` pins Rust 1.99.0 and `.cargo/config.toml` adds `--cfg near` for wasm builds. The spec is §4 of docs/superpowers/specs/2026-11-13-fiador-design.md. This task writes the complete state, types, errors, params validation and gas constants, plus one-line stub files for every module and test module later tasks fill in, so no later task has to edit `lib.rs` or `tests/mod.rs`. The first cold build takes 2–3 minutes.

- [ ] **Step 1: Create the manifest, .gitattributes and the complete core files**

`contract/desk/Cargo.toml`:
```toml
[package]
name = "fiador-desk"
version = "0.1.0"
edition = "2021"
publish = false

[lib]
crate-type = ["cdylib", "rlib"]

[dependencies]
near-sdk = "=5.30.1"

[dev-dependencies]
near-sdk = { version = "=5.30.1", features = ["unit-testing"] }

[profile.release]
codegen-units = 1
opt-level = "z"
lto = true
debug = false
panic = "abort"
overflow-checks = true
```

`.gitattributes`:
```
*.wasm binary
```

`contract/desk/src/errors.rs`:
```rust
//! Every refusal the desk can make. Scripts and tests match these strings exactly.
pub const ERR_ONLY_DAO: &str = "ERR_ONLY_DAO";
pub const ERR_INVALID_PARAMS: &str = "ERR_INVALID_PARAMS";
pub const ERR_NOT_MEMBER: &str = "ERR_NOT_MEMBER";
pub const ERR_ALREADY_MEMBER: &str = "ERR_ALREADY_MEMBER";
pub const ERR_MEMBER_BUSY: &str = "ERR_MEMBER_BUSY";
pub const ERR_ZERO_AMOUNT: &str = "ERR_ZERO_AMOUNT";
pub const ERR_BOOK_FULL: &str = "ERR_BOOK_FULL: the book cap has no room; use ask_council";
pub const ERR_REQUEST_OPEN: &str = "ERR_REQUEST_OPEN";
pub const ERR_TOO_LARGE_FOR_COSIGN: &str = "ERR_TOO_LARGE_FOR_COSIGN: use ask_council";
pub const ERR_NO_REQUEST: &str = "ERR_NO_REQUEST";
pub const ERR_REQUEST_EXPIRED: &str = "ERR_REQUEST_EXPIRED";
pub const ERR_SELF_COSIGN: &str = "ERR_SELF_COSIGN";
pub const ERR_VISITOR_CANNOT_COSIGN: &str = "ERR_VISITOR_CANNOT_COSIGN";
pub const ERR_NO_GAP: &str = "ERR_NO_GAP";
pub const ERR_PLEDGE_CAP: &str = "ERR_PLEDGE_CAP";
pub const ERR_COSIGNER_SHORT: &str = "ERR_COSIGNER_SHORT";
pub const ERR_VISITOR_NO_COUNCIL: &str = "ERR_VISITOR_NO_COUNCIL";
pub const ERR_VISITOR_DEPOSIT: &str = "ERR_VISITOR_DEPOSIT";
pub const ERR_VISITOR_LINE_FULL: &str = "ERR_VISITOR_LINE_FULL";
pub const ERR_VISITOR_SEAT_EXPIRED: &str = "ERR_VISITOR_SEAT_EXPIRED";
pub const ERR_VISITOR_LOAN_LIMIT: &str = "ERR_VISITOR_LOAN_LIMIT";
pub const ERR_LOAN_NOT_FOUND: &str = "ERR_LOAN_NOT_FOUND";
pub const ERR_LOAN_NOT_ACTIVE: &str = "ERR_LOAN_NOT_ACTIVE";
pub const ERR_WRONG_REPAY_AMOUNT: &str = "ERR_WRONG_REPAY_AMOUNT";
pub const ERR_NOT_OVERDUE: &str = "ERR_NOT_OVERDUE";
pub const ERR_NO_PROPOSAL: &str = "ERR_NO_PROPOSAL";
pub const ERR_CALLBACK_ONLY: &str = "ERR_CALLBACK_ONLY";
```

`contract/desk/src/types.rs`:
```rust
use near_sdk::json_types::U128;
use near_sdk::{near, AccountId};

/// Every number the DAO governs. Amounts in yocto, durations in seconds.
#[near(serializers = [borsh, json])]
#[derive(Clone, Debug, PartialEq)]
pub struct Params {
    pub starter_standing: U128,
    pub max_standing: U128,
    pub growth_step: U128,
    pub book_cap: U128,
    pub loan_term_sec: u64,
    pub grace_sec: u64,
    pub request_ttl_sec: u64,
    pub visitor_slots: u32,
    pub visitor_starter: U128,
    pub visitor_window_sec: u64,
    pub visitor_deposit: U128,
    /// Must equal the DAO policy's proposal_bond (0 on the demo DAO).
    pub proposal_bond: U128,
}

#[near(serializers = [borsh])]
#[derive(Clone, Debug, PartialEq)]
pub struct Seat {
    pub joined_at: u64,
    pub deposit: u128,
    pub loans_taken: u32,
}

#[near(serializers = [borsh])]
#[derive(Clone, Debug, PartialEq)]
pub struct Member {
    pub standing: u128,
    pub drawn: u128,
    pub pledged: u128,
    pub open_loans: u32,
    pub visitor: Option<Seat>,
    pub repaid_on_time: u32,
    pub defaults: u32,
}

impl Member {
    pub fn new(standing: u128, visitor: Option<Seat>) -> Self {
        Self { standing, drawn: 0, pledged: 0, open_loans: 0, visitor, repaid_on_time: 0, defaults: 0 }
    }

    /// Standing not yet drawn by the member's own loans nor pledged to someone else's.
    pub fn unused(&self) -> u128 {
        self.standing.saturating_sub(self.drawn.saturating_add(self.pledged))
    }
}

#[near(serializers = [borsh])]
#[derive(Clone, Debug, PartialEq)]
pub struct Request {
    pub amount: u128,
    pub created_at: u64,
    pub expires_at: u64,
}

#[near(serializers = [borsh, json])]
#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub enum Lane {
    Standing,
    Cosigned,
    Council,
}

#[near(serializers = [borsh, json])]
#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub enum LoanStatus {
    Filing,
    Voting,
    AwaitingCouncil,
    Active,
    Repaid,
    RepaidLate,
    Defaulted,
    Refused,
    NotFunded,
    Voided,
}

#[near(serializers = [borsh])]
#[derive(Clone, Debug, PartialEq)]
pub struct Loan {
    pub id: u64,
    pub borrower: AccountId,
    pub principal: u128,
    pub borrower_part: u128,
    pub cosigner: Option<AccountId>,
    pub pledge: u128,
    pub lane: Lane,
    pub status: LoanStatus,
    pub proposal_id: Option<u64>,
    pub created_at: u64,
    pub due_at: u64,
    pub closed_at: u64,
}

#[near(serializers = [json])]
#[derive(Clone, Debug, PartialEq)]
pub enum AskResult {
    Held { gap: U128, expires_at_ms: u64 },
    Loan { loan_id: u64, status: LoanStatus, proposal_id: Option<u64> },
}

#[near(serializers = [json])]
#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub enum ReadPurpose {
    Sync,
    Default,
}

#[near(serializers = [json])]
#[derive(Clone, Debug, PartialEq)]
pub struct ConfigView {
    pub dao: AccountId,
    pub params: Params,
    pub book: U128,
    pub member_count: u32,
    pub loan_count: u64,
    pub request_count: u32,
}

#[near(serializers = [json])]
#[derive(Clone, Debug, PartialEq)]
pub struct SeatView {
    pub joined_at_ms: u64,
    pub expires_at_ms: u64,
    pub deposit: U128,
    pub loans_taken: u32,
}

#[near(serializers = [json])]
#[derive(Clone, Debug, PartialEq)]
pub struct MemberView {
    pub account_id: AccountId,
    pub standing: U128,
    pub drawn: U128,
    pub pledged: U128,
    pub unused: U128,
    pub open_loans: u32,
    pub visitor: Option<SeatView>,
    pub repaid_on_time: u32,
    pub defaults: u32,
}

#[near(serializers = [json])]
#[derive(Clone, Debug, PartialEq)]
pub struct LoanView {
    pub id: u64,
    pub borrower: AccountId,
    pub principal: U128,
    pub borrower_part: U128,
    pub cosigner: Option<AccountId>,
    pub pledge: U128,
    pub lane: Lane,
    pub status: LoanStatus,
    pub proposal_id: Option<u64>,
    pub created_at_ms: u64,
    pub due_at_ms: u64,
    pub closed_at_ms: u64,
}

#[near(serializers = [json])]
#[derive(Clone, Debug, PartialEq)]
pub struct RequestView {
    pub borrower: AccountId,
    pub amount: U128,
    pub gap: U128,
    pub expires_at_ms: u64,
    pub expired: bool,
}
```

`contract/desk/src/params.rs`:
```rust
use near_sdk::require;

use crate::errors::ERR_INVALID_PARAMS;
use crate::types::Params;

pub(crate) fn validate(p: &Params) {
    require!(p.starter_standing.0 <= p.max_standing.0, ERR_INVALID_PARAMS);
    require!(p.visitor_starter.0 <= p.max_standing.0, ERR_INVALID_PARAMS);
    require!(p.growth_step.0 > 0, ERR_INVALID_PARAMS);
    require!(p.loan_term_sec > 0 && p.request_ttl_sec > 0 && p.visitor_window_sec > 0, ERR_INVALID_PARAMS);
}
```

`contract/desk/src/gas.rs`:
```rust
//! Static gas for every cross-contract call. Starting values are the smoke contract's proven allocations;
//! src/tests/gas_headroom.rs asserts each is >= 1.3x the live measurement in deployments/smoke-gas.json.
use near_sdk::Gas;

pub const GAS_ADD_PROPOSAL: Gas = Gas::from_tgas(50);
pub const GAS_ON_FILED: Gas = Gas::from_tgas(150);
pub const GAS_ACT_PROPOSAL: Gas = Gas::from_tgas(100);
pub const GAS_ON_VOTED: Gas = Gas::from_tgas(20);
pub const GAS_GET_PROPOSAL: Gas = Gas::from_tgas(20);
pub const GAS_ON_READ: Gas = Gas::from_tgas(30);
/// Largest promise result the desk will read (a proposal is about 1 KB).
pub const MAX_RESULT_LEN: usize = 16_384;
```

`contract/desk/src/lib.rs`:
```rust
//! Fiador desk: a credit union seat for a Sputnik DAO. It never holds loan funds: every loan is a native
//! Sputnik Transfer proposal paid by the DAO, and every repayment is forwarded to the DAO in the same chain.
use near_sdk::json_types::U128;
use near_sdk::store::{IterableMap, Vector};
use near_sdk::{env, near, require, AccountId, BorshStorageKey, PanicOnDefault};

pub mod errors;
pub mod gas;
mod council;
mod governance;
mod lending;
mod params;
mod repay;
mod requests;
mod sputnik;
pub mod types;
mod views;
mod visitors;

#[cfg(test)]
mod tests;

pub use crate::types::*;

pub(crate) const NS_PER_SEC: u64 = 1_000_000_000;
pub(crate) const NS_PER_MS: u64 = 1_000_000;

#[near(serializers = [borsh])]
#[derive(BorshStorageKey)]
pub(crate) enum StorageKey {
    Members,
    Loans,
    Requests,
}

#[near(contract_state)]
#[derive(PanicOnDefault)]
pub struct Desk {
    pub(crate) dao: AccountId,
    pub(crate) params: Params,
    pub(crate) members: IterableMap<AccountId, Member>,
    pub(crate) loans: Vector<Loan>,
    pub(crate) requests: IterableMap<AccountId, Request>,
    pub(crate) book: u128,
}

#[near]
impl Desk {
    /// Called once, in the same transaction as the deploy, so nobody can initialise the desk first.
    #[init]
    pub fn new(dao: AccountId, params: Params) -> Self {
        params::validate(&params);
        Self {
            dao,
            params,
            members: IterableMap::new(StorageKey::Members),
            loans: Vector::new(StorageKey::Loans),
            requests: IterableMap::new(StorageKey::Requests),
            book: 0,
        }
    }

    pub fn get_config(&self) -> ConfigView {
        ConfigView {
            dao: self.dao.clone(),
            params: self.params.clone(),
            book: U128(self.book),
            member_count: self.members.len(),
            loan_count: u64::from(self.loans.len()),
            request_count: self.requests.len(),
        }
    }
}

impl Desk {
    pub(crate) fn now() -> u64 {
        env::block_timestamp()
    }

    pub(crate) fn secs(sec: u64) -> u64 {
        sec.saturating_mul(NS_PER_SEC)
    }

    pub(crate) fn require_dao(&self) {
        require!(env::predecessor_account_id() == self.dao, errors::ERR_ONLY_DAO);
    }

    /// Callbacks also carry `#[private]`; this in-body check is defence in depth and is unit-testable.
    pub(crate) fn require_callback() {
        require!(env::predecessor_account_id() == env::current_account_id(), errors::ERR_CALLBACK_ONLY);
    }

    pub(crate) fn member(&self, account_id: &AccountId) -> Member {
        self.members.get(account_id).cloned().unwrap_or_else(|| env::panic_str(errors::ERR_NOT_MEMBER))
    }

    pub(crate) fn put_member(&mut self, account_id: &AccountId, member: Member) {
        self.members.insert(account_id.clone(), member);
    }

    pub(crate) fn loan(&self, loan_id: u64) -> Loan {
        u32::try_from(loan_id)
            .ok()
            .and_then(|index| self.loans.get(index))
            .cloned()
            .unwrap_or_else(|| env::panic_str(errors::ERR_LOAN_NOT_FOUND))
    }

    pub(crate) fn put_loan(&mut self, loan: Loan) {
        let index = u32::try_from(loan.id).unwrap_or_else(|_| env::panic_str(errors::ERR_LOAN_NOT_FOUND));
        self.loans.set(index, loan);
    }
}
```

- [ ] **Step 2: Create the module stubs (each is exactly one line; later tasks replace them)**

`contract/desk/src/governance.rs`:
```rust
//! Filled in by Task 22 (governance).
```

`contract/desk/src/sputnik.rs`:
```rust
//! Filled in by Task 23 (Sputnik JSON).
```

`contract/desk/src/lending.rs`:
```rust
//! Filled in by Task 24 (the ask chain).
```

`contract/desk/src/requests.rs`:
```rust
//! Filled in by Task 25 (co-signing).
```

`contract/desk/src/repay.rs`:
```rust
//! Filled in by Task 26 (repayment).
```

`contract/desk/src/council.rs`:
```rust
//! Filled in by Task 27 (council lane and reconciliation).
```

`contract/desk/src/visitors.rs`:
```rust
//! Filled in by Task 28 (the visitor line).
```

`contract/desk/src/views.rs`:
```rust
//! Filled in by Task 29 (views).
```

- [ ] **Step 3: Create the test module tree, the base helpers and the test stubs**

`contract/desk/src/tests/mod.rs`:
```rust
mod common;

mod ask_chain;
mod cosign;
mod council;
mod gas_headroom;
mod governance;
mod init;
mod repay;
mod sputnik_json;
mod views;
mod visitors;
```

`contract/desk/src/tests/common.rs`:
```rust
//! Shared unit-test helpers: contexts at a given second, promise results, and full-chain drivers.
use near_sdk::json_types::U128;
use near_sdk::mock::MockAction;
use near_sdk::test_utils::{get_created_receipts, VMContextBuilder};
use near_sdk::{testing_env, AccountId, NearToken, PromiseResult};

use crate::types::{Loan, Member, Params};
use crate::Desk;

pub const NEAR: u128 = 1_000_000_000_000_000_000_000_000;
/// A fixed "now" in seconds; tests move time forward from here.
pub const T0: u64 = 1_800_000_000;

pub fn acc(s: &str) -> AccountId {
    s.parse().unwrap()
}
pub fn desk_id() -> AccountId {
    acc("desk.root.testnet")
}
pub fn dao_id() -> AccountId {
    acc("fiador.sputnikv2.testnet")
}

/// The demo DAO parameters, except two visitor slots so a full line is easy to reach.
pub fn params() -> Params {
    Params {
        starter_standing: U128(4 * NEAR),
        max_standing: U128(10 * NEAR),
        growth_step: U128(NEAR),
        book_cap: U128(12 * NEAR),
        loan_term_sec: 120,
        grace_sec: 60,
        request_ttl_sec: 600,
        visitor_slots: 2,
        visitor_starter: U128(NEAR / 10),
        visitor_window_sec: 1800,
        visitor_deposit: U128(NEAR / 20),
        proposal_bond: U128(0),
    }
}

/// Sets the context: who calls, at which second, with which attached deposit and promise results.
pub fn at(predecessor: &AccountId, sec: u64, deposit: u128, results: Vec<PromiseResult>) {
    let ctx = VMContextBuilder::new()
        .current_account_id(desk_id())
        .predecessor_account_id(predecessor.clone())
        .signer_account_id(predecessor.clone())
        .block_timestamp(sec * 1_000_000_000)
        .attached_deposit(NearToken::from_yoctonear(deposit))
        .build();
    testing_env!(ctx, near_sdk::test_vm_config(), near_sdk::RuntimeFeesConfig::test(), Default::default(), results);
}

/// A callback context: the desk calls itself.
pub fn as_desk(sec: u64, results: Vec<PromiseResult>) {
    at(&desk_id(), sec, 0, results)
}

pub fn new_desk() -> Desk {
    at(&desk_id(), T0, 0, vec![]);
    Desk::new(dao_id(), params())
}

/// A desk with these members admitted by the DAO (each at starter standing 4 NEAR).
pub fn with_members(names: &[&str]) -> Desk {
    let mut d = new_desk();
    at(&dao_id(), T0, 0, vec![]);
    for n in names {
        d.admit_member(acc(n));
    }
    d
}

pub fn ok_u64(v: u64) -> Vec<PromiseResult> {
    vec![PromiseResult::Successful(v.to_string().into_bytes())]
}
pub fn ok_empty() -> Vec<PromiseResult> {
    vec![PromiseResult::Successful(vec![])]
}
pub fn failed() -> Vec<PromiseResult> {
    vec![PromiseResult::Failed]
}
/// A get_proposal result in the live 2.3.1 shape with the given status.
pub fn proposal_with_status(status: &str) -> Vec<PromiseResult> {
    let json = format!(
        "{{\"id\":5,\"proposer\":\"desk.root.testnet\",\"description\":\"d\",\"kind\":{{\"Transfer\":{{\"token_id\":\"\",\"receiver_id\":\"ada.testnet\",\"amount\":\"1\",\"msg\":null}}}},\"status\":\"{}\",\"vote_counts\":{{\"council\":[2,0,0]}},\"votes\":{{}},\"submission_time\":\"1\"}}",
        status
    );
    vec![PromiseResult::Successful(json.into_bytes())]
}

pub fn member(d: &Desk, name: &str) -> Member {
    d.members.get(&acc(name)).cloned().unwrap()
}
pub fn last_loan(d: &Desk) -> Loan {
    d.loan(u64::from(d.loans.len()) - 1)
}

/// NEAR transfers the last call scheduled to `account` (yocto amounts).
pub fn transfers_to(account: &AccountId) -> Vec<u128> {
    get_created_receipts()
        .into_iter()
        .filter(|r| &r.receiver_id == account)
        .flat_map(|r| r.actions.into_iter())
        .filter_map(|a| match a {
            MockAction::Transfer { deposit, .. } => Some(deposit.as_yoctonear()),
            _ => None,
        })
        .collect()
}
```

`contract/desk/src/tests/governance.rs`:
```rust
//! Filled in by Task 22 (governance tests).
```

`contract/desk/src/tests/sputnik_json.rs`:
```rust
//! Filled in by Task 23 (sputnik_json tests).
```

`contract/desk/src/tests/ask_chain.rs`:
```rust
//! Filled in by Task 24 (ask_chain tests).
```

`contract/desk/src/tests/cosign.rs`:
```rust
//! Filled in by Task 25 (cosign tests).
```

`contract/desk/src/tests/repay.rs`:
```rust
//! Filled in by Task 26 (repay tests).
```

`contract/desk/src/tests/council.rs`:
```rust
//! Filled in by Task 27 (council tests).
```

`contract/desk/src/tests/visitors.rs`:
```rust
//! Filled in by Task 28 (visitors tests).
```

`contract/desk/src/tests/views.rs`:
```rust
//! Filled in by Task 29 (views tests).
```

`contract/desk/src/tests/gas_headroom.rs`:
```rust
//! Filled in by Task 30 (gas_headroom tests).
```

- [ ] **Step 4: Write the init tests**

`contract/desk/src/tests/init.rs`:
```rust
use near_sdk::json_types::U128;

use super::common::*;
use crate::Desk;

#[test]
fn new_stores_the_dao_and_params_with_an_empty_book() {
    let d = new_desk();
    let c = d.get_config();
    assert_eq!(c.dao, dao_id());
    assert_eq!(c.params, params());
    assert_eq!(c.book, U128(0));
    assert_eq!((c.member_count, c.loan_count, c.request_count), (0, 0, 0));
}

#[test]
#[should_panic(expected = "ERR_INVALID_PARAMS")]
fn new_rejects_a_starter_above_max() {
    at(&desk_id(), T0, 0, vec![]);
    let mut p = params();
    p.starter_standing = U128(11 * NEAR);
    let _ = Desk::new(dao_id(), p);
}

#[test]
#[should_panic(expected = "ERR_INVALID_PARAMS")]
fn new_rejects_a_zero_growth_step() {
    at(&desk_id(), T0, 0, vec![]);
    let mut p = params();
    p.growth_step = U128(0);
    let _ = Desk::new(dao_id(), p);
}

#[test]
#[should_panic(expected = "ERR_INVALID_PARAMS")]
fn new_rejects_a_zero_term() {
    at(&desk_id(), T0, 0, vec![]);
    let mut p = params();
    p.loan_term_sec = 0;
    let _ = Desk::new(dao_id(), p);
}
```

- [ ] **Step 5: Run the gate**

Run: `npm run cargo -- test --manifest-path contract/desk/Cargo.toml tests::init::`
Expected: PASS — `test result: ok. 4 passed; 0 failed` (warnings about not-yet-used helpers are expected; the first run also creates `contract/desk/Cargo.lock`)

- [ ] **Step 6: Commit (kernel-performed — no agent runs this)**
Message: `feat(desk): crate scaffold, state, types, errors and params`

---

### Task 22: DAO-only governance: set_params, admit_member, remove_member

**Files:**
- Modify: `contract/desk/src/governance.rs`
- Test: `contract/desk/src/tests/governance.rs`

**Depends on:** Task 21
**Effort:** high
**Model tier:** top
**Requires:** `contract/desk: crate fiador_desk (near-sdk =5.30.1): Desk { dao, params, members, loans, requests, book }, new(dao: AccountId, params: Params) -> Self, get_config() -> ConfigView`, `contract/desk/src/tests/common.rs: base test helpers (NEAR, T0, acc, desk_id, dao_id, params, at, as_desk, new_desk, with_members, ok_u64, ok_empty, failed, proposal_with_status, member, last_loan, transfers_to)`
**Provides:** `contract/desk: set_params(params: Params); admit_member(account_id: AccountId); remove_member(account_id: AccountId) — callable only by the DAO account stored at init (ERR_ONLY_DAO)`

Context: the crate (Task 21) defines, in `contract/desk/src/types.rs`, `Params`, `Member { standing, drawn, pledged, open_loans, visitor: Option<Seat>, repaid_on_time, defaults }` with `Member::new(standing, visitor)` and `Member::unused()`, `Seat { joined_at, deposit, loans_taken }`, `Request { amount, created_at, expires_at }`, `Lane`, `LoanStatus`, `Loan`, `AskResult`, `ReadPurpose` and the view structs; `contract/desk/src/lib.rs` defines `Desk { dao, params, members: IterableMap<AccountId, Member>, loans: Vector<Loan>, requests: IterableMap<AccountId, Request>, book: u128 }` and the helpers `Desk::now()`, `Desk::secs(sec)`, `self.require_dao()`, `Desk::require_callback()`, `self.member(&id)` (panics ERR_NOT_MEMBER), `self.put_member(&id, m)`, `self.loan(id)` (panics ERR_LOAN_NOT_FOUND), `self.put_loan(loan)`, constants `NS_PER_SEC`, `NS_PER_MS`; `contract/desk/src/errors.rs` holds every `ERR_*` string and `contract/desk/src/gas.rs` the gas constants. Every `#[near] impl Desk` block outside lib.rs must `use crate::{Desk, DeskExt};`. Unit tests call methods directly, so near-sdk's `#[private]` is NOT enforced in them; callbacks therefore also call `Desk::require_callback()` (ERR_CALLBACK_ONLY), which the tests exercise. Storage persists across `testing_env!` calls inside one test, so a test builds exactly one `Desk`. D5: no owner, no other admin; a removed visitor's deposit is refunded.

- [ ] **Step 1: Write the failing tests (replace the stub `contract/desk/src/tests/governance.rs`)**

`contract/desk/src/tests/governance.rs`:
```rust
use near_sdk::json_types::U128;

use super::common::*;
use crate::types::{Member, Seat};

#[test]
fn the_dao_admits_a_member_at_starter_standing() {
    let d = with_members(&["ada.testnet"]);
    assert_eq!(member(&d, "ada.testnet"), Member::new(4 * NEAR, None));
    assert_eq!(d.get_config().member_count, 1);
}

#[test]
#[should_panic(expected = "ERR_ONLY_DAO")]
fn nobody_else_can_admit() {
    let mut d = new_desk();
    at(&acc("ada.testnet"), T0, 0, vec![]);
    d.admit_member(acc("ada.testnet"));
}

#[test]
#[should_panic(expected = "ERR_ONLY_DAO")]
fn not_even_the_desk_account_itself_can_set_params() {
    let mut d = new_desk();
    as_desk(T0, vec![]);
    d.set_params(params());
}

#[test]
#[should_panic(expected = "ERR_ALREADY_MEMBER")]
fn admitting_twice_fails() {
    let mut d = with_members(&["ada.testnet"]);
    d.admit_member(acc("ada.testnet"));
}

#[test]
fn the_dao_sets_valid_params() {
    let mut d = new_desk();
    at(&dao_id(), T0, 0, vec![]);
    let mut p = params();
    p.book_cap = U128(20 * NEAR);
    d.set_params(p.clone());
    assert_eq!(d.get_config().params, p);
}

#[test]
#[should_panic(expected = "ERR_INVALID_PARAMS")]
fn the_dao_cannot_set_invalid_params() {
    let mut d = new_desk();
    at(&dao_id(), T0, 0, vec![]);
    let mut p = params();
    p.visitor_starter = U128(11 * NEAR);
    d.set_params(p);
}

#[test]
fn the_dao_removes_an_idle_member() {
    let mut d = with_members(&["ada.testnet"]);
    d.remove_member(acc("ada.testnet"));
    assert!(d.members.get(&acc("ada.testnet")).is_none());
}

#[test]
#[should_panic(expected = "ERR_MEMBER_BUSY")]
fn a_member_with_an_open_loan_cannot_be_removed() {
    let mut d = with_members(&["ada.testnet"]);
    let mut m = member(&d, "ada.testnet");
    m.open_loans = 1;
    d.put_member(&acc("ada.testnet"), m);
    d.remove_member(acc("ada.testnet"));
}

#[test]
#[should_panic(expected = "ERR_NOT_MEMBER")]
fn removing_a_stranger_fails() {
    let mut d = new_desk();
    at(&dao_id(), T0, 0, vec![]);
    d.remove_member(acc("nobody.testnet"));
}

#[test]
fn removing_a_visitor_refunds_its_deposit() {
    let mut d = new_desk();
    let seat = Seat { joined_at: T0 * 1_000_000_000, deposit: NEAR / 20, loans_taken: 0 };
    d.put_member(&acc("v.testnet"), Member::new(NEAR / 10, Some(seat)));
    at(&dao_id(), T0, 0, vec![]);
    d.remove_member(acc("v.testnet"));
    assert_eq!(transfers_to(&acc("v.testnet")), vec![NEAR / 20]);
}
```

- [ ] **Step 2: Run to confirm it fails**

Run: `npm run cargo -- test --manifest-path contract/desk/Cargo.toml tests::governance::`
Expected: FAIL — compile error "no method named admit_member found for struct Desk"

- [ ] **Step 3: Implement (replace the stub `contract/desk/src/governance.rs`)**

`contract/desk/src/governance.rs`:
```rust
//! The DAO's only levers. Each accepts calls ONLY from the DAO account stored at init, so the council uses
//! ordinary Sputnik FunctionCall proposals. There is no owner and no other admin.
use near_sdk::{env, near, require, AccountId, NearToken, Promise};

use crate::errors::{ERR_ALREADY_MEMBER, ERR_MEMBER_BUSY};
use crate::types::{Member, Params};
use crate::{params, Desk, DeskExt};

#[near]
impl Desk {
    pub fn set_params(&mut self, params: Params) {
        self.require_dao();
        params::validate(&params);
        self.params = params;
        env::log_str("fiador: parameters updated by the DAO");
    }

    pub fn admit_member(&mut self, account_id: AccountId) {
        self.require_dao();
        require!(!self.members.contains_key(&account_id), ERR_ALREADY_MEMBER);
        let standing = self.params.starter_standing.0;
        self.members.insert(account_id.clone(), Member::new(standing, None));
        env::log_str(&format!("fiador: {} admitted with standing {}", account_id, standing));
    }

    pub fn remove_member(&mut self, account_id: AccountId) {
        self.require_dao();
        let member = self.member(&account_id);
        require!(
            member.open_loans == 0 && member.pledged == 0 && !self.requests.contains_key(&account_id),
            ERR_MEMBER_BUSY
        );
        self.members.remove(&account_id);
        if let Some(seat) = member.visitor {
            if seat.deposit > 0 {
                Promise::new(account_id.clone()).transfer(NearToken::from_yoctonear(seat.deposit)).detach();
            }
        }
        env::log_str(&format!("fiador: {} removed by the DAO", account_id));
    }
}
```

- [ ] **Step 4: Run the gate**

Run: `npm run cargo -- test --manifest-path contract/desk/Cargo.toml tests::governance::`
Expected: PASS — `test result: ok. 10 passed; 0 failed`

- [ ] **Step 5: Commit (kernel-performed — no agent runs this)**
Message: `feat(desk): DAO-only governance`

---

### Task 23: Sputnik 2.3.1 JSON builders and tolerant result readers

**Files:**
- Modify: `contract/desk/src/sputnik.rs`
- Test: `contract/desk/src/tests/sputnik_json.rs`

**Depends on:** Task 21
**Effort:** high
**Model tier:** top
**Requires:** `contract/desk: crate fiador_desk (near-sdk =5.30.1): Desk { dao, params, members, loans, requests, book }, new(dao: AccountId, params: Params) -> Self, get_config() -> ConfigView`
**Provides:** `contract/desk/src/sputnik.rs: transfer_kind(&AccountId, u128) -> Value; add_proposal_args(&Loan) -> Vec<u8>; act_proposal_args(proposal_id: u64, &Loan) -> Vec<u8>; get_proposal_args(u64) -> Vec<u8>; read_u64_result() -> Option<u64>; promise_ok() -> bool; parse_status(&[u8]) -> Option<String>; read_proposal_status() -> Option<String>`

Context: the crate (Task 21) defines, in `contract/desk/src/types.rs`, `Params`, `Member { standing, drawn, pledged, open_loans, visitor: Option<Seat>, repaid_on_time, defaults }` with `Member::new(standing, visitor)` and `Member::unused()`, `Seat { joined_at, deposit, loans_taken }`, `Request { amount, created_at, expires_at }`, `Lane`, `LoanStatus`, `Loan`, `AskResult`, `ReadPurpose` and the view structs; `contract/desk/src/lib.rs` defines `Desk { dao, params, members: IterableMap<AccountId, Member>, loans: Vector<Loan>, requests: IterableMap<AccountId, Request>, book: u128 }` and the helpers `Desk::now()`, `Desk::secs(sec)`, `self.require_dao()`, `Desk::require_callback()`, `self.member(&id)` (panics ERR_NOT_MEMBER), `self.put_member(&id, m)`, `self.loan(id)` (panics ERR_LOAN_NOT_FOUND), `self.put_loan(loan)`, constants `NS_PER_SEC`, `NS_PER_MS`; `contract/desk/src/errors.rs` holds every `ERR_*` string and `contract/desk/src/gas.rs` the gas constants. Every `#[near] impl Desk` block outside lib.rs must `use crate::{Desk, DeskExt};`. Unit tests call methods directly, so near-sdk's `#[private]` is NOT enforced in them; callbacks therefore also call `Desk::require_callback()` (ERR_CALLBACK_ONLY), which the tests exercise. Storage persists across `testing_env!` calls inside one test, so a test builds exactly one `Desk`. Sputnik rules (spec §2, live 2.3.1): the Transfer kind is `{"Transfer":{"token_id":"","receiver_id":…,"amount":"<yocto>"}}` (omit `msg`); `act_proposal` takes exactly `id`, `action`, `proposal` (the kind as filed); `add_proposal` returns the new id as a JSON number; `get_proposal` output is read tolerantly (only `status`). Promise results are read with `env::promise_result_checked(0, MAX_RESULT_LEN)`.

- [ ] **Step 1: Write the failing tests (replace the stub `contract/desk/src/tests/sputnik_json.rs`)**

`contract/desk/src/tests/sputnik_json.rs`:
```rust
use near_sdk::serde_json::{self, json, Value};

use super::common::*;
use crate::sputnik;
use crate::types::{Lane, Loan, LoanStatus};

fn loan() -> Loan {
    Loan {
        id: 3,
        borrower: acc("ada.testnet"),
        principal: 6 * NEAR,
        borrower_part: 4 * NEAR,
        cosigner: Some(acc("bayo.testnet")),
        pledge: 2 * NEAR,
        lane: Lane::Cosigned,
        status: LoanStatus::Filing,
        proposal_id: None,
        created_at: 0,
        due_at: 0,
        closed_at: 0,
    }
}

#[test]
fn add_proposal_files_a_near_transfer_to_the_borrower() {
    let v: Value = serde_json::from_slice(&sputnik::add_proposal_args(&loan())).unwrap();
    assert_eq!(
        v,
        json!({ "proposal": {
            "description": "fiador loan #3: 6000000000000000000000000 yocto to ada.testnet (co-signed lane)",
            "kind": { "Transfer": { "token_id": "", "receiver_id": "ada.testnet", "amount": "6000000000000000000000000" } }
        } })
    );
}

#[test]
fn act_proposal_echoes_exactly_the_kind_as_filed() {
    let v: Value = serde_json::from_slice(&sputnik::act_proposal_args(9, &loan())).unwrap();
    let filed: Value = serde_json::from_slice(&sputnik::add_proposal_args(&loan())).unwrap();
    assert_eq!(v["id"], json!(9));
    assert_eq!(v["action"], json!("VoteApprove"));
    assert_eq!(v["proposal"], filed["proposal"]["kind"]);
    assert_eq!(v.as_object().unwrap().len(), 3, "exactly id, action and proposal");
}

#[test]
fn get_proposal_takes_the_id() {
    let v: Value = serde_json::from_slice(&sputnik::get_proposal_args(9)).unwrap();
    assert_eq!(v, json!({ "id": 9 }));
}

#[test]
fn status_is_read_from_the_live_2_3_1_shape() {
    let bytes = br#"{"id":0,"proposer":"bot.testnet","description":"pizza","kind":{"Transfer":{"token_id":"","receiver_id":"bob.testnet","amount":"1","msg":null}},"status":"Approved","vote_counts":{"council":[2,0,0]},"votes":{"a.testnet":"Approve"},"submission_time":"1794515258987148509"}"#;
    assert_eq!(sputnik::parse_status(bytes), Some("Approved".to_string()));
    assert_eq!(sputnik::parse_status(b"{}"), None);
    assert_eq!(sputnik::parse_status(b"not json"), None);
}

#[test]
fn promise_results_are_read_safely() {
    as_desk(T0, ok_u64(7));
    assert_eq!(sputnik::read_u64_result(), Some(7));
    as_desk(T0, vec![near_sdk::PromiseResult::Successful(b"\"seven\"".to_vec())]);
    assert_eq!(sputnik::read_u64_result(), None);
    as_desk(T0, failed());
    assert_eq!(sputnik::read_u64_result(), None);
    assert!(!sputnik::promise_ok());
    as_desk(T0, ok_empty());
    assert!(sputnik::promise_ok());
}
```

- [ ] **Step 2: Run to confirm it fails**

Run: `npm run cargo -- test --manifest-path contract/desk/Cargo.toml tests::sputnik_json::`
Expected: FAIL — compile error "cannot find function add_proposal_args in module sputnik"

- [ ] **Step 3: Implement (replace the stub `contract/desk/src/sputnik.rs`)**

`contract/desk/src/sputnik.rs`:
```rust
//! JSON the desk sends to and reads from the live Sputnik 2.3.1 DAO.
use near_sdk::serde_json::{self, json, Value};
use near_sdk::{env, AccountId};

use crate::gas::MAX_RESULT_LEN;
use crate::types::{Lane, Loan};

/// The NEAR Transfer kind as the live 2.3.1 DAO stores it, minus `msg` (valid on 2.3.1 and main).
pub(crate) fn transfer_kind(receiver_id: &AccountId, amount: u128) -> Value {
    json!({ "Transfer": { "token_id": "", "receiver_id": receiver_id, "amount": amount.to_string() } })
}

pub(crate) fn lane_label(lane: Lane) -> &'static str {
    match lane {
        Lane::Standing => "standing lane",
        Lane::Cosigned => "co-signed lane",
        Lane::Council => "council lane",
    }
}

pub(crate) fn add_proposal_args(loan: &Loan) -> Vec<u8> {
    let description = format!(
        "fiador loan #{}: {} yocto to {} ({})",
        loan.id,
        loan.principal,
        loan.borrower,
        lane_label(loan.lane)
    );
    let args = json!({ "proposal": { "description": description, "kind": transfer_kind(&loan.borrower, loan.principal) } });
    serde_json::to_vec(&args).expect("add_proposal args")
}

/// `proposal` echoes the kind exactly as filed: required on main (ERR_WRONG_KIND), accepted by 2.3.1.
pub(crate) fn act_proposal_args(proposal_id: u64, loan: &Loan) -> Vec<u8> {
    let args = json!({ "id": proposal_id, "action": "VoteApprove", "proposal": transfer_kind(&loan.borrower, loan.principal) });
    serde_json::to_vec(&args).expect("act_proposal args")
}

pub(crate) fn get_proposal_args(proposal_id: u64) -> Vec<u8> {
    serde_json::to_vec(&json!({ "id": proposal_id })).expect("get_proposal args")
}

pub(crate) fn read_result() -> Option<Vec<u8>> {
    env::promise_result_checked(0, MAX_RESULT_LEN).ok()
}

/// add_proposal returns the new id as a JSON number.
pub(crate) fn read_u64_result() -> Option<u64> {
    read_result().and_then(|bytes| serde_json::from_slice::<u64>(&bytes).ok())
}

pub(crate) fn promise_ok() -> bool {
    read_result().is_some()
}

/// Tolerant: reads only `status` from get_proposal output, whatever else the DAO version adds or omits.
pub(crate) fn parse_status(bytes: &[u8]) -> Option<String> {
    let value: Value = serde_json::from_slice(bytes).ok()?;
    value.get("status")?.as_str().map(str::to_string)
}

pub(crate) fn read_proposal_status() -> Option<String> {
    read_result().and_then(|bytes| parse_status(&bytes))
}
```

- [ ] **Step 4: Run the gate**

Run: `npm run cargo -- test --manifest-path contract/desk/Cargo.toml tests::sputnik_json::`
Expected: PASS — `test result: ok. 5 passed; 0 failed`

- [ ] **Step 5: Commit (kernel-performed — no agent runs this)**
Message: `feat(desk): Sputnik JSON builders and readers`

---

### Task 24: The ask chain and the one file-and-approve routine (security core)

**Files:**
- Modify: `contract/desk/src/lending.rs`
- Modify: `contract/desk/src/tests/common.rs`
- Test: `contract/desk/src/tests/ask_chain.rs`

**Depends on:** Task 22, Task 23
**Effort:** xhigh
**Model tier:** top
**Requires:** `contract/desk: set_params(params: Params); admit_member(account_id: AccountId); remove_member(account_id: AccountId) — callable only by the DAO account stored at init (ERR_ONLY_DAO)`, `contract/desk/src/sputnik.rs: transfer_kind(&AccountId, u128) -> Value; add_proposal_args(&Loan) -> Vec<u8>; act_proposal_args(proposal_id: u64, &Loan) -> Vec<u8>; get_proposal_args(u64) -> Vec<u8>; read_u64_result() -> Option<u64>; promise_ok() -> bool; parse_status(&[u8]) -> Option<String>; read_proposal_status() -> Option<String>`
**Provides:** `contract/desk: ask(amount: U128) -> PromiseOrValue<AskResult>; callbacks on_filed(loan_id: u64, approve: bool), on_voted(loan_id: u64)`, `contract/desk/src/lending.rs: open_loan, holds_reservation, release, close, outcome, check_visitor_can_borrow, file_transfer (the one routine that writes to Sputnik), VISITOR_MAX_LOANS = 3`, `contract/desk/src/tests/common.rs: active_loan(d: &mut Desk, borrower: &str, amount: u128, sec: u64, proposal_id: u64) -> u64`

Context: the crate (Task 21) defines, in `contract/desk/src/types.rs`, `Params`, `Member { standing, drawn, pledged, open_loans, visitor: Option<Seat>, repaid_on_time, defaults }` with `Member::new(standing, visitor)` and `Member::unused()`, `Seat { joined_at, deposit, loans_taken }`, `Request { amount, created_at, expires_at }`, `Lane`, `LoanStatus`, `Loan`, `AskResult`, `ReadPurpose` and the view structs; `contract/desk/src/lib.rs` defines `Desk { dao, params, members: IterableMap<AccountId, Member>, loans: Vector<Loan>, requests: IterableMap<AccountId, Request>, book: u128 }` and the helpers `Desk::now()`, `Desk::secs(sec)`, `self.require_dao()`, `Desk::require_callback()`, `self.member(&id)` (panics ERR_NOT_MEMBER), `self.put_member(&id, m)`, `self.loan(id)` (panics ERR_LOAN_NOT_FOUND), `self.put_loan(loan)`, constants `NS_PER_SEC`, `NS_PER_MS`; `contract/desk/src/errors.rs` holds every `ERR_*` string and `contract/desk/src/gas.rs` the gas constants. Every `#[near] impl Desk` block outside lib.rs must `use crate::{Desk, DeskExt};`. Unit tests call methods directly, so near-sdk's `#[private]` is NOT enforced in them; callbacks therefore also call `Desk::require_callback()` (ERR_CALLBACK_ONLY), which the tests exercise. Storage persists across `testing_env!` calls inside one test, so a test builds exactly one `Desk`. From Task 23, `crate::sputnik` provides `add_proposal_args(&Loan)`, `act_proposal_args(proposal_id, &Loan)`, `read_u64_result()` and `promise_ok()`. Spec §4.3 (the core routine) and D19/D24/D25/D27: reserve BEFORE any cross-contract call; `file_transfer` is the only code that calls `add_proposal`/`act_proposal`; the desk votes ONLY on the id parsed from its own `add_proposal` result inside `on_filed`; a failed or unparsable `add_proposal` rolls back exactly and marks the loan `Refused`; a failed vote releases every reservation and moves the loan to the council lane (`AwaitingCouncil`); an ask that fits standing but not the book cap panics `ERR_BOOK_FULL`; an ask above unused standing is held (`AskResult::Held`) unless the gap exceeds `max_standing`.

- [ ] **Step 1: Write the failing tests (replace the stub `contract/desk/src/tests/ask_chain.rs`)**

`contract/desk/src/tests/ask_chain.rs`:
```rust
//! D24: each step of the ask chain failing, with the reservation rolled back exactly.
use near_sdk::json_types::U128;
use near_sdk::{PromiseOrValue, PromiseResult};

use super::common::*;
use crate::types::{AskResult, Lane, LoanStatus, Member};

fn untouched(d: &crate::Desk, name: &str) {
    assert_eq!(member(d, name), Member::new(4 * NEAR, None), "{name} must be exactly as admitted");
}

#[test]
fn an_ask_within_standing_reserves_then_files() {
    let mut d = with_members(&["ada.testnet"]);
    at(&acc("ada.testnet"), T0, 0, vec![]);
    match d.ask(U128(3 * NEAR)) {
        PromiseOrValue::Promise(_) => {}
        PromiseOrValue::Value(v) => panic!("expected the filing chain, got {v:?}"),
    }
    let loan = last_loan(&d);
    assert_eq!((loan.status, loan.lane, loan.principal, loan.borrower_part), (LoanStatus::Filing, Lane::Standing, 3 * NEAR, 3 * NEAR));
    assert_eq!(member(&d, "ada.testnet").drawn, 3 * NEAR);
    assert_eq!(member(&d, "ada.testnet").open_loans, 1);
    assert_eq!(d.book, 3 * NEAR);
}

#[test]
fn the_full_chain_ends_active_with_a_due_date() {
    let mut d = with_members(&["ada.testnet"]);
    let id = active_loan(&mut d, "ada.testnet", 3 * NEAR, T0, 41);
    let loan = d.loan(id);
    assert_eq!(loan.status, LoanStatus::Active);
    assert_eq!(loan.proposal_id, Some(41));
    assert_eq!(loan.due_at, (T0 + 120) * 1_000_000_000);
    assert_eq!(d.book, 3 * NEAR);
}

#[test]
fn add_proposal_failing_rolls_everything_back() {
    let mut d = with_members(&["ada.testnet"]);
    at(&acc("ada.testnet"), T0, 0, vec![]);
    let _ = d.ask(U128(3 * NEAR));
    let id = last_loan(&d).id;
    as_desk(T0, failed());
    match d.on_filed(id, true) {
        PromiseOrValue::Value(AskResult::Loan { status, proposal_id, .. }) => {
            assert_eq!((status, proposal_id), (LoanStatus::Refused, None));
        }
        _ => panic!("a refused filing must not vote"),
    }
    untouched(&d, "ada.testnet");
    assert_eq!(d.book, 0);
}

#[test]
fn an_unparsable_add_proposal_result_is_treated_as_a_refusal() {
    let mut d = with_members(&["ada.testnet"]);
    at(&acc("ada.testnet"), T0, 0, vec![]);
    let _ = d.ask(U128(3 * NEAR));
    let id = last_loan(&d).id;
    as_desk(T0, vec![PromiseResult::Successful(b"\"not an id\"".to_vec())]);
    let _ = d.on_filed(id, true);
    assert_eq!(d.loan(id).status, LoanStatus::Refused);
    untouched(&d, "ada.testnet");
    assert_eq!(d.book, 0);
}

#[test]
fn a_successful_filing_votes_on_the_returned_id_only() {
    let mut d = with_members(&["ada.testnet"]);
    at(&acc("ada.testnet"), T0, 0, vec![]);
    let _ = d.ask(U128(3 * NEAR));
    let id = last_loan(&d).id;
    as_desk(T0, ok_u64(77));
    match d.on_filed(id, true) {
        PromiseOrValue::Promise(_) => {}
        PromiseOrValue::Value(v) => panic!("expected a vote, got {v:?}"),
    }
    assert_eq!(d.loan(id).proposal_id, Some(77));
    assert_eq!(d.loan(id).status, LoanStatus::Voting);
}

#[test]
fn act_proposal_failing_moves_the_loan_to_the_council_lane_with_reservations_released() {
    let mut d = with_members(&["ada.testnet"]);
    at(&acc("ada.testnet"), T0, 0, vec![]);
    let _ = d.ask(U128(3 * NEAR));
    let id = last_loan(&d).id;
    as_desk(T0, ok_u64(77));
    let _ = d.on_filed(id, true);
    as_desk(T0, failed());
    let _ = d.on_voted(id);
    let loan = d.loan(id);
    assert_eq!((loan.status, loan.lane, loan.borrower_part, loan.pledge), (LoanStatus::AwaitingCouncil, Lane::Council, 0, 0));
    assert_eq!(loan.proposal_id, Some(77));
    assert_eq!(member(&d, "ada.testnet").drawn, 0);
    assert_eq!(member(&d, "ada.testnet").open_loans, 1, "still open: the council may fund it");
    assert_eq!(d.book, 0);
}

#[test]
fn callbacks_replayed_on_a_settled_loan_change_nothing() {
    let mut d = with_members(&["ada.testnet"]);
    let id = active_loan(&mut d, "ada.testnet", 3 * NEAR, T0, 41);
    as_desk(T0, ok_u64(99));
    let _ = d.on_filed(id, true);
    as_desk(T0, failed());
    let _ = d.on_voted(id);
    assert_eq!(d.loan(id).status, LoanStatus::Active);
    assert_eq!(d.loan(id).proposal_id, Some(41));
    assert_eq!(d.book, 3 * NEAR);
}

#[test]
#[should_panic(expected = "ERR_CALLBACK_ONLY")]
fn on_filed_is_private() {
    let mut d = with_members(&["ada.testnet"]);
    at(&acc("ada.testnet"), T0, 0, ok_u64(1));
    let _ = d.on_filed(0, true);
}

#[test]
#[should_panic(expected = "ERR_CALLBACK_ONLY")]
fn on_voted_is_private() {
    let mut d = with_members(&["ada.testnet"]);
    at(&acc("ada.testnet"), T0, 0, ok_empty());
    let _ = d.on_voted(0);
}

#[test]
#[should_panic(expected = "ERR_BOOK_FULL")]
fn an_ask_within_standing_but_over_the_book_cap_panics() {
    let mut d = with_members(&["ada.testnet", "bayo.testnet", "chidi.testnet", "dayo.testnet"]);
    active_loan(&mut d, "ada.testnet", 4 * NEAR, T0, 1);
    active_loan(&mut d, "bayo.testnet", 4 * NEAR, T0, 2);
    active_loan(&mut d, "chidi.testnet", 4 * NEAR, T0, 3);
    at(&acc("dayo.testnet"), T0, 0, vec![]);
    let _ = d.ask(U128(NEAR));
}

#[test]
fn an_ask_above_standing_is_held_with_its_gap() {
    let mut d = with_members(&["ada.testnet"]);
    at(&acc("ada.testnet"), T0, 0, vec![]);
    match d.ask(U128(6 * NEAR)) {
        PromiseOrValue::Value(AskResult::Held { gap, expires_at_ms }) => {
            assert_eq!(gap, U128(2 * NEAR));
            assert_eq!(expires_at_ms, (T0 + 600) * 1000);
        }
        _ => panic!("expected a held request"),
    }
    assert_eq!(d.loans.len(), 0);
    assert_eq!(d.book, 0);
    untouched(&d, "ada.testnet");
    assert_eq!(d.requests.get(&acc("ada.testnet")).map(|r| r.amount), Some(6 * NEAR));
}

#[test]
#[should_panic(expected = "ERR_REQUEST_OPEN")]
fn a_second_ask_while_a_request_is_open_panics() {
    let mut d = with_members(&["ada.testnet"]);
    at(&acc("ada.testnet"), T0, 0, vec![]);
    let _ = d.ask(U128(6 * NEAR));
    at(&acc("ada.testnet"), T0 + 10, 0, vec![]);
    let _ = d.ask(U128(NEAR));
}

#[test]
fn an_expired_request_is_dropped_by_the_next_ask() {
    let mut d = with_members(&["ada.testnet"]);
    at(&acc("ada.testnet"), T0, 0, vec![]);
    let _ = d.ask(U128(6 * NEAR));
    at(&acc("ada.testnet"), T0 + 601, 0, vec![]);
    let _ = d.ask(U128(NEAR));
    assert!(d.requests.get(&acc("ada.testnet")).is_none());
    assert_eq!(last_loan(&d).principal, NEAR);
}

#[test]
#[should_panic(expected = "ERR_TOO_LARGE_FOR_COSIGN")]
fn a_gap_larger_than_max_standing_must_go_to_the_council() {
    let mut d = with_members(&["ada.testnet"]);
    at(&acc("ada.testnet"), T0, 0, vec![]);
    let _ = d.ask(U128(15 * NEAR));
}

#[test]
#[should_panic(expected = "ERR_ZERO_AMOUNT")]
fn a_zero_ask_panics() {
    let mut d = with_members(&["ada.testnet"]);
    at(&acc("ada.testnet"), T0, 0, vec![]);
    let _ = d.ask(U128(0));
}

#[test]
#[should_panic(expected = "ERR_NOT_MEMBER")]
fn a_stranger_cannot_ask() {
    let mut d = with_members(&["ada.testnet"]);
    at(&acc("eve.testnet"), T0, 0, vec![]);
    let _ = d.ask(U128(NEAR));
}
```

- [ ] **Step 2: Append the standing-lane driver to the end of `contract/desk/src/tests/common.rs`**

```rust
/// Drives a standing-lane ask through add_proposal (id `proposal_id`) and a successful vote: returns the loan id.
pub fn active_loan(d: &mut Desk, borrower: &str, amount: u128, sec: u64, proposal_id: u64) -> u64 {
    at(&acc(borrower), sec, 0, vec![]);
    let _ = d.ask(U128(amount));
    let id = last_loan(d).id;
    as_desk(sec, ok_u64(proposal_id));
    let _ = d.on_filed(id, true);
    as_desk(sec, ok_empty());
    let _ = d.on_voted(id);
    id
}
```

- [ ] **Step 3: Run to confirm it fails**

Run: `npm run cargo -- test --manifest-path contract/desk/Cargo.toml tests::ask_chain::`
Expected: FAIL — compile error "no method named ask found for struct Desk"

- [ ] **Step 4: Implement (replace the stub `contract/desk/src/lending.rs`)**

`contract/desk/src/lending.rs`:
```rust
//! The ask chain: reserve, then file. `file_transfer` is the ONE routine that calls Sputnik's write methods,
//! and the desk votes only on the proposal id returned by its own `add_proposal` call.
use near_sdk::json_types::U128;
use near_sdk::{env, near, require, AccountId, NearToken, Promise, PromiseOrValue};

use crate::errors::{ERR_BOOK_FULL, ERR_REQUEST_OPEN, ERR_TOO_LARGE_FOR_COSIGN, ERR_VISITOR_LOAN_LIMIT, ERR_VISITOR_SEAT_EXPIRED, ERR_ZERO_AMOUNT};
use crate::gas::{GAS_ACT_PROPOSAL, GAS_ADD_PROPOSAL, GAS_ON_FILED, GAS_ON_VOTED};
use crate::sputnik;
use crate::types::{AskResult, Lane, Loan, LoanStatus, Member, Request};
use crate::{Desk, DeskExt, NS_PER_MS};

pub const VISITOR_MAX_LOANS: u32 = 3;

impl Desk {
    pub(crate) fn check_visitor_can_borrow(&self, member: &Member, now: u64) {
        if let Some(seat) = &member.visitor {
            let ends = seat.joined_at.saturating_add(Self::secs(self.params.visitor_window_sec));
            require!(now < ends, ERR_VISITOR_SEAT_EXPIRED);
            require!(seat.loans_taken < VISITOR_MAX_LOANS, ERR_VISITOR_LOAN_LIMIT);
        }
    }

    /// Creates the loan record and reserves everything it needs BEFORE any cross-contract call.
    #[allow(clippy::too_many_arguments)]
    pub(crate) fn open_loan(
        &mut self,
        borrower: &AccountId,
        principal: u128,
        borrower_part: u128,
        cosigner: Option<AccountId>,
        pledge: u128,
        lane: Lane,
        now: u64,
    ) -> u64 {
        let id = u64::from(self.loans.len());
        let mut b = self.member(borrower);
        b.open_loans += 1;
        if lane != Lane::Council {
            b.drawn += borrower_part;
            self.book += principal;
            if let Some(seat) = b.visitor.as_mut() {
                seat.loans_taken += 1;
            }
        }
        self.put_member(borrower, b);
        if let Some(c) = &cosigner {
            let mut cm = self.member(c);
            cm.pledged += pledge;
            self.put_member(c, cm);
        }
        self.loans.push(Loan {
            id,
            borrower: borrower.clone(),
            principal,
            borrower_part,
            cosigner,
            pledge,
            lane,
            status: LoanStatus::Filing,
            proposal_id: None,
            created_at: now,
            due_at: 0,
            closed_at: 0,
        });
        id
    }

    /// Whether the loan currently holds a reservation (book room, drawn standing, a pledge).
    pub(crate) fn holds_reservation(loan: &Loan) -> bool {
        match loan.lane {
            Lane::Council => loan.status == LoanStatus::Active,
            Lane::Standing | Lane::Cosigned => {
                matches!(loan.status, LoanStatus::Filing | LoanStatus::Voting | LoanStatus::Active)
            }
        }
    }

    /// Undoes exactly what `open_loan` (or a council activation) reserved. Call BEFORE changing the status.
    pub(crate) fn release(&mut self, loan: &Loan) {
        if !Self::holds_reservation(loan) {
            return;
        }
        self.book = self.book.saturating_sub(loan.principal);
        if loan.borrower_part > 0 {
            if let Some(mut b) = self.members.get(&loan.borrower).cloned() {
                b.drawn = b.drawn.saturating_sub(loan.borrower_part);
                self.put_member(&loan.borrower, b);
            }
        }
        if loan.pledge > 0 {
            if let Some(c) = &loan.cosigner {
                if let Some(mut cm) = self.members.get(c).cloned() {
                    cm.pledged = cm.pledged.saturating_sub(loan.pledge);
                    self.put_member(c, cm);
                }
            }
        }
    }

    /// Moves a loan to a terminal status and frees the borrower's open-loan slot.
    pub(crate) fn close(&mut self, loan_id: u64, status: LoanStatus) {
        let mut loan = self.loan(loan_id);
        loan.status = status;
        loan.closed_at = Self::now();
        let borrower = loan.borrower.clone();
        self.put_loan(loan);
        if let Some(mut b) = self.members.get(&borrower).cloned() {
            b.open_loans = b.open_loans.saturating_sub(1);
            self.put_member(&borrower, b);
        }
    }

    pub(crate) fn outcome(loan: &Loan) -> AskResult {
        AskResult::Loan { loan_id: loan.id, status: loan.status, proposal_id: loan.proposal_id }
    }

    /// THE core routine (security-reviewed): files a Transfer of the loan's principal to the borrower on the DAO,
    /// attaching exactly the policy bond, then hands the returned id to `on_filed`.
    pub(crate) fn file_transfer(&mut self, loan_id: u64, approve: bool) -> Promise {
        let loan = self.loan(loan_id);
        Promise::new(self.dao.clone())
            .function_call(
                "add_proposal",
                sputnik::add_proposal_args(&loan),
                NearToken::from_yoctonear(self.params.proposal_bond.0),
                GAS_ADD_PROPOSAL,
            )
            .then(Self::ext(env::current_account_id()).with_static_gas(GAS_ON_FILED).on_filed(loan_id, approve))
    }
}

#[near]
impl Desk {
    /// Within unused standing and the book cap: filed and approved now (standing lane).
    /// Above unused standing: held as a request that needs `gap` co-signed (D1, D4).
    pub fn ask(&mut self, amount: U128) -> PromiseOrValue<AskResult> {
        let borrower = env::predecessor_account_id();
        let amount = amount.0;
        require!(amount > 0, ERR_ZERO_AMOUNT);
        let member = self.member(&borrower);
        let now = Self::now();
        self.check_visitor_can_borrow(&member, now);
        if let Some(open) = self.requests.get(&borrower) {
            require!(open.expires_at <= now, ERR_REQUEST_OPEN);
        }
        self.requests.remove(&borrower);
        let unused = member.unused();
        if amount <= unused {
            require!(self.book.saturating_add(amount) <= self.params.book_cap.0, ERR_BOOK_FULL);
            let loan_id = self.open_loan(&borrower, amount, amount, None, 0, Lane::Standing, now);
            env::log_str(&format!("fiador: loan #{} of {} for {} within standing; filing", loan_id, amount, borrower));
            return PromiseOrValue::Promise(self.file_transfer(loan_id, true));
        }
        let gap = amount - unused;
        require!(gap <= self.params.max_standing.0, ERR_TOO_LARGE_FOR_COSIGN);
        let expires_at = now.saturating_add(Self::secs(self.params.request_ttl_sec));
        self.requests.insert(borrower.clone(), Request { amount, created_at: now, expires_at });
        env::log_str(&format!("fiador: holding {}'s request for {}: needs {} co-signed", borrower, amount, gap));
        PromiseOrValue::Value(AskResult::Held { gap: U128(gap), expires_at_ms: expires_at / NS_PER_MS })
    }

    #[private]
    pub fn on_filed(&mut self, loan_id: u64, approve: bool) -> PromiseOrValue<AskResult> {
        Self::require_callback();
        let mut loan = self.loan(loan_id);
        if loan.status != LoanStatus::Filing {
            return PromiseOrValue::Value(Self::outcome(&loan));
        }
        let Some(proposal_id) = sputnik::read_u64_result() else {
            self.release(&loan);
            if loan.lane != Lane::Council {
                if let Some(mut b) = self.members.get(&loan.borrower).cloned() {
                    if let Some(seat) = b.visitor.as_mut() {
                        seat.loans_taken = seat.loans_taken.saturating_sub(1);
                    }
                    self.put_member(&loan.borrower, b);
                }
            }
            self.close(loan_id, LoanStatus::Refused);
            env::log_str(&format!("fiador: loan #{} refused: the DAO did not accept the proposal", loan_id));
            return PromiseOrValue::Value(Self::outcome(&self.loan(loan_id)));
        };
        loan.proposal_id = Some(proposal_id);
        if !approve {
            loan.status = LoanStatus::AwaitingCouncil;
            self.put_loan(loan.clone());
            env::log_str(&format!("fiador: loan #{} filed as proposal {} for a council vote", loan_id, proposal_id));
            return PromiseOrValue::Value(Self::outcome(&loan));
        }
        loan.status = LoanStatus::Voting;
        self.put_loan(loan.clone());
        PromiseOrValue::Promise(
            Promise::new(self.dao.clone())
                .function_call(
                    "act_proposal",
                    sputnik::act_proposal_args(proposal_id, &loan),
                    NearToken::from_yoctonear(0),
                    GAS_ACT_PROPOSAL,
                )
                .then(Self::ext(env::current_account_id()).with_static_gas(GAS_ON_VOTED).on_voted(loan_id)),
        )
    }

    #[private]
    pub fn on_voted(&mut self, loan_id: u64) -> AskResult {
        Self::require_callback();
        let mut loan = self.loan(loan_id);
        if loan.status != LoanStatus::Voting {
            return Self::outcome(&loan);
        }
        if sputnik::promise_ok() {
            loan.status = LoanStatus::Active;
            loan.due_at = Self::now().saturating_add(Self::secs(self.params.loan_term_sec));
            self.put_loan(loan.clone());
            env::log_str(&format!("fiador: loan #{} approved by the desk; the DAO pays {}", loan_id, loan.borrower));
        } else {
            // D27: the vote failed, so the proposal falls back to the council lane and every reservation is released.
            self.release(&loan);
            loan.lane = Lane::Council;
            loan.borrower_part = 0;
            loan.pledge = 0;
            loan.status = LoanStatus::AwaitingCouncil;
            self.put_loan(loan.clone());
            env::log_str(&format!("fiador: loan #{} vote failed; it now waits for a council vote", loan_id));
        }
        Self::outcome(&loan)
    }
}
```

- [ ] **Step 5: Run the gate**

Run: `npm run cargo -- test --manifest-path contract/desk/Cargo.toml tests::ask_chain::`
Expected: PASS — `test result: ok. 16 passed; 0 failed`

- [ ] **Step 6: Commit (kernel-performed — no agent runs this)**
Message: `feat(desk): ask chain and the file-and-approve core`

---

### Task 25: Co-signing a held request, and cancelling it

**Files:**
- Modify: `contract/desk/src/requests.rs`
- Modify: `contract/desk/src/tests/common.rs`
- Test: `contract/desk/src/tests/cosign.rs`

**Depends on:** Task 24
**Effort:** high
**Model tier:** top
**Requires:** `contract/desk: ask(amount: U128) -> PromiseOrValue<AskResult>; callbacks on_filed(loan_id: u64, approve: bool), on_voted(loan_id: u64)`, `contract/desk/src/lending.rs: open_loan, holds_reservation, release, close, outcome, check_visitor_can_borrow, file_transfer (the one routine that writes to Sputnik), VISITOR_MAX_LOANS = 3`, `contract/desk/src/tests/common.rs: active_loan(d: &mut Desk, borrower: &str, amount: u128, sec: u64, proposal_id: u64) -> u64`
**Provides:** `contract/desk: cosign(borrower: AccountId, max_pledge: U128) -> PromiseOrValue<AskResult>; cancel_request()`, `contract/desk/src/tests/common.rs: active_cosigned_loan(d: &mut Desk, borrower: &str, cosigner: &str, amount: u128, sec: u64, proposal_id: u64) -> u64`

Context: the crate (Task 21) defines, in `contract/desk/src/types.rs`, `Params`, `Member { standing, drawn, pledged, open_loans, visitor: Option<Seat>, repaid_on_time, defaults }` with `Member::new(standing, visitor)` and `Member::unused()`, `Seat { joined_at, deposit, loans_taken }`, `Request { amount, created_at, expires_at }`, `Lane`, `LoanStatus`, `Loan`, `AskResult`, `ReadPurpose` and the view structs; `contract/desk/src/lib.rs` defines `Desk { dao, params, members: IterableMap<AccountId, Member>, loans: Vector<Loan>, requests: IterableMap<AccountId, Request>, book: u128 }` and the helpers `Desk::now()`, `Desk::secs(sec)`, `self.require_dao()`, `Desk::require_callback()`, `self.member(&id)` (panics ERR_NOT_MEMBER), `self.put_member(&id, m)`, `self.loan(id)` (panics ERR_LOAN_NOT_FOUND), `self.put_loan(loan)`, constants `NS_PER_SEC`, `NS_PER_MS`; `contract/desk/src/errors.rs` holds every `ERR_*` string and `contract/desk/src/gas.rs` the gas constants. Every `#[near] impl Desk` block outside lib.rs must `use crate::{Desk, DeskExt};`. Unit tests call methods directly, so near-sdk's `#[private]` is NOT enforced in them; callbacks therefore also call `Desk::require_callback()` (ERR_CALLBACK_ONLY), which the tests exercise. Storage persists across `testing_env!` calls inside one test, so a test builds exactly one `Desk`. From Task 24 (`crate::lending`, methods on `Desk`): `self.open_loan(&borrower, principal, borrower_part, cosigner: Option<AccountId>, pledge, lane, now) -> u64` reserves drawn/pledge/book; `self.file_transfer(loan_id, approve: bool) -> Promise` is the core routine; `self.check_visitor_can_borrow(&member, now)`. D1-D3, D25, D26: one co-signer covers the WHOLE current gap in one call; the co-signer must not be the borrower or a visitor; the request is consumed and the loan filed and approved inside the co-signer's call; an expired request panics `ERR_REQUEST_EXPIRED` (a panic cannot delete it; the borrower's next ask or cancel drops it).

- [ ] **Step 1: Write the failing tests (replace the stub `contract/desk/src/tests/cosign.rs`)**

`contract/desk/src/tests/cosign.rs`:
```rust
use near_sdk::json_types::U128;
use near_sdk::PromiseOrValue;

use super::common::*;
use crate::types::{Lane, LoanStatus, Member};

fn held(d: &mut crate::Desk, borrower: &str, amount: u128) {
    at(&acc(borrower), T0, 0, vec![]);
    let _ = d.ask(U128(amount));
}

#[test]
fn the_money_shot_cosign_reserves_both_sides_and_files_in_the_cosigners_call() {
    let mut d = with_members(&["ada.testnet", "bayo.testnet"]);
    held(&mut d, "ada.testnet", 6 * NEAR);
    at(&acc("bayo.testnet"), T0 + 5, 0, vec![]);
    match d.cosign(acc("ada.testnet"), U128(2 * NEAR)) {
        PromiseOrValue::Promise(_) => {}
        PromiseOrValue::Value(v) => panic!("expected the filing chain, got {v:?}"),
    }
    let loan = last_loan(&d);
    assert_eq!((loan.lane, loan.principal, loan.borrower_part, loan.pledge), (Lane::Cosigned, 6 * NEAR, 4 * NEAR, 2 * NEAR));
    assert_eq!(loan.cosigner, Some(acc("bayo.testnet")));
    assert_eq!(member(&d, "ada.testnet").drawn, 4 * NEAR);
    assert_eq!(member(&d, "bayo.testnet").pledged, 2 * NEAR);
    assert_eq!(d.book, 6 * NEAR);
    assert!(d.requests.get(&acc("ada.testnet")).is_none(), "the request is consumed");
}

#[test]
fn a_cosigned_filing_that_fails_rolls_back_both_reservations() {
    let mut d = with_members(&["ada.testnet", "bayo.testnet"]);
    held(&mut d, "ada.testnet", 6 * NEAR);
    at(&acc("bayo.testnet"), T0, 0, vec![]);
    let _ = d.cosign(acc("ada.testnet"), U128(2 * NEAR));
    let id = last_loan(&d).id;
    as_desk(T0, failed());
    let _ = d.on_filed(id, true);
    assert_eq!(d.loan(id).status, LoanStatus::Refused);
    assert_eq!(member(&d, "ada.testnet"), Member::new(4 * NEAR, None));
    assert_eq!(member(&d, "bayo.testnet"), Member::new(4 * NEAR, None));
    assert_eq!(d.book, 0);
}

#[test]
fn a_cosigned_vote_that_fails_releases_the_pledge_and_goes_to_the_council() {
    let mut d = with_members(&["ada.testnet", "bayo.testnet"]);
    held(&mut d, "ada.testnet", 6 * NEAR);
    at(&acc("bayo.testnet"), T0, 0, vec![]);
    let _ = d.cosign(acc("ada.testnet"), U128(2 * NEAR));
    let id = last_loan(&d).id;
    as_desk(T0, ok_u64(12));
    let _ = d.on_filed(id, true);
    as_desk(T0, failed());
    let _ = d.on_voted(id);
    let loan = d.loan(id);
    assert_eq!((loan.status, loan.lane, loan.pledge), (LoanStatus::AwaitingCouncil, Lane::Council, 0));
    assert_eq!(member(&d, "bayo.testnet").pledged, 0);
    assert_eq!(member(&d, "ada.testnet").drawn, 0);
    assert_eq!(d.book, 0);
}

#[test]
fn the_full_cosigned_chain_ends_active() {
    let mut d = with_members(&["ada.testnet", "bayo.testnet"]);
    let id = active_cosigned_loan(&mut d, "ada.testnet", "bayo.testnet", 6 * NEAR, T0, 8);
    assert_eq!(d.loan(id).status, LoanStatus::Active);
    assert_eq!(d.loan(id).proposal_id, Some(8));
}

#[test]
#[should_panic(expected = "ERR_SELF_COSIGN")]
fn a_borrower_cannot_cosign_their_own_request() {
    let mut d = with_members(&["ada.testnet"]);
    held(&mut d, "ada.testnet", 6 * NEAR);
    let _ = d.cosign(acc("ada.testnet"), U128(2 * NEAR));
}

#[test]
#[should_panic(expected = "ERR_NO_REQUEST")]
fn cosigning_without_a_request_panics() {
    let mut d = with_members(&["ada.testnet", "bayo.testnet"]);
    at(&acc("bayo.testnet"), T0, 0, vec![]);
    let _ = d.cosign(acc("ada.testnet"), U128(2 * NEAR));
}

#[test]
#[should_panic(expected = "ERR_REQUEST_EXPIRED")]
fn cosigning_an_expired_request_panics() {
    let mut d = with_members(&["ada.testnet", "bayo.testnet"]);
    held(&mut d, "ada.testnet", 6 * NEAR);
    at(&acc("bayo.testnet"), T0 + 600, 0, vec![]);
    let _ = d.cosign(acc("ada.testnet"), U128(2 * NEAR));
}

#[test]
#[should_panic(expected = "ERR_PLEDGE_CAP")]
fn the_gap_must_fit_the_cosigners_cap() {
    let mut d = with_members(&["ada.testnet", "bayo.testnet"]);
    held(&mut d, "ada.testnet", 6 * NEAR);
    at(&acc("bayo.testnet"), T0, 0, vec![]);
    let _ = d.cosign(acc("ada.testnet"), U128(NEAR));
}

#[test]
#[should_panic(expected = "ERR_COSIGNER_SHORT")]
fn the_gap_must_fit_the_cosigners_unused_standing() {
    let mut d = with_members(&["ada.testnet", "bayo.testnet"]);
    held(&mut d, "ada.testnet", 9 * NEAR);
    at(&acc("bayo.testnet"), T0, 0, vec![]);
    let _ = d.cosign(acc("ada.testnet"), U128(5 * NEAR));
}

#[test]
#[should_panic(expected = "ERR_NO_GAP")]
fn there_is_nothing_to_cosign_once_the_borrower_has_enough() {
    let mut d = with_members(&["ada.testnet", "bayo.testnet"]);
    held(&mut d, "ada.testnet", 6 * NEAR);
    let mut ada = member(&d, "ada.testnet");
    ada.standing = 7 * NEAR;
    d.put_member(&acc("ada.testnet"), ada);
    at(&acc("bayo.testnet"), T0, 0, vec![]);
    let _ = d.cosign(acc("ada.testnet"), U128(2 * NEAR));
}

#[test]
#[should_panic(expected = "ERR_BOOK_FULL")]
fn a_cosigned_loan_must_fit_the_book_cap() {
    let mut d = with_members(&["ada.testnet", "bayo.testnet", "chidi.testnet", "dayo.testnet"]);
    active_loan(&mut d, "chidi.testnet", 4 * NEAR, T0, 1);
    active_loan(&mut d, "dayo.testnet", 4 * NEAR, T0, 2);
    held(&mut d, "ada.testnet", 6 * NEAR);
    at(&acc("bayo.testnet"), T0, 0, vec![]);
    let _ = d.cosign(acc("ada.testnet"), U128(2 * NEAR));
}

#[test]
fn a_borrower_can_cancel_their_request() {
    let mut d = with_members(&["ada.testnet"]);
    held(&mut d, "ada.testnet", 6 * NEAR);
    d.cancel_request();
    assert!(d.requests.get(&acc("ada.testnet")).is_none());
}

#[test]
#[should_panic(expected = "ERR_NO_REQUEST")]
fn cancelling_nothing_panics() {
    let mut d = with_members(&["ada.testnet"]);
    at(&acc("ada.testnet"), T0, 0, vec![]);
    d.cancel_request();
}
```

- [ ] **Step 2: Append the co-signed driver to the end of `contract/desk/src/tests/common.rs`**

```rust
/// Ada asks `amount` above her standing, Bayo co-signs the gap, and the chain succeeds: returns the loan id.
pub fn active_cosigned_loan(d: &mut Desk, borrower: &str, cosigner: &str, amount: u128, sec: u64, proposal_id: u64) -> u64 {
    at(&acc(borrower), sec, 0, vec![]);
    let _ = d.ask(U128(amount));
    at(&acc(cosigner), sec, 0, vec![]);
    let _ = d.cosign(acc(borrower), U128(amount));
    let id = last_loan(d).id;
    as_desk(sec, ok_u64(proposal_id));
    let _ = d.on_filed(id, true);
    as_desk(sec, ok_empty());
    let _ = d.on_voted(id);
    id
}
```

- [ ] **Step 3: Run to confirm it fails**

Run: `npm run cargo -- test --manifest-path contract/desk/Cargo.toml tests::cosign::`
Expected: FAIL — compile error "no method named cosign found for struct Desk"

- [ ] **Step 4: Implement (replace the stub `contract/desk/src/requests.rs`)**

`contract/desk/src/requests.rs`:
```rust
//! Co-signing (D1-D3): one co-signer covers a held request's whole gap in one call, and the loan is filed
//! and approved inside the co-signer's transaction. No pledge exists until that call.
use near_sdk::json_types::U128;
use near_sdk::{env, near, require, AccountId, PromiseOrValue};

use crate::errors::{
    ERR_BOOK_FULL, ERR_COSIGNER_SHORT, ERR_NO_GAP, ERR_NO_REQUEST, ERR_PLEDGE_CAP, ERR_REQUEST_EXPIRED, ERR_SELF_COSIGN,
    ERR_VISITOR_CANNOT_COSIGN,
};
use crate::types::{AskResult, Lane};
use crate::{Desk, DeskExt};

#[near]
impl Desk {
    pub fn cosign(&mut self, borrower: AccountId, max_pledge: U128) -> PromiseOrValue<AskResult> {
        let cosigner = env::predecessor_account_id();
        require!(cosigner != borrower, ERR_SELF_COSIGN);
        let c = self.member(&cosigner);
        require!(c.visitor.is_none(), ERR_VISITOR_CANNOT_COSIGN);
        let now = Self::now();
        let request = self.requests.get(&borrower).cloned().unwrap_or_else(|| env::panic_str(ERR_NO_REQUEST));
        require!(request.expires_at > now, ERR_REQUEST_EXPIRED);
        let b = self.member(&borrower);
        self.check_visitor_can_borrow(&b, now);
        let unused = b.unused();
        require!(request.amount > unused, ERR_NO_GAP);
        let gap = request.amount - unused;
        require!(gap <= max_pledge.0, ERR_PLEDGE_CAP);
        require!(gap <= c.unused(), ERR_COSIGNER_SHORT);
        require!(self.book.saturating_add(request.amount) <= self.params.book_cap.0, ERR_BOOK_FULL);
        self.requests.remove(&borrower);
        let loan_id = self.open_loan(&borrower, request.amount, unused, Some(cosigner.clone()), gap, Lane::Cosigned, now);
        env::log_str(&format!("fiador: {} co-signed {} for {}'s loan #{}; filing", cosigner, gap, borrower, loan_id));
        PromiseOrValue::Promise(self.file_transfer(loan_id, true))
    }

    pub fn cancel_request(&mut self) {
        let borrower = env::predecessor_account_id();
        require!(self.requests.remove(&borrower).is_some(), ERR_NO_REQUEST);
        env::log_str(&format!("fiador: {} cancelled their request", borrower));
    }
}
```

- [ ] **Step 5: Run the gate**

Run: `npm run cargo -- test --manifest-path contract/desk/Cargo.toml tests::cosign::`
Expected: PASS — `test result: ok. 13 passed; 0 failed`

- [ ] **Step 6: Commit (kernel-performed — no agent runs this)**
Message: `feat(desk): co-signing and request cancel`

---

### Task 26: Repayment and deterministic settlement

**Files:**
- Modify: `contract/desk/src/repay.rs`
- Test: `contract/desk/src/tests/repay.rs`

**Depends on:** Task 25
**Effort:** xhigh
**Model tier:** top
**Requires:** `contract/desk: cosign(borrower: AccountId, max_pledge: U128) -> PromiseOrValue<AskResult>; cancel_request()`, `contract/desk/src/tests/common.rs: active_cosigned_loan(d: &mut Desk, borrower: &str, cosigner: &str, amount: u128, sec: u64, proposal_id: u64) -> u64`
**Provides:** `contract/desk: repay(loan_id: u64) -> Promise, payable: exact principal, Active loans only; forwards the principal to the DAO`, `contract/desk/src/repay.rs: settle(&Loan, now) -> LoanStatus, reward(&Loan), apply_default(&Loan)`

Context: the crate (Task 21) defines, in `contract/desk/src/types.rs`, `Params`, `Member { standing, drawn, pledged, open_loans, visitor: Option<Seat>, repaid_on_time, defaults }` with `Member::new(standing, visitor)` and `Member::unused()`, `Seat { joined_at, deposit, loans_taken }`, `Request { amount, created_at, expires_at }`, `Lane`, `LoanStatus`, `Loan`, `AskResult`, `ReadPurpose` and the view structs; `contract/desk/src/lib.rs` defines `Desk { dao, params, members: IterableMap<AccountId, Member>, loans: Vector<Loan>, requests: IterableMap<AccountId, Request>, book: u128 }` and the helpers `Desk::now()`, `Desk::secs(sec)`, `self.require_dao()`, `Desk::require_callback()`, `self.member(&id)` (panics ERR_NOT_MEMBER), `self.put_member(&id, m)`, `self.loan(id)` (panics ERR_LOAN_NOT_FOUND), `self.put_loan(loan)`, constants `NS_PER_SEC`, `NS_PER_MS`; `contract/desk/src/errors.rs` holds every `ERR_*` string and `contract/desk/src/gas.rs` the gas constants. Every `#[near] impl Desk` block outside lib.rs must `use crate::{Desk, DeskExt};`. Unit tests call methods directly, so near-sdk's `#[private]` is NOT enforced in them; callbacks therefore also call `Desk::require_callback()` (ERR_CALLBACK_ONLY), which the tests exercise. Storage persists across `testing_env!` calls inside one test, so a test builds exactly one `Desk`. From Task 24, `self.release(&loan)` undoes a loan's reservations (call it BEFORE changing the status) and `self.close(loan_id, status)` sets a terminal status and frees the open-loan slot. D9, D10, D18, D23: settle by the timestamp of the repay call: `now <= due_at` → `Repaid`, borrower +min(step, principal) and co-signer +min(step, pledge), both capped at `max_standing` (never lowering a standing already above max); `due_at < now <= due_at + grace` → `RepaidLate`, no change; later → `Defaulted` (borrower standing 0, defaults +1, co-signer −pledge) but the money is still forwarded. Every refusal is a panic (`ERR_LOAN_NOT_FOUND`, `ERR_LOAN_NOT_ACTIVE`, `ERR_WRONG_REPAY_AMOUNT`), which refunds the attached deposit; each branch has a test.

- [ ] **Step 1: Write the failing tests (replace the stub `contract/desk/src/tests/repay.rs`)**

`contract/desk/src/tests/repay.rs`:
```rust
//! D10 settlement at the three timings, and every refusal branch (each panics, so the runtime refunds).
use super::common::*;
use crate::types::LoanStatus;

#[test]
fn an_on_time_repayment_grows_both_standings_and_forwards_the_money_to_the_dao() {
    let mut d = with_members(&["ada.testnet", "bayo.testnet"]);
    let id = active_cosigned_loan(&mut d, "ada.testnet", "bayo.testnet", 6 * NEAR, T0, 8);
    at(&acc("ada.testnet"), T0 + 60, 6 * NEAR, vec![]);
    let _ = d.repay(id);
    assert_eq!(d.loan(id).status, LoanStatus::Repaid);
    let ada = member(&d, "ada.testnet");
    let bayo = member(&d, "bayo.testnet");
    assert_eq!((ada.standing, ada.drawn, ada.open_loans, ada.repaid_on_time), (5 * NEAR, 0, 0, 1));
    assert_eq!((bayo.standing, bayo.pledged), (5 * NEAR, 0));
    assert_eq!(d.book, 0);
    assert_eq!(transfers_to(&dao_id()), vec![6 * NEAR]);
}

#[test]
fn growth_is_at_most_what_was_at_risk() {
    let mut d = with_members(&["ada.testnet"]);
    let id = active_loan(&mut d, "ada.testnet", NEAR / 100, T0, 8);
    at(&acc("ada.testnet"), T0 + 1, NEAR / 100, vec![]);
    let _ = d.repay(id);
    assert_eq!(member(&d, "ada.testnet").standing, 4 * NEAR + NEAR / 100);
}

#[test]
fn growth_stops_at_max_standing() {
    let mut d = with_members(&["ada.testnet"]);
    let mut ada = member(&d, "ada.testnet");
    ada.standing = 10 * NEAR - NEAR / 2;
    d.put_member(&acc("ada.testnet"), ada);
    let id = active_loan(&mut d, "ada.testnet", 2 * NEAR, T0, 8);
    at(&acc("ada.testnet"), T0 + 1, 2 * NEAR, vec![]);
    let _ = d.repay(id);
    assert_eq!(member(&d, "ada.testnet").standing, 10 * NEAR);
}

#[test]
fn a_repayment_within_grace_closes_with_no_gain_and_no_slash() {
    let mut d = with_members(&["ada.testnet", "bayo.testnet"]);
    let id = active_cosigned_loan(&mut d, "ada.testnet", "bayo.testnet", 6 * NEAR, T0, 8);
    at(&acc("ada.testnet"), T0 + 150, 6 * NEAR, vec![]);
    let _ = d.repay(id);
    assert_eq!(d.loan(id).status, LoanStatus::RepaidLate);
    assert_eq!(member(&d, "ada.testnet").standing, 4 * NEAR);
    assert_eq!(member(&d, "bayo.testnet").standing, 4 * NEAR);
    assert_eq!(member(&d, "bayo.testnet").pledged, 0);
    assert_eq!(transfers_to(&dao_id()), vec![6 * NEAR]);
}

#[test]
fn a_repayment_after_grace_returns_the_money_but_settles_as_a_default() {
    let mut d = with_members(&["ada.testnet", "bayo.testnet"]);
    let id = active_cosigned_loan(&mut d, "ada.testnet", "bayo.testnet", 6 * NEAR, T0, 8);
    at(&acc("ada.testnet"), T0 + 181, 6 * NEAR, vec![]);
    let _ = d.repay(id);
    assert_eq!(d.loan(id).status, LoanStatus::Defaulted);
    let ada = member(&d, "ada.testnet");
    assert_eq!((ada.standing, ada.defaults, ada.drawn), (0, 1, 0));
    assert_eq!(member(&d, "bayo.testnet").standing, 2 * NEAR);
    assert_eq!(member(&d, "bayo.testnet").pledged, 0);
    assert_eq!(d.book, 0);
    assert_eq!(transfers_to(&dao_id()), vec![6 * NEAR]);
}

#[test]
fn anyone_may_repay_on_a_borrowers_behalf() {
    let mut d = with_members(&["ada.testnet"]);
    let id = active_loan(&mut d, "ada.testnet", 2 * NEAR, T0, 8);
    at(&acc("friend.testnet"), T0 + 1, 2 * NEAR, vec![]);
    let _ = d.repay(id);
    assert_eq!(d.loan(id).status, LoanStatus::Repaid);
    assert_eq!(member(&d, "ada.testnet").standing, 5 * NEAR);
}

#[test]
#[should_panic(expected = "ERR_WRONG_REPAY_AMOUNT")]
fn repaying_too_little_panics_and_is_refunded() {
    let mut d = with_members(&["ada.testnet"]);
    let id = active_loan(&mut d, "ada.testnet", 2 * NEAR, T0, 8);
    at(&acc("ada.testnet"), T0 + 1, NEAR, vec![]);
    let _ = d.repay(id);
}

#[test]
#[should_panic(expected = "ERR_WRONG_REPAY_AMOUNT")]
fn repaying_too_much_panics_and_is_refunded() {
    let mut d = with_members(&["ada.testnet"]);
    let id = active_loan(&mut d, "ada.testnet", 2 * NEAR, T0, 8);
    at(&acc("ada.testnet"), T0 + 1, 3 * NEAR, vec![]);
    let _ = d.repay(id);
}

#[test]
#[should_panic(expected = "ERR_LOAN_NOT_ACTIVE")]
fn repaying_twice_panics_and_is_refunded() {
    let mut d = with_members(&["ada.testnet"]);
    let id = active_loan(&mut d, "ada.testnet", 2 * NEAR, T0, 8);
    at(&acc("ada.testnet"), T0 + 1, 2 * NEAR, vec![]);
    let _ = d.repay(id);
    at(&acc("ada.testnet"), T0 + 2, 2 * NEAR, vec![]);
    let _ = d.repay(id);
}

#[test]
#[should_panic(expected = "ERR_LOAN_NOT_ACTIVE")]
fn repaying_a_loan_still_in_flight_panics_and_is_refunded() {
    let mut d = with_members(&["ada.testnet"]);
    at(&acc("ada.testnet"), T0, 0, vec![]);
    let _ = d.ask(near_sdk::json_types::U128(2 * NEAR));
    let id = last_loan(&d).id;
    at(&acc("ada.testnet"), T0, 2 * NEAR, vec![]);
    let _ = d.repay(id);
}

#[test]
#[should_panic(expected = "ERR_LOAN_NOT_FOUND")]
fn repaying_an_unknown_loan_panics_and_is_refunded() {
    let mut d = with_members(&["ada.testnet"]);
    at(&acc("ada.testnet"), T0, NEAR, vec![]);
    let _ = d.repay(99);
}
```

- [ ] **Step 2: Run to confirm it fails**

Run: `npm run cargo -- test --manifest-path contract/desk/Cargo.toml tests::repay::`
Expected: FAIL — compile error "no method named repay found for struct Desk"

- [ ] **Step 3: Implement (replace the stub `contract/desk/src/repay.rs`)**

`contract/desk/src/repay.rs`:
```rust
//! Repayment (D10, D18): synchronous, exact principal, Active loans only. Every refusal is a panic, which makes
//! the runtime refund the attached NEAR. The money goes straight on to the DAO in the same chain.
use near_sdk::{env, near, require, NearToken, Promise};

use crate::errors::{ERR_LOAN_NOT_ACTIVE, ERR_WRONG_REPAY_AMOUNT};
use crate::types::{Loan, LoanStatus};
use crate::{Desk, DeskExt};

impl Desk {
    fn grow(&self, standing: u128, by: u128) -> u128 {
        let max = self.params.max_standing.0;
        if standing >= max {
            standing
        } else {
            standing.saturating_add(by).min(max)
        }
    }

    /// On time: the borrower gains min(step, principal), the co-signer min(step, pledge), both capped at max.
    pub(crate) fn reward(&mut self, loan: &Loan) {
        let step = self.params.growth_step.0;
        if let Some(mut b) = self.members.get(&loan.borrower).cloned() {
            b.standing = self.grow(b.standing, step.min(loan.principal));
            b.repaid_on_time += 1;
            self.put_member(&loan.borrower, b);
        }
        if loan.pledge > 0 {
            if let Some(c) = &loan.cosigner {
                if let Some(mut cm) = self.members.get(c).cloned() {
                    cm.standing = self.grow(cm.standing, step.min(loan.pledge));
                    self.put_member(c, cm);
                }
            }
        }
    }

    /// Default: the borrower's standing goes to 0; the co-signer loses exactly what they pledged.
    pub(crate) fn apply_default(&mut self, loan: &Loan) {
        if let Some(mut b) = self.members.get(&loan.borrower).cloned() {
            b.standing = 0;
            b.defaults += 1;
            self.put_member(&loan.borrower, b);
        }
        if loan.pledge > 0 {
            if let Some(c) = &loan.cosigner {
                if let Some(mut cm) = self.members.get(c).cloned() {
                    cm.standing = cm.standing.saturating_sub(loan.pledge);
                    self.put_member(c, cm);
                }
            }
        }
    }

    /// Deterministic by the repay call's timestamp, whoever calls mark_default first.
    pub(crate) fn settle(&mut self, loan: &Loan, now: u64) -> LoanStatus {
        self.release(loan);
        let grace_end = loan.due_at.saturating_add(Self::secs(self.params.grace_sec));
        let status = if now <= loan.due_at {
            self.reward(loan);
            LoanStatus::Repaid
        } else if now <= grace_end {
            LoanStatus::RepaidLate
        } else {
            self.apply_default(loan);
            LoanStatus::Defaulted
        };
        self.close(loan.id, status);
        status
    }
}

#[near]
impl Desk {
    #[payable]
    pub fn repay(&mut self, loan_id: u64) -> Promise {
        let loan = self.loan(loan_id);
        require!(loan.status == LoanStatus::Active, ERR_LOAN_NOT_ACTIVE);
        require!(env::attached_deposit().as_yoctonear() == loan.principal, ERR_WRONG_REPAY_AMOUNT);
        let status = self.settle(&loan, Self::now());
        env::log_str(&format!("fiador: loan #{} repaid ({:?}); {} forwarded to {}", loan_id, status, loan.principal, self.dao));
        Promise::new(self.dao.clone()).transfer(NearToken::from_yoctonear(loan.principal))
    }
}
```

- [ ] **Step 4: Run the gate**

Run: `npm run cargo -- test --manifest-path contract/desk/Cargo.toml tests::repay::`
Expected: PASS — `test result: ok. 11 passed; 0 failed`

- [ ] **Step 5: Commit (kernel-performed — no agent runs this)**
Message: `feat(desk): repayment and settlement`

---

### Task 27: Council lane, sync_loan and mark_default (reconciliation with Sputnik)

**Files:**
- Modify: `contract/desk/src/council.rs`
- Test: `contract/desk/src/tests/council.rs`

**Depends on:** Task 26
**Effort:** xhigh
**Model tier:** top
**Requires:** `contract/desk: repay(loan_id: u64) -> Promise, payable: exact principal, Active loans only; forwards the principal to the DAO`, `contract/desk/src/repay.rs: settle(&Loan, now) -> LoanStatus, reward(&Loan), apply_default(&Loan)`
**Provides:** `contract/desk: ask_council(amount: U128) -> PromiseOrValue<AskResult>; sync_loan(loan_id: u64) -> Promise; mark_default(loan_id: u64) -> Promise; callback on_proposal_read(loan_id: u64, purpose: ReadPurpose) -> LoanStatus`

Context: the crate (Task 21) defines, in `contract/desk/src/types.rs`, `Params`, `Member { standing, drawn, pledged, open_loans, visitor: Option<Seat>, repaid_on_time, defaults }` with `Member::new(standing, visitor)` and `Member::unused()`, `Seat { joined_at, deposit, loans_taken }`, `Request { amount, created_at, expires_at }`, `Lane`, `LoanStatus`, `Loan`, `AskResult`, `ReadPurpose` and the view structs; `contract/desk/src/lib.rs` defines `Desk { dao, params, members: IterableMap<AccountId, Member>, loans: Vector<Loan>, requests: IterableMap<AccountId, Request>, book: u128 }` and the helpers `Desk::now()`, `Desk::secs(sec)`, `self.require_dao()`, `Desk::require_callback()`, `self.member(&id)` (panics ERR_NOT_MEMBER), `self.put_member(&id, m)`, `self.loan(id)` (panics ERR_LOAN_NOT_FOUND), `self.put_loan(loan)`, constants `NS_PER_SEC`, `NS_PER_MS`; `contract/desk/src/errors.rs` holds every `ERR_*` string and `contract/desk/src/gas.rs` the gas constants. Every `#[near] impl Desk` block outside lib.rs must `use crate::{Desk, DeskExt};`. Unit tests call methods directly, so near-sdk's `#[private]` is NOT enforced in them; callbacks therefore also call `Desk::require_callback()` (ERR_CALLBACK_ONLY), which the tests exercise. Storage persists across `testing_env!` calls inside one test, so a test builds exactly one `Desk`. From Task 24: `self.open_loan(...)`, `self.file_transfer(loan_id, false)` (files without voting), `self.release(&loan)`, `self.close(loan_id, status)`; from Task 26: `self.apply_default(&loan)`; from Task 23: `sputnik::get_proposal_args(id)`, `sputnik::read_proposal_status()`. Spec §4.5 table, D16, D17, D27: AwaitingCouncil+Approved → Active (term starts now, book += principal); AwaitingCouncil+Rejected/Removed/Expired/Moved/Failed → NotFunded; Active+Failed → Voided (re-runnable sync); Active+Approved with purpose Default after term+grace → Defaulted; anything else and a failed read → no change. `mark_default` requires Active and now > due + grace (`ERR_NOT_OVERDUE`). Visitors cannot use `ask_council`.

- [ ] **Step 1: Write the failing tests (replace the stub `contract/desk/src/tests/council.rs`)**

`contract/desk/src/tests/council.rs`:
```rust
//! The council lane and every reconciliation row of spec §4.5, including the D27 vote-failure path.
use near_sdk::json_types::U128;
use near_sdk::PromiseOrValue;

use super::common::*;
use crate::types::{AskResult, Lane, LoanStatus, ReadPurpose};

fn council_loan(d: &mut crate::Desk, borrower: &str, amount: u128, proposal_id: u64) -> u64 {
    at(&acc(borrower), T0, 0, vec![]);
    let _ = d.ask_council(U128(amount));
    let id = last_loan(d).id;
    as_desk(T0, ok_u64(proposal_id));
    let _ = d.on_filed(id, false);
    id
}

#[test]
fn ask_council_files_without_voting_or_reserving() {
    let mut d = with_members(&["chidi.testnet"]);
    at(&acc("chidi.testnet"), T0, 0, vec![]);
    let _ = d.ask_council(U128(9 * NEAR));
    let id = last_loan(&d).id;
    assert_eq!((d.loan(id).lane, d.book, member(&d, "chidi.testnet").drawn), (Lane::Council, 0, 0));
    as_desk(T0, ok_u64(30));
    match d.on_filed(id, false) {
        PromiseOrValue::Value(AskResult::Loan { status, proposal_id, .. }) => {
            assert_eq!((status, proposal_id), (LoanStatus::AwaitingCouncil, Some(30)));
        }
        _ => panic!("the desk must not vote on a council-lane loan"),
    }
}

#[test]
fn a_council_approval_activates_the_loan_when_synced() {
    let mut d = with_members(&["chidi.testnet"]);
    let id = council_loan(&mut d, "chidi.testnet", 9 * NEAR, 30);
    as_desk(T0 + 30, proposal_with_status("Approved"));
    assert_eq!(d.on_proposal_read(id, ReadPurpose::Sync), LoanStatus::Active);
    assert_eq!(d.loan(id).due_at, (T0 + 30 + 120) * 1_000_000_000);
    assert_eq!(d.book, 9 * NEAR, "council loans count toward the book, never against the cap");
}

#[test]
fn a_rejected_or_expired_council_proposal_is_not_funded() {
    let names = ["c0.testnet", "c1.testnet", "c2.testnet", "c3.testnet", "c4.testnet"];
    let mut d = with_members(&names);
    for (i, status) in ["Rejected", "Removed", "Expired", "Moved", "Failed"].into_iter().enumerate() {
        let id = council_loan(&mut d, names[i], 9 * NEAR, 30 + i as u64);
        as_desk(T0 + 30, proposal_with_status(status));
        assert_eq!(d.on_proposal_read(id, ReadPurpose::Sync), LoanStatus::NotFunded, "{status}");
        assert_eq!(member(&d, names[i]).open_loans, 0);
    }
    assert_eq!(d.book, 0);
}

#[test]
fn a_council_proposal_still_in_progress_changes_nothing() {
    let mut d = with_members(&["chidi.testnet"]);
    let id = council_loan(&mut d, "chidi.testnet", 9 * NEAR, 30);
    as_desk(T0 + 30, proposal_with_status("InProgress"));
    assert_eq!(d.on_proposal_read(id, ReadPurpose::Sync), LoanStatus::AwaitingCouncil);
}

#[test]
fn an_active_loan_whose_payout_later_failed_is_voided_on_a_rerun_sync() {
    let mut d = with_members(&["ada.testnet"]);
    let id = active_loan(&mut d, "ada.testnet", 3 * NEAR, T0, 41);
    as_desk(T0 + 1, proposal_with_status("Approved"));
    assert_eq!(d.on_proposal_read(id, ReadPurpose::Sync), LoanStatus::Active);
    as_desk(T0 + 2, proposal_with_status("Failed"));
    assert_eq!(d.on_proposal_read(id, ReadPurpose::Sync), LoanStatus::Voided);
    assert_eq!((member(&d, "ada.testnet").drawn, d.book), (0, 0));
}

#[test]
#[should_panic(expected = "ERR_LOAN_NOT_ACTIVE")]
fn repaying_a_voided_loan_panics_and_is_refunded() {
    let mut d = with_members(&["ada.testnet"]);
    let id = active_loan(&mut d, "ada.testnet", 3 * NEAR, T0, 41);
    as_desk(T0 + 2, proposal_with_status("Failed"));
    let _ = d.on_proposal_read(id, ReadPurpose::Sync);
    at(&acc("ada.testnet"), T0 + 3, 3 * NEAR, vec![]);
    let _ = d.repay(id);
}

#[test]
fn the_d27_council_fallback_activates_on_a_council_approval_without_a_pledge() {
    let mut d = with_members(&["ada.testnet", "bayo.testnet"]);
    at(&acc("ada.testnet"), T0, 0, vec![]);
    let _ = d.ask(U128(6 * NEAR));
    at(&acc("bayo.testnet"), T0, 0, vec![]);
    let _ = d.cosign(acc("ada.testnet"), U128(2 * NEAR));
    let id = last_loan(&d).id;
    as_desk(T0, ok_u64(12));
    let _ = d.on_filed(id, true);
    as_desk(T0, failed());
    let _ = d.on_voted(id);
    as_desk(T0 + 40, proposal_with_status("Approved"));
    assert_eq!(d.on_proposal_read(id, ReadPurpose::Sync), LoanStatus::Active);
    assert_eq!((d.book, member(&d, "bayo.testnet").pledged, member(&d, "ada.testnet").drawn), (6 * NEAR, 0, 0));
}

#[test]
#[should_panic(expected = "ERR_NOT_OVERDUE")]
fn mark_default_before_term_plus_grace_panics() {
    let mut d = with_members(&["ada.testnet"]);
    let id = active_loan(&mut d, "ada.testnet", 3 * NEAR, T0, 41);
    at(&acc("eve.testnet"), T0 + 180, 0, vec![]);
    let _ = d.mark_default(id);
}

#[test]
fn mark_default_after_grace_slashes_borrower_and_cosigner_when_the_payout_is_approved() {
    let mut d = with_members(&["ada.testnet", "bayo.testnet"]);
    let id = active_cosigned_loan(&mut d, "ada.testnet", "bayo.testnet", 6 * NEAR, T0, 8);
    at(&acc("eve.testnet"), T0 + 181, 0, vec![]);
    let _ = d.mark_default(id);
    as_desk(T0 + 181, proposal_with_status("Approved"));
    assert_eq!(d.on_proposal_read(id, ReadPurpose::Default), LoanStatus::Defaulted);
    let ada = member(&d, "ada.testnet");
    assert_eq!((ada.standing, ada.defaults, ada.drawn, ada.open_loans), (0, 1, 0, 0));
    let bayo = member(&d, "bayo.testnet");
    assert_eq!((bayo.standing, bayo.pledged), (2 * NEAR, 0));
    assert_eq!(d.book, 0);
}

#[test]
fn mark_default_voids_instead_when_the_payout_failed() {
    let mut d = with_members(&["ada.testnet"]);
    let id = active_loan(&mut d, "ada.testnet", 3 * NEAR, T0, 41);
    at(&acc("eve.testnet"), T0 + 181, 0, vec![]);
    let _ = d.mark_default(id);
    as_desk(T0 + 181, proposal_with_status("Failed"));
    assert_eq!(d.on_proposal_read(id, ReadPurpose::Default), LoanStatus::Voided);
    assert_eq!(member(&d, "ada.testnet").standing, 4 * NEAR, "never slashed for money never received");
}

#[test]
fn a_default_read_on_a_loan_repaid_meanwhile_changes_nothing() {
    let mut d = with_members(&["ada.testnet"]);
    let id = active_loan(&mut d, "ada.testnet", 3 * NEAR, T0, 41);
    at(&acc("eve.testnet"), T0 + 181, 0, vec![]);
    let _ = d.mark_default(id);
    at(&acc("ada.testnet"), T0 + 181, 3 * NEAR, vec![]);
    let _ = d.repay(id);
    as_desk(T0 + 182, proposal_with_status("Approved"));
    assert_eq!(d.on_proposal_read(id, ReadPurpose::Default), LoanStatus::Defaulted, "settled by the repay's own timestamp");
    assert_eq!(member(&d, "ada.testnet").defaults, 1, "counted once");
}

#[test]
fn a_failed_read_changes_nothing() {
    let mut d = with_members(&["chidi.testnet"]);
    let id = council_loan(&mut d, "chidi.testnet", 9 * NEAR, 30);
    as_desk(T0 + 30, failed());
    assert_eq!(d.on_proposal_read(id, ReadPurpose::Sync), LoanStatus::AwaitingCouncil);
}

#[test]
#[should_panic(expected = "ERR_NO_PROPOSAL")]
fn syncing_a_refused_loan_panics() {
    let mut d = with_members(&["ada.testnet"]);
    at(&acc("ada.testnet"), T0, 0, vec![]);
    let _ = d.ask(U128(NEAR));
    let id = last_loan(&d).id;
    as_desk(T0, failed());
    let _ = d.on_filed(id, true);
    at(&acc("eve.testnet"), T0, 0, vec![]);
    let _ = d.sync_loan(id);
}

#[test]
#[should_panic(expected = "ERR_CALLBACK_ONLY")]
fn on_proposal_read_is_private() {
    let mut d = with_members(&["chidi.testnet"]);
    let id = council_loan(&mut d, "chidi.testnet", 9 * NEAR, 30);
    at(&acc("eve.testnet"), T0, 0, proposal_with_status("Approved"));
    let _ = d.on_proposal_read(id, ReadPurpose::Sync);
}
```

- [ ] **Step 2: Run to confirm it fails**

Run: `npm run cargo -- test --manifest-path contract/desk/Cargo.toml tests::council::`
Expected: FAIL — compile error "no method named ask_council found for struct Desk"

- [ ] **Step 3: Implement (replace the stub `contract/desk/src/council.rs`)**

`contract/desk/src/council.rs`:
```rust
//! The council lane and reconciliation with Sputnik (D16, D17, D27). The desk learns what happened to a
//! proposal only by reading `get_proposal`; payouts execute in a detached step, so reads are re-runnable.
use near_sdk::json_types::U128;
use near_sdk::{env, near, require, NearToken, Promise, PromiseOrValue};

use crate::errors::{ERR_LOAN_NOT_ACTIVE, ERR_NOT_OVERDUE, ERR_NO_PROPOSAL, ERR_VISITOR_NO_COUNCIL, ERR_ZERO_AMOUNT};
use crate::gas::{GAS_GET_PROPOSAL, GAS_ON_READ};
use crate::sputnik;
use crate::types::{AskResult, Lane, LoanStatus, ReadPurpose};
use crate::{Desk, DeskExt};

impl Desk {
    fn read_proposal(&self, loan_id: u64, proposal_id: u64, purpose: ReadPurpose) -> Promise {
        Promise::new(self.dao.clone())
            .function_call("get_proposal", sputnik::get_proposal_args(proposal_id), NearToken::from_yoctonear(0), GAS_GET_PROPOSAL)
            .then(Self::ext(env::current_account_id()).with_static_gas(GAS_ON_READ).on_proposal_read(loan_id, purpose))
    }
}

#[near]
impl Desk {
    /// Anything larger: the desk files the Transfer and does not vote. The council votes it like any proposal.
    pub fn ask_council(&mut self, amount: U128) -> PromiseOrValue<AskResult> {
        let borrower = env::predecessor_account_id();
        require!(amount.0 > 0, ERR_ZERO_AMOUNT);
        let member = self.member(&borrower);
        require!(member.visitor.is_none(), ERR_VISITOR_NO_COUNCIL);
        let loan_id = self.open_loan(&borrower, amount.0, 0, None, 0, Lane::Council, Self::now());
        env::log_str(&format!("fiador: loan #{} of {} for {} goes to the council", loan_id, amount.0, borrower));
        PromiseOrValue::Promise(self.file_transfer(loan_id, false))
    }

    /// Anyone, any number of times: reconciles a loan with its Sputnik proposal.
    pub fn sync_loan(&mut self, loan_id: u64) -> Promise {
        let loan = self.loan(loan_id);
        let proposal_id = loan.proposal_id.unwrap_or_else(|| env::panic_str(ERR_NO_PROPOSAL));
        self.read_proposal(loan_id, proposal_id, ReadPurpose::Sync)
    }

    /// Anyone, after term + grace: defaults the loan only if Sputnik shows the payout Approved.
    pub fn mark_default(&mut self, loan_id: u64) -> Promise {
        let loan = self.loan(loan_id);
        require!(loan.status == LoanStatus::Active, ERR_LOAN_NOT_ACTIVE);
        let grace_end = loan.due_at.saturating_add(Self::secs(self.params.grace_sec));
        require!(Self::now() > grace_end, ERR_NOT_OVERDUE);
        let proposal_id = loan.proposal_id.unwrap_or_else(|| env::panic_str(ERR_NO_PROPOSAL));
        self.read_proposal(loan_id, proposal_id, ReadPurpose::Default)
    }

    #[private]
    pub fn on_proposal_read(&mut self, loan_id: u64, purpose: ReadPurpose) -> LoanStatus {
        Self::require_callback();
        let mut loan = self.loan(loan_id);
        let Some(status) = sputnik::read_proposal_status() else {
            env::log_str(&format!("fiador: could not read the proposal for loan #{}; no change", loan_id));
            return loan.status;
        };
        let now = Self::now();
        match (loan.status, status.as_str()) {
            (LoanStatus::AwaitingCouncil, "Approved") => {
                loan.status = LoanStatus::Active;
                loan.due_at = now.saturating_add(Self::secs(self.params.loan_term_sec));
                self.book = self.book.saturating_add(loan.principal);
                self.put_loan(loan);
            }
            (LoanStatus::AwaitingCouncil, "Rejected" | "Removed" | "Expired" | "Moved" | "Failed") => {
                self.close(loan_id, LoanStatus::NotFunded);
            }
            (LoanStatus::Active, "Failed") => {
                self.release(&loan);
                self.close(loan_id, LoanStatus::Voided);
            }
            (LoanStatus::Active, "Approved")
                if purpose == ReadPurpose::Default
                    && now > loan.due_at.saturating_add(Self::secs(self.params.grace_sec)) =>
            {
                self.release(&loan);
                self.apply_default(&loan);
                self.close(loan_id, LoanStatus::Defaulted);
            }
            _ => {
                env::log_str(&format!("fiador: loan #{} is {:?}, proposal {}; no change", loan_id, loan.status, status));
            }
        }
        let after = self.loan(loan_id).status;
        env::log_str(&format!("fiador: loan #{} now {:?}", loan_id, after));
        after
    }
}
```

- [ ] **Step 4: Run the gate**

Run: `npm run cargo -- test --manifest-path contract/desk/Cargo.toml tests::council::`
Expected: PASS — `test result: ok. 14 passed; 0 failed`

- [ ] **Step 5: Commit (kernel-performed — no agent runs this)**
Message: `feat(desk): council lane and reconciliation`

---

### Task 28: The visitor line with recycling seats

**Files:**
- Modify: `contract/desk/src/visitors.rs`
- Test: `contract/desk/src/tests/visitors.rs`

**Depends on:** Task 27
**Effort:** high
**Model tier:** top
**Requires:** `contract/desk: ask_council(amount: U128) -> PromiseOrValue<AskResult>; sync_loan(loan_id: u64) -> Promise; mark_default(loan_id: u64) -> Promise; callback on_proposal_read(loan_id: u64, purpose: ReadPurpose) -> LoanStatus`
**Provides:** `contract/desk: join_visitor_line(), payable: exact visitor_deposit; records never exceed visitor_slots; a full line reclaims one expired idle seat and refunds its deposit, else ERR_VISITOR_LINE_FULL`

Context: the crate (Task 21) defines, in `contract/desk/src/types.rs`, `Params`, `Member { standing, drawn, pledged, open_loans, visitor: Option<Seat>, repaid_on_time, defaults }` with `Member::new(standing, visitor)` and `Member::unused()`, `Seat { joined_at, deposit, loans_taken }`, `Request { amount, created_at, expires_at }`, `Lane`, `LoanStatus`, `Loan`, `AskResult`, `ReadPurpose` and the view structs; `contract/desk/src/lib.rs` defines `Desk { dao, params, members: IterableMap<AccountId, Member>, loans: Vector<Loan>, requests: IterableMap<AccountId, Request>, book: u128 }` and the helpers `Desk::now()`, `Desk::secs(sec)`, `self.require_dao()`, `Desk::require_callback()`, `self.member(&id)` (panics ERR_NOT_MEMBER), `self.put_member(&id, m)`, `self.loan(id)` (panics ERR_LOAN_NOT_FOUND), `self.put_loan(loan)`, constants `NS_PER_SEC`, `NS_PER_MS`; `contract/desk/src/errors.rs` holds every `ERR_*` string and `contract/desk/src/gas.rs` the gas constants. Every `#[near] impl Desk` block outside lib.rs must `use crate::{Desk, DeskExt};`. Unit tests call methods directly, so near-sdk's `#[private]` is NOT enforced in them; callbacks therefore also call `Desk::require_callback()` (ERR_CALLBACK_ONLY), which the tests exercise. Storage persists across `testing_env!` calls inside one test, so a test builds exactly one `Desk`. D6, D23, spec §4.7: the visitor attaches exactly `visitor_deposit` (held for the seat; refunded when the seat is reclaimed or the DAO removes it); standing = `visitor_starter`; a seat is reclaimable when its window has passed and it has no open loan, drawn, pledge or request. Visitors cannot co-sign or use the council lane and take at most 3 loans per seat (enforced in Tasks 24, 25, 27; tested here).

- [ ] **Step 1: Write the failing tests (replace the stub `contract/desk/src/tests/visitors.rs`)**

`contract/desk/src/tests/visitors.rs`:
```rust
//! D6 / D23: the visitor line, seat recycling, and every refusal branch of the deposit-holding join.
use near_sdk::json_types::U128;

use super::common::*;
use crate::types::{LoanStatus, Seat};

const DEPOSIT: u128 = NEAR / 20;

fn join(d: &mut crate::Desk, who: &str, sec: u64) {
    at(&acc(who), sec, DEPOSIT, vec![]);
    d.join_visitor_line();
}

#[test]
fn a_visitor_joins_with_the_exact_deposit_at_visitor_standing() {
    let mut d = new_desk();
    join(&mut d, "v1.testnet", T0);
    let v = member(&d, "v1.testnet");
    assert_eq!(v.standing, NEAR / 10);
    assert_eq!(v.visitor, Some(Seat { joined_at: T0 * 1_000_000_000, deposit: DEPOSIT, loans_taken: 0 }));
}

#[test]
#[should_panic(expected = "ERR_VISITOR_DEPOSIT")]
fn a_wrong_deposit_panics_and_is_refunded() {
    let mut d = new_desk();
    at(&acc("v1.testnet"), T0, DEPOSIT + 1, vec![]);
    d.join_visitor_line();
}

#[test]
#[should_panic(expected = "ERR_ALREADY_MEMBER")]
fn a_member_cannot_join_the_visitor_line_and_is_refunded() {
    let mut d = with_members(&["ada.testnet"]);
    join(&mut d, "ada.testnet", T0);
}

#[test]
#[should_panic(expected = "ERR_VISITOR_LINE_FULL")]
fn a_full_line_of_live_seats_refuses_and_refunds() {
    let mut d = new_desk();
    join(&mut d, "v1.testnet", T0);
    join(&mut d, "v2.testnet", T0);
    join(&mut d, "v3.testnet", T0 + 10);
}

#[test]
fn a_full_line_reclaims_an_expired_idle_seat_and_refunds_its_deposit() {
    let mut d = new_desk();
    join(&mut d, "v1.testnet", T0);
    join(&mut d, "v2.testnet", T0 + 100);
    join(&mut d, "v3.testnet", T0 + 1800);
    assert!(d.members.get(&acc("v1.testnet")).is_none(), "v1's window ended");
    assert!(d.members.get(&acc("v2.testnet")).is_some(), "v2's window is still open");
    assert!(d.members.get(&acc("v3.testnet")).is_some());
    assert_eq!(transfers_to(&acc("v1.testnet")), vec![DEPOSIT]);
}

#[test]
#[should_panic(expected = "ERR_VISITOR_LINE_FULL")]
fn an_expired_seat_with_an_open_loan_is_not_reclaimed() {
    let mut d = new_desk();
    join(&mut d, "v1.testnet", T0);
    join(&mut d, "v2.testnet", T0);
    active_loan(&mut d, "v1.testnet", NEAR / 10, T0 + 1, 3);
    let mut v2 = member(&d, "v2.testnet");
    v2.drawn = 1;
    d.put_member(&acc("v2.testnet"), v2);
    join(&mut d, "v3.testnet", T0 + 1801);
}

#[test]
fn a_visitor_borrows_within_standing_and_its_standing_rises_on_time() {
    let mut d = new_desk();
    join(&mut d, "v1.testnet", T0);
    let id = active_loan(&mut d, "v1.testnet", NEAR / 10, T0 + 1, 3);
    at(&acc("v1.testnet"), T0 + 2, NEAR / 10, vec![]);
    let _ = d.repay(id);
    assert_eq!(d.loan(id).status, LoanStatus::Repaid);
    assert_eq!(member(&d, "v1.testnet").standing, 2 * NEAR / 10);
}

#[test]
fn a_refused_visitor_loan_gives_the_loan_slot_back() {
    let mut d = new_desk();
    join(&mut d, "v1.testnet", T0);
    at(&acc("v1.testnet"), T0 + 1, 0, vec![]);
    let _ = d.ask(U128(NEAR / 10));
    let id = last_loan(&d).id;
    assert_eq!(member(&d, "v1.testnet").visitor.unwrap().loans_taken, 1);
    as_desk(T0 + 1, failed());
    let _ = d.on_filed(id, true);
    assert_eq!(member(&d, "v1.testnet").visitor.unwrap().loans_taken, 0);
}

#[test]
#[should_panic(expected = "ERR_VISITOR_LOAN_LIMIT")]
fn a_seat_takes_at_most_three_loans() {
    let mut d = new_desk();
    join(&mut d, "v1.testnet", T0);
    for i in 0..3u64 {
        let id = active_loan(&mut d, "v1.testnet", NEAR / 100, T0 + 1 + i, 10 + i);
        at(&acc("v1.testnet"), T0 + 1 + i, NEAR / 100, vec![]);
        let _ = d.repay(id);
    }
    at(&acc("v1.testnet"), T0 + 10, 0, vec![]);
    let _ = d.ask(U128(NEAR / 100));
}

#[test]
#[should_panic(expected = "ERR_VISITOR_SEAT_EXPIRED")]
fn an_expired_seat_cannot_borrow() {
    let mut d = new_desk();
    join(&mut d, "v1.testnet", T0);
    at(&acc("v1.testnet"), T0 + 1800, 0, vec![]);
    let _ = d.ask(U128(NEAR / 100));
}

#[test]
#[should_panic(expected = "ERR_VISITOR_CANNOT_COSIGN")]
fn a_visitor_cannot_cosign() {
    let mut d = with_members(&["ada.testnet"]);
    join(&mut d, "v1.testnet", T0);
    at(&acc("ada.testnet"), T0, 0, vec![]);
    let _ = d.ask(U128(6 * NEAR));
    at(&acc("v1.testnet"), T0, 0, vec![]);
    let _ = d.cosign(acc("ada.testnet"), U128(2 * NEAR));
}

#[test]
#[should_panic(expected = "ERR_VISITOR_NO_COUNCIL")]
fn a_visitor_cannot_use_the_council_lane() {
    let mut d = new_desk();
    join(&mut d, "v1.testnet", T0);
    at(&acc("v1.testnet"), T0, 0, vec![]);
    let _ = d.ask_council(U128(NEAR));
}
```

- [ ] **Step 2: Run to confirm it fails**

Run: `npm run cargo -- test --manifest-path contract/desk/Cargo.toml tests::visitors::`
Expected: FAIL — compile error "no method named join_visitor_line found for struct Desk"

- [ ] **Step 3: Implement (replace the stub `contract/desk/src/visitors.rs`)**

`contract/desk/src/visitors.rs`:
```rust
//! The visitor line (D6): self-serve, capped at `visitor_slots` records, each paying its own storage
//! deposit. A full line reclaims one expired idle seat (refunding its deposit) before refusing.
use near_sdk::{env, near, require, AccountId, NearToken, Promise};

use crate::errors::{ERR_ALREADY_MEMBER, ERR_VISITOR_DEPOSIT, ERR_VISITOR_LINE_FULL};
use crate::types::{Member, Seat};
use crate::{Desk, DeskExt};

impl Desk {
    fn reclaimable(&self, account_id: &AccountId, member: &Member, now: u64) -> bool {
        match &member.visitor {
            None => false,
            Some(seat) => {
                now >= seat.joined_at.saturating_add(Self::secs(self.params.visitor_window_sec))
                    && member.open_loans == 0
                    && member.drawn == 0
                    && member.pledged == 0
                    && !self.requests.contains_key(account_id)
            }
        }
    }
}

#[near]
impl Desk {
    #[payable]
    pub fn join_visitor_line(&mut self) {
        let visitor = env::predecessor_account_id();
        let deposit = env::attached_deposit().as_yoctonear();
        require!(deposit == self.params.visitor_deposit.0, ERR_VISITOR_DEPOSIT);
        require!(!self.members.contains_key(&visitor), ERR_ALREADY_MEMBER);
        let now = Self::now();
        let seats = self.members.iter().filter(|(_, m)| m.visitor.is_some()).count();
        if seats >= self.params.visitor_slots as usize {
            let reclaim = self
                .members
                .iter()
                .find(|(id, m)| self.reclaimable(id, m, now))
                .map(|(id, m)| (id.clone(), m.clone()));
            let Some((old_id, old)) = reclaim else { env::panic_str(ERR_VISITOR_LINE_FULL) };
            self.members.remove(&old_id);
            if let Some(seat) = old.visitor {
                if seat.deposit > 0 {
                    Promise::new(old_id.clone()).transfer(NearToken::from_yoctonear(seat.deposit)).detach();
                }
            }
            env::log_str(&format!("fiador: visitor seat of {} reclaimed and its deposit refunded", old_id));
        }
        let seat = Seat { joined_at: now, deposit, loans_taken: 0 };
        self.members.insert(visitor.clone(), Member::new(self.params.visitor_starter.0, Some(seat)));
        env::log_str(&format!("fiador: {} joined the visitor line with standing {}", visitor, self.params.visitor_starter.0));
    }
}
```

- [ ] **Step 4: Run the gate**

Run: `npm run cargo -- test --manifest-path contract/desk/Cargo.toml tests::visitors::`
Expected: PASS — `test result: ok. 12 passed; 0 failed`

- [ ] **Step 5: Commit (kernel-performed — no agent runs this)**
Message: `feat(desk): visitor line`

---

### Task 29: Paginated public views

**Files:**
- Modify: `contract/desk/src/views.rs`
- Test: `contract/desk/src/tests/views.rs`

**Depends on:** Task 28
**Effort:** medium
**Model tier:** top
**Requires:** `contract/desk: join_visitor_line(), payable: exact visitor_deposit; records never exceed visitor_slots; a full line reclaims one expired idle seat and refunds its deposit, else ERR_VISITOR_LINE_FULL`
**Provides:** `contract/desk: get_member(account_id: AccountId) -> Option<MemberView>; get_members(from_index: u32, limit: u32) -> Vec<MemberView>; get_loan(loan_id: u64) -> Option<LoanView>; get_loans(from_index: u64, limit: u64) -> Vec<LoanView>; get_requests(from_index: u32, limit: u32) -> Vec<RequestView> (limits capped at 100)`

Context: the crate (Task 21) defines, in `contract/desk/src/types.rs`, `Params`, `Member { standing, drawn, pledged, open_loans, visitor: Option<Seat>, repaid_on_time, defaults }` with `Member::new(standing, visitor)` and `Member::unused()`, `Seat { joined_at, deposit, loans_taken }`, `Request { amount, created_at, expires_at }`, `Lane`, `LoanStatus`, `Loan`, `AskResult`, `ReadPurpose` and the view structs; `contract/desk/src/lib.rs` defines `Desk { dao, params, members: IterableMap<AccountId, Member>, loans: Vector<Loan>, requests: IterableMap<AccountId, Request>, book: u128 }` and the helpers `Desk::now()`, `Desk::secs(sec)`, `self.require_dao()`, `Desk::require_callback()`, `self.member(&id)` (panics ERR_NOT_MEMBER), `self.put_member(&id, m)`, `self.loan(id)` (panics ERR_LOAN_NOT_FOUND), `self.put_loan(loan)`, constants `NS_PER_SEC`, `NS_PER_MS`; `contract/desk/src/errors.rs` holds every `ERR_*` string and `contract/desk/src/gas.rs` the gas constants. Every `#[near] impl Desk` block outside lib.rs must `use crate::{Desk, DeskExt};`. Unit tests call methods directly, so near-sdk's `#[private]` is NOT enforced in them; callbacks therefore also call `Desk::require_callback()` (ERR_CALLBACK_ONLY), which the tests exercise. Storage persists across `testing_env!` calls inside one test, so a test builds exactly one `Desk`. D8, spec §4.6: amounts are U128 strings and times milliseconds; `RequestView.gap` is recomputed from the borrower's current unused standing and `expired` is `expires_at <= now`.

- [ ] **Step 1: Write the failing tests (replace the stub `contract/desk/src/tests/views.rs`)**

`contract/desk/src/tests/views.rs`:
```rust
use near_sdk::json_types::U128;

use super::common::*;
use crate::types::{Lane, LoanStatus};

#[test]
fn member_views_show_unused_standing_and_seats() {
    let mut d = with_members(&["ada.testnet", "bayo.testnet"]);
    active_cosigned_loan(&mut d, "ada.testnet", "bayo.testnet", 6 * NEAR, T0, 8);
    let ada = d.get_member(acc("ada.testnet")).unwrap();
    assert_eq!((ada.standing, ada.drawn, ada.unused, ada.open_loans), (U128(4 * NEAR), U128(4 * NEAR), U128(0), 1));
    let bayo = d.get_member(acc("bayo.testnet")).unwrap();
    assert_eq!((bayo.pledged, bayo.unused), (U128(2 * NEAR), U128(2 * NEAR)));
    assert!(d.get_member(acc("nobody.testnet")).is_none());
    at(&acc("v.testnet"), T0, NEAR / 20, vec![]);
    d.join_visitor_line();
    let seat = d.get_member(acc("v.testnet")).unwrap().visitor.unwrap();
    assert_eq!((seat.joined_at_ms, seat.expires_at_ms, seat.deposit), (T0 * 1000, (T0 + 1800) * 1000, U128(NEAR / 20)));
}

#[test]
fn member_pages_are_bounded() {
    let d = with_members(&["a.testnet", "b.testnet", "c.testnet"]);
    assert_eq!(d.get_members(0, 2).len(), 2);
    assert_eq!(d.get_members(2, 2).len(), 1);
    assert_eq!(d.get_members(5, 2).len(), 0);
}

#[test]
fn loan_views_carry_the_proposal_id_and_times_in_ms() {
    let mut d = with_members(&["ada.testnet"]);
    let id = active_loan(&mut d, "ada.testnet", 3 * NEAR, T0, 41);
    let v = d.get_loan(id).unwrap();
    assert_eq!((v.lane, v.status, v.proposal_id, v.principal), (Lane::Standing, LoanStatus::Active, Some(41), U128(3 * NEAR)));
    assert_eq!((v.created_at_ms, v.due_at_ms, v.closed_at_ms), (T0 * 1000, (T0 + 120) * 1000, 0));
    assert!(d.get_loan(99).is_none());
}

#[test]
fn loan_pages_are_bounded_and_capped_at_100() {
    let mut d = with_members(&["ada.testnet"]);
    for i in 0..3u64 {
        let id = active_loan(&mut d, "ada.testnet", NEAR, T0 + i, i);
        at(&acc("ada.testnet"), T0 + i, NEAR, vec![]);
        let _ = d.repay(id);
    }
    assert_eq!(d.get_loans(0, 2).iter().map(|l| l.id).collect::<Vec<_>>(), vec![0, 1]);
    assert_eq!(d.get_loans(2, 500).len(), 1);
    assert_eq!(d.get_loans(9, 5).len(), 0);
}

#[test]
fn request_views_show_the_live_gap_and_expiry() {
    let mut d = with_members(&["ada.testnet"]);
    at(&acc("ada.testnet"), T0, 0, vec![]);
    let _ = d.ask(U128(6 * NEAR));
    let r = &d.get_requests(0, 10)[0];
    assert_eq!((r.borrower.clone(), r.amount, r.gap, r.expires_at_ms, r.expired), (acc("ada.testnet"), U128(6 * NEAR), U128(2 * NEAR), (T0 + 600) * 1000, false));
    at(&acc("eve.testnet"), T0 + 600, 0, vec![]);
    assert!(d.get_requests(0, 10)[0].expired);
}

#[test]
fn config_counts_members_loans_and_requests() {
    let mut d = with_members(&["ada.testnet", "bayo.testnet"]);
    active_loan(&mut d, "bayo.testnet", NEAR, T0, 1);
    at(&acc("ada.testnet"), T0, 0, vec![]);
    let _ = d.ask(U128(6 * NEAR));
    let c = d.get_config();
    assert_eq!((c.member_count, c.loan_count, c.request_count, c.book), (2, 1, 1, U128(NEAR)));
}
```

- [ ] **Step 2: Run to confirm it fails**

Run: `npm run cargo -- test --manifest-path contract/desk/Cargo.toml tests::views::`
Expected: FAIL — compile error "no method named get_member found for struct Desk"

- [ ] **Step 3: Implement (replace the stub `contract/desk/src/views.rs`)**

`contract/desk/src/views.rs`:
```rust
//! Paginated public views (D8): the board and verify read everything from here, with no indexer.
use near_sdk::json_types::U128;
use near_sdk::{near, AccountId};

use crate::types::{Loan, LoanView, Member, MemberView, RequestView, SeatView};
use crate::{Desk, DeskExt, NS_PER_MS};

pub const MAX_PAGE: u32 = 100;

impl Desk {
    fn member_view(&self, account_id: &AccountId, m: &Member) -> MemberView {
        MemberView {
            account_id: account_id.clone(),
            standing: U128(m.standing),
            drawn: U128(m.drawn),
            pledged: U128(m.pledged),
            unused: U128(m.unused()),
            open_loans: m.open_loans,
            visitor: m.visitor.as_ref().map(|s| SeatView {
                joined_at_ms: s.joined_at / NS_PER_MS,
                expires_at_ms: s.joined_at.saturating_add(Self::secs(self.params.visitor_window_sec)) / NS_PER_MS,
                deposit: U128(s.deposit),
                loans_taken: s.loans_taken,
            }),
            repaid_on_time: m.repaid_on_time,
            defaults: m.defaults,
        }
    }

    fn loan_view(loan: &Loan) -> LoanView {
        LoanView {
            id: loan.id,
            borrower: loan.borrower.clone(),
            principal: U128(loan.principal),
            borrower_part: U128(loan.borrower_part),
            cosigner: loan.cosigner.clone(),
            pledge: U128(loan.pledge),
            lane: loan.lane,
            status: loan.status,
            proposal_id: loan.proposal_id,
            created_at_ms: loan.created_at / NS_PER_MS,
            due_at_ms: loan.due_at / NS_PER_MS,
            closed_at_ms: loan.closed_at / NS_PER_MS,
        }
    }
}

#[near]
impl Desk {
    pub fn get_member(&self, account_id: AccountId) -> Option<MemberView> {
        self.members.get(&account_id).map(|m| self.member_view(&account_id, m))
    }

    pub fn get_members(&self, from_index: u32, limit: u32) -> Vec<MemberView> {
        self.members
            .iter()
            .skip(from_index as usize)
            .take(limit.min(MAX_PAGE) as usize)
            .map(|(id, m)| self.member_view(id, m))
            .collect()
    }

    pub fn get_loan(&self, loan_id: u64) -> Option<LoanView> {
        u32::try_from(loan_id).ok().and_then(|i| self.loans.get(i)).map(Self::loan_view)
    }

    pub fn get_loans(&self, from_index: u64, limit: u64) -> Vec<LoanView> {
        let len = u64::from(self.loans.len());
        let end = from_index.saturating_add(limit.min(u64::from(MAX_PAGE))).min(len);
        (from_index..end)
            .filter_map(|i| u32::try_from(i).ok().and_then(|i| self.loans.get(i)))
            .map(Self::loan_view)
            .collect()
    }

    pub fn get_requests(&self, from_index: u32, limit: u32) -> Vec<RequestView> {
        let now = Self::now();
        self.requests
            .iter()
            .skip(from_index as usize)
            .take(limit.min(MAX_PAGE) as usize)
            .map(|(borrower, r)| {
                let unused = self.members.get(borrower).map(|m| m.unused()).unwrap_or(0);
                RequestView {
                    borrower: borrower.clone(),
                    amount: U128(r.amount),
                    gap: U128(r.amount.saturating_sub(unused)),
                    expires_at_ms: r.expires_at / NS_PER_MS,
                    expired: r.expires_at <= now,
                }
            })
            .collect()
    }
}
```

- [ ] **Step 4: Run the gate**

Run: `npm run cargo -- test --manifest-path contract/desk/Cargo.toml tests::views::`
Expected: PASS — `test result: ok. 6 passed; 0 failed`

- [ ] **Step 5: Commit (kernel-performed — no agent runs this)**
Message: `feat(desk): paginated views`

---

### Task 30: Gas headroom against the live smoke measurement

**Files:**
- Modify: `contract/desk/src/tests/gas_headroom.rs`
- Modify: `contract/desk/src/gas.rs`

**Depends on:** Task 29, Task 12
**Effort:** medium
**Model tier:** top
**Requires:** `deployments/smoke-gas.json`, `contract/desk: get_member(account_id: AccountId) -> Option<MemberView>; get_members(from_index: u32, limit: u32) -> Vec<MemberView>; get_loan(loan_id: u64) -> Option<LoanView>; get_loans(from_index: u64, limit: u64) -> Vec<LoanView>; get_requests(from_index: u32, limit: u32) -> Vec<RequestView> (limits capped at 100)`
**Provides:** `contract/desk/src/gas.rs: gas constants verified >= 1.3x the live smoke measurement (D28)`

Context: `deployments/smoke-gas.json` (written by the live smoke run, Task 12) holds the burnt gas of each step's receipt subtree as decimal strings: `add_proposal`, `on_filed`, `act_proposal`, `on_voted`. `contract/desk/src/gas.rs` (Task 21) starts at the smoke contract's proven allocations: GAS_ADD_PROPOSAL 50 Tgas, GAS_ON_FILED 150, GAS_ACT_PROPOSAL 100, GAS_ON_VOTED 20, GAS_GET_PROPOSAL 20, GAS_ON_READ 30. If a headroom test fails, raise ONLY the failing constant to the next whole Tgas at or above 1.3 x the measurement, keeping GAS_ADD_PROPOSAL + GAS_ON_FILED + 20 Tgas <= 300 Tgas; if that cannot hold, stop and report BLOCKED with the numbers.

- [ ] **Step 1: Write the headroom tests (replace the stub)**

`contract/desk/src/tests/gas_headroom.rs`:
```rust
//! D28: every static gas allocation carries >= 30% headroom over the live smoke measurement.
use near_sdk::serde_json::{self, Value};
use near_sdk::Gas;

use crate::gas::{GAS_ACT_PROPOSAL, GAS_ADD_PROPOSAL, GAS_ON_FILED, GAS_ON_VOTED};

const MEASURED: &str = include_str!("../../../../deployments/smoke-gas.json");

fn measured(key: &str) -> u64 {
    let v: Value = serde_json::from_str(MEASURED).expect("deployments/smoke-gas.json is JSON");
    v[key].as_str().and_then(|s| s.parse::<u64>().ok()).unwrap_or_else(|| panic!("{key} missing from smoke-gas.json"))
}

fn assert_headroom(name: &str, allocated: Gas, key: &str) {
    let need = measured(key);
    assert!(
        u128::from(allocated.as_gas()) * 10 >= u128::from(need) * 13,
        "{name} = {} gas is below 1.3 x the measured {key} = {need}",
        allocated.as_gas()
    );
}

#[test]
fn add_proposal_has_headroom() {
    assert_headroom("GAS_ADD_PROPOSAL", GAS_ADD_PROPOSAL, "add_proposal");
}

#[test]
fn on_filed_has_headroom() {
    assert_headroom("GAS_ON_FILED", GAS_ON_FILED, "on_filed");
}

#[test]
fn act_proposal_has_headroom() {
    assert_headroom("GAS_ACT_PROPOSAL", GAS_ACT_PROPOSAL, "act_proposal");
}

#[test]
fn on_voted_has_headroom() {
    assert_headroom("GAS_ON_VOTED", GAS_ON_VOTED, "on_voted");
}

#[test]
fn an_ask_fits_in_300_tgas() {
    let chain = GAS_ADD_PROPOSAL.as_gas() + GAS_ON_FILED.as_gas();
    assert!(chain + Gas::from_tgas(20).as_gas() <= Gas::from_tgas(300).as_gas(), "ask needs {chain} plus its own execution");
    assert!(GAS_ACT_PROPOSAL.as_gas() + GAS_ON_VOTED.as_gas() + Gas::from_tgas(10).as_gas() <= GAS_ON_FILED.as_gas());
}
```

- [ ] **Step 2: Run the headroom tests; if one fails, raise only that constant in `contract/desk/src/gas.rs` as described in Context and re-run**

- [ ] **Step 3: Run the gate**

Run: `npm run cargo -- test --manifest-path contract/desk/Cargo.toml`
Expected: PASS — `test result: ok. 96 passed; 0 failed` (the whole desk suite, including the 5 headroom tests)

- [ ] **Step 4: Commit (kernel-performed — no agent runs this)**
Message: `test(desk): gas headroom over the live smoke measurement`

---

### Task 31: Build and commit the desk wasm

**Files:**
- Create: `contract/res/fiador_desk.wasm`

**Depends on:** Task 30, Task 2
**Effort:** low
**Model tier:** top
**Requires:** `npm run wasm -- <smoke|desk>`, `npm run wasm:check -- <file.wasm> <export1,export2,...>`, `contract/desk/src/gas.rs: gas constants verified >= 1.3x the live smoke measurement (D28)`
**Provides:** `contract/res/fiador_desk.wasm`

Context: needs Rust 1.99.0 with the `wasm32-unknown-unknown` target (it already built `contract/res/fiador_smoke.wasm` in Task 6). If the local build fails with a toolchain/linker error, stop and report BLOCKED with the cargo error; the orchestrator then applies Appendix A of docs/superpowers/plans/2026-11-13-fiador-smoke.md with `crates=desk` (the workflow commits `contract/res/fiador_desk.wasm`) and re-runs this gate.

- [ ] **Step 1: Run to confirm the build**

Run: `npm run wasm -- desk`
Expected: ends with `WASM BUILT contract/res/fiador_desk.wasm <N> bytes` (Windows prints backslashes)

- [ ] **Step 2: Run the gate**

Run: `npm run wasm:check -- contract/res/fiador_desk.wasm new,get_config,set_params,admit_member,remove_member,ask,on_filed,on_voted,cosign,cancel_request,repay,ask_council,sync_loan,mark_default,on_proposal_read,join_visitor_line,get_member,get_members,get_loan,get_loans,get_requests`
Expected: PASS — `WASM CHECK PASS contract/res/fiador_desk.wasm <N> bytes, <M> exports`

- [ ] **Step 3: Commit (kernel-performed — no agent runs this)**
Message: `build(desk): commit fiador_desk.wasm`

---
