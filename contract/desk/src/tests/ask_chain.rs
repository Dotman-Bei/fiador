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
