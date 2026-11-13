use near_sdk::json_types::U128;
use near_sdk::serde_json::{self, json, Value};
use near_sdk::{env, near, require, AccountId, Gas, NearToken, PanicOnDefault, Promise, PromiseOrValue};

pub const GAS_ADD_PROPOSAL: Gas = Gas::from_tgas(50);
pub const GAS_ON_FILED: Gas = Gas::from_tgas(150);
pub const GAS_ACT_PROPOSAL: Gas = Gas::from_tgas(100);
pub const GAS_ON_VOTED: Gas = Gas::from_tgas(20);
const MAX_RESULT_LEN: usize = 16_384;

#[near(contract_state)]
#[derive(PanicOnDefault)]
pub struct Smoke {
    dao: AccountId,
    last_proposal_id: Option<u64>,
    last_vote_ok: Option<bool>,
}

#[near(serializers = [json])]
#[derive(Clone, Debug, PartialEq)]
pub struct SmokeView {
    pub dao: AccountId,
    pub last_proposal_id: Option<u64>,
    pub last_vote_ok: Option<bool>,
}

/// The NEAR Transfer kind exactly as the live 2.3.1 DAO stores it, minus `msg` (valid on 2.3.1 and main).
pub fn transfer_kind(receiver_id: &AccountId, amount: u128) -> Value {
    json!({ "Transfer": { "token_id": "", "receiver_id": receiver_id, "amount": amount.to_string() } })
}

fn read_result() -> Option<Vec<u8>> {
    env::promise_result_checked(0, MAX_RESULT_LEN).ok()
}

#[near]
impl Smoke {
    #[init]
    pub fn new(dao: AccountId) -> Self {
        Self { dao, last_proposal_id: None, last_vote_ok: None }
    }

    /// Files a Transfer on the DAO and approves it alone. Only this contract's own account may call it.
    pub fn file_and_approve(&mut self, receiver_id: AccountId, amount: U128) -> Promise {
        require!(env::predecessor_account_id() == env::current_account_id(), "ERR_ONLY_SELF");
        let args = json!({
            "proposal": {
                "description": format!("fiador smoke: {} yocto to {}", amount.0, receiver_id),
                "kind": transfer_kind(&receiver_id, amount.0)
            }
        });
        Promise::new(self.dao.clone())
            .function_call("add_proposal", serde_json::to_vec(&args).expect("args"), NearToken::from_yoctonear(0), GAS_ADD_PROPOSAL)
            .then(Self::ext(env::current_account_id()).with_static_gas(GAS_ON_FILED).on_filed(receiver_id, amount))
    }

    /// Votes only on the id returned by this contract's own add_proposal call.
    #[private]
    pub fn on_filed(&mut self, receiver_id: AccountId, amount: U128) -> PromiseOrValue<u64> {
        let id = match read_result().and_then(|bytes| serde_json::from_slice::<u64>(&bytes).ok()) {
            Some(id) => id,
            None => {
                self.last_proposal_id = None;
                self.last_vote_ok = Some(false);
                env::log_str("fiador smoke: add_proposal failed");
                return PromiseOrValue::Value(u64::MAX);
            }
        };
        self.last_proposal_id = Some(id);
        let args = json!({ "id": id, "action": "VoteApprove", "proposal": transfer_kind(&receiver_id, amount.0) });
        PromiseOrValue::Promise(
            Promise::new(self.dao.clone())
                .function_call("act_proposal", serde_json::to_vec(&args).expect("args"), NearToken::from_yoctonear(0), GAS_ACT_PROPOSAL)
                .then(Self::ext(env::current_account_id()).with_static_gas(GAS_ON_VOTED).on_voted(id)),
        )
    }

    #[private]
    pub fn on_voted(&mut self, proposal_id: u64) -> u64 {
        let ok = read_result().is_some();
        self.last_vote_ok = Some(ok);
        env::log_str(&format!("fiador smoke: vote on proposal {} ok={}", proposal_id, ok));
        proposal_id
    }

    pub fn get_last(&self) -> SmokeView {
        SmokeView { dao: self.dao.clone(), last_proposal_id: self.last_proposal_id, last_vote_ok: self.last_vote_ok }
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use near_sdk::serde_json::json;
    use near_sdk::test_utils::VMContextBuilder;
    use near_sdk::{testing_env, PromiseResult};

    fn smoke_id() -> AccountId {
        "smoke.root.testnet".parse().unwrap()
    }
    fn dao_id() -> AccountId {
        "fiador.sputnikv2.testnet".parse().unwrap()
    }
    fn bob() -> AccountId {
        "bob.testnet".parse().unwrap()
    }

    fn context(predecessor: AccountId, results: Vec<PromiseResult>) {
        let ctx = VMContextBuilder::new()
            .current_account_id(smoke_id())
            .predecessor_account_id(predecessor)
            .build();
        testing_env!(ctx, near_sdk::test_vm_config(), near_sdk::RuntimeFeesConfig::test(), Default::default(), results);
    }

    #[test]
    fn new_records_the_dao() {
        context(smoke_id(), vec![]);
        let c = Smoke::new(dao_id());
        assert_eq!(c.get_last(), SmokeView { dao: dao_id(), last_proposal_id: None, last_vote_ok: None });
    }

    #[test]
    #[should_panic(expected = "ERR_ONLY_SELF")]
    fn file_and_approve_rejects_any_other_caller() {
        context(bob(), vec![]);
        let mut c = Smoke::new(dao_id());
        let _ = c.file_and_approve(bob(), U128(10));
    }

    #[test]
    fn file_and_approve_by_its_own_account_schedules_the_chain() {
        context(smoke_id(), vec![]);
        let mut c = Smoke::new(dao_id());
        let _ = c.file_and_approve(bob(), U128(10));
    }

    #[test]
    fn transfer_kind_matches_the_live_2_3_1_shape_without_msg() {
        assert_eq!(
            transfer_kind(&bob(), 10),
            json!({ "Transfer": { "token_id": "", "receiver_id": "bob.testnet", "amount": "10" } })
        );
    }

    #[test]
    fn on_filed_success_stores_the_returned_id_and_votes() {
        context(smoke_id(), vec![PromiseResult::Successful(b"7".to_vec())]);
        let mut c = Smoke::new(dao_id());
        match c.on_filed(bob(), U128(10)) {
            PromiseOrValue::Promise(_) => {}
            PromiseOrValue::Value(v) => panic!("expected a vote promise, got value {v}"),
        }
        assert_eq!(c.get_last().last_proposal_id, Some(7));
    }

    #[test]
    fn on_filed_failure_records_no_vote_and_returns_the_sentinel() {
        context(smoke_id(), vec![PromiseResult::Failed]);
        let mut c = Smoke::new(dao_id());
        match c.on_filed(bob(), U128(10)) {
            PromiseOrValue::Value(v) => assert_eq!(v, u64::MAX),
            PromiseOrValue::Promise(_) => panic!("must not vote when add_proposal failed"),
        }
        assert_eq!(c.get_last().last_proposal_id, None);
        assert_eq!(c.get_last().last_vote_ok, Some(false));
    }

    #[test]
    fn on_voted_success_records_ok() {
        context(smoke_id(), vec![PromiseResult::Successful(vec![])]);
        let mut c = Smoke::new(dao_id());
        assert_eq!(c.on_voted(7), 7);
        assert_eq!(c.get_last().last_vote_ok, Some(true));
    }

    #[test]
    fn on_voted_failure_records_not_ok() {
        context(smoke_id(), vec![PromiseResult::Failed]);
        let mut c = Smoke::new(dao_id());
        assert_eq!(c.on_voted(7), 7);
        assert_eq!(c.get_last().last_vote_ok, Some(false));
    }
}
