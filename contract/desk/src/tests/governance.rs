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
