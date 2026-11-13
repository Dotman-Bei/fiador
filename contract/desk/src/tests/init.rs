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
