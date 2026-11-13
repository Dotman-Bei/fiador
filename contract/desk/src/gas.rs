//! Static gas for every cross-contract call. Starting values are the smoke contract's proven allocations;
//! src/tests/gas_headroom.rs asserts each is >= 1.3x the live measurement in deployments/smoke-gas.json.
use near_sdk::Gas;

pub const GAS_ADD_PROPOSAL: Gas = Gas::from_tgas(50);
pub const GAS_ON_FILED: Gas = Gas::from_tgas(150);
pub const GAS_ACT_PROPOSAL: Gas = Gas::from_tgas(100);
pub const GAS_ON_VOTED: Gas = Gas::from_tgas(20);
pub const GAS_GET_PROPOSAL: Gas = Gas::from_tgas(20);
pub const GAS_ON_READ: Gas = Gas::from_tgas(30);
/// Largest promise result the desk will read (a proposal is about 1 KB).
pub const MAX_RESULT_LEN: usize = 16_384;
