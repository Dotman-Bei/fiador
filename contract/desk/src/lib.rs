//! Fiador desk: a credit union seat for a Sputnik DAO. It never holds loan funds: every loan is a native
//! Sputnik Transfer proposal paid by the DAO, and every repayment is forwarded to the DAO in the same chain.
use near_sdk::json_types::U128;
use near_sdk::store::{IterableMap, Vector};
use near_sdk::{env, near, require, AccountId, BorshStorageKey, PanicOnDefault};

pub mod errors;
pub mod gas;
mod council;
mod governance;
mod lending;
mod params;
mod repay;
mod requests;
mod sputnik;
pub mod types;
mod views;
mod visitors;

#[cfg(test)]
mod tests;

pub use crate::types::*;

pub(crate) const NS_PER_SEC: u64 = 1_000_000_000;
pub(crate) const NS_PER_MS: u64 = 1_000_000;

#[near(serializers = [borsh])]
#[derive(BorshStorageKey)]
pub(crate) enum StorageKey {
    Members,
    Loans,
    Requests,
}

#[near(contract_state)]
#[derive(PanicOnDefault)]
pub struct Desk {
    pub(crate) dao: AccountId,
    pub(crate) params: Params,
    pub(crate) members: IterableMap<AccountId, Member>,
    pub(crate) loans: Vector<Loan>,
    pub(crate) requests: IterableMap<AccountId, Request>,
    pub(crate) book: u128,
}

#[near]
impl Desk {
    /// Called once, in the same transaction as the deploy, so nobody can initialise the desk first.
    #[init]
    pub fn new(dao: AccountId, params: Params) -> Self {
        params::validate(&params);
        Self {
            dao,
            params,
            members: IterableMap::new(StorageKey::Members),
            loans: Vector::new(StorageKey::Loans),
            requests: IterableMap::new(StorageKey::Requests),
            book: 0,
        }
    }

    pub fn get_config(&self) -> ConfigView {
        ConfigView {
            dao: self.dao.clone(),
            params: self.params.clone(),
            book: U128(self.book),
            member_count: self.members.len(),
            loan_count: u64::from(self.loans.len()),
            request_count: self.requests.len(),
        }
    }
}

impl Desk {
    pub(crate) fn now() -> u64 {
        env::block_timestamp()
    }

    pub(crate) fn secs(sec: u64) -> u64 {
        sec.saturating_mul(NS_PER_SEC)
    }

    pub(crate) fn require_dao(&self) {
        require!(env::predecessor_account_id() == self.dao, errors::ERR_ONLY_DAO);
    }

    /// Callbacks also carry `#[private]`; this in-body check is defence in depth and is unit-testable.
    pub(crate) fn require_callback() {
        require!(env::predecessor_account_id() == env::current_account_id(), errors::ERR_CALLBACK_ONLY);
    }

    pub(crate) fn member(&self, account_id: &AccountId) -> Member {
        self.members.get(account_id).cloned().unwrap_or_else(|| env::panic_str(errors::ERR_NOT_MEMBER))
    }

    pub(crate) fn put_member(&mut self, account_id: &AccountId, member: Member) {
        self.members.insert(account_id.clone(), member);
    }

    pub(crate) fn loan(&self, loan_id: u64) -> Loan {
        u32::try_from(loan_id)
            .ok()
            .and_then(|index| self.loans.get(index))
            .cloned()
            .unwrap_or_else(|| env::panic_str(errors::ERR_LOAN_NOT_FOUND))
    }

    pub(crate) fn put_loan(&mut self, loan: Loan) {
        let index = u32::try_from(loan.id).unwrap_or_else(|_| env::panic_str(errors::ERR_LOAN_NOT_FOUND));
        self.loans.set(index, loan);
    }
}
