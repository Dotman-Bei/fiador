//! D28: every static gas allocation carries >= 30% headroom over the live smoke measurement.
use near_sdk::serde_json::{self, Value};
use near_sdk::Gas;

use crate::gas::{GAS_ACT_PROPOSAL, GAS_ADD_PROPOSAL, GAS_ON_FILED, GAS_ON_VOTED};

const MEASURED: &str = include_str!("../../../../deployments/smoke-gas.json");

fn measured(key: &str) -> u64 {
    let v: Value = serde_json::from_str(MEASURED).expect("deployments/smoke-gas.json is JSON");
    v[key].as_str().and_then(|s| s.parse::<u64>().ok()).unwrap_or_else(|| panic!("{key} missing from smoke-gas.json"))
}

fn assert_headroom(name: &str, allocated: Gas, key: &str) {
    let need = measured(key);
    assert!(
        u128::from(allocated.as_gas()) * 10 >= u128::from(need) * 13,
        "{name} = {} gas is below 1.3 x the measured {key} = {need}",
        allocated.as_gas()
    );
}

#[test]
fn add_proposal_has_headroom() {
    assert_headroom("GAS_ADD_PROPOSAL", GAS_ADD_PROPOSAL, "add_proposal");
}

#[test]
fn on_filed_has_headroom() {
    assert_headroom("GAS_ON_FILED", GAS_ON_FILED, "on_filed");
}

#[test]
fn act_proposal_has_headroom() {
    assert_headroom("GAS_ACT_PROPOSAL", GAS_ACT_PROPOSAL, "act_proposal");
}

#[test]
fn on_voted_has_headroom() {
    assert_headroom("GAS_ON_VOTED", GAS_ON_VOTED, "on_voted");
}

#[test]
fn an_ask_fits_in_300_tgas() {
    let chain = GAS_ADD_PROPOSAL.as_gas() + GAS_ON_FILED.as_gas();
    assert!(chain + Gas::from_tgas(20).as_gas() <= Gas::from_tgas(300).as_gas(), "ask needs {chain} plus its own execution");
    assert!(GAS_ACT_PROPOSAL.as_gas() + GAS_ON_VOTED.as_gas() + Gas::from_tgas(10).as_gas() <= GAS_ON_FILED.as_gas());
}
