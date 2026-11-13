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

/// A desk with these members admitted by the DAO (each at starter standing 4 NEAR).
pub fn with_members(names: &[&str]) -> Desk {
    let mut d = new_desk();
    at(&dao_id(), T0, 0, vec![]);
    for n in names {
        d.admit_member(acc(n));
    }
    d
}

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
