//! JSON the desk sends to and reads from the live Sputnik 2.3.1 DAO.
use near_sdk::serde_json::{self, json, Value};
use near_sdk::{env, AccountId};

use crate::gas::MAX_RESULT_LEN;
use crate::types::{Lane, Loan};

/// The NEAR Transfer kind as the live 2.3.1 DAO stores it, minus `msg` (valid on 2.3.1 and main).
pub(crate) fn transfer_kind(receiver_id: &AccountId, amount: u128) -> Value {
    json!({ "Transfer": { "token_id": "", "receiver_id": receiver_id, "amount": amount.to_string() } })
}

pub(crate) fn lane_label(lane: Lane) -> &'static str {
    match lane {
        Lane::Standing => "standing lane",
        Lane::Cosigned => "co-signed lane",
        Lane::Council => "council lane",
    }
}

pub(crate) fn add_proposal_args(loan: &Loan) -> Vec<u8> {
    let description = format!(
        "fiador loan #{}: {} yocto to {} ({})",
        loan.id,
        loan.principal,
        loan.borrower,
        lane_label(loan.lane)
    );
    let args = json!({ "proposal": { "description": description, "kind": transfer_kind(&loan.borrower, loan.principal) } });
    serde_json::to_vec(&args).expect("add_proposal args")
}

/// `proposal` echoes the kind exactly as filed: required on main (ERR_WRONG_KIND), accepted by 2.3.1.
pub(crate) fn act_proposal_args(proposal_id: u64, loan: &Loan) -> Vec<u8> {
    let args = json!({ "id": proposal_id, "action": "VoteApprove", "proposal": transfer_kind(&loan.borrower, loan.principal) });
    serde_json::to_vec(&args).expect("act_proposal args")
}

pub(crate) fn get_proposal_args(proposal_id: u64) -> Vec<u8> {
    serde_json::to_vec(&json!({ "id": proposal_id })).expect("get_proposal args")
}

pub(crate) fn read_result() -> Option<Vec<u8>> {
    env::promise_result_checked(0, MAX_RESULT_LEN).ok()
}

/// add_proposal returns the new id as a JSON number.
pub(crate) fn read_u64_result() -> Option<u64> {
    read_result().and_then(|bytes| serde_json::from_slice::<u64>(&bytes).ok())
}

pub(crate) fn promise_ok() -> bool {
    read_result().is_some()
}

/// Tolerant: reads only `status` from get_proposal output, whatever else the DAO version adds or omits.
pub(crate) fn parse_status(bytes: &[u8]) -> Option<String> {
    let value: Value = serde_json::from_slice(bytes).ok()?;
    value.get("status")?.as_str().map(str::to_string)
}

pub(crate) fn read_proposal_status() -> Option<String> {
    read_result().and_then(|bytes| parse_status(&bytes))
}
