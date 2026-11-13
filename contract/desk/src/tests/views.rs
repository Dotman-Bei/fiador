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
