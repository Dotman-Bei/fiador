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
