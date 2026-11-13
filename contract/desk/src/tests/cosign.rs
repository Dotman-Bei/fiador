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
