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
