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
