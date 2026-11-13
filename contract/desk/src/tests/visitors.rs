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
