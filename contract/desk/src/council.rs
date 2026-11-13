//! The council lane and reconciliation with Sputnik (D16, D17, D27). The desk learns what happened to a
//! proposal only by reading `get_proposal`; payouts execute in a detached step, so reads are re-runnable.
use near_sdk::json_types::U128;
use near_sdk::{env, near, require, NearToken, Promise, PromiseOrValue};

use crate::errors::{ERR_LOAN_NOT_ACTIVE, ERR_NOT_OVERDUE, ERR_NO_PROPOSAL, ERR_VISITOR_NO_COUNCIL, ERR_ZERO_AMOUNT};
use crate::gas::{GAS_GET_PROPOSAL, GAS_ON_READ};
use crate::sputnik;
use crate::types::{AskResult, Lane, LoanStatus, ReadPurpose};
use crate::{Desk, DeskExt};

impl Desk {
    fn read_proposal(&self, loan_id: u64, proposal_id: u64, purpose: ReadPurpose) -> Promise {
        Promise::new(self.dao.clone())
            .function_call("get_proposal", sputnik::get_proposal_args(proposal_id), NearToken::from_yoctonear(0), GAS_GET_PROPOSAL)
            .then(Self::ext(env::current_account_id()).with_static_gas(GAS_ON_READ).on_proposal_read(loan_id, purpose))
    }
}

#[near]
impl Desk {
    /// Anything larger: the desk files the Transfer and does not vote. The council votes it like any proposal.
    pub fn ask_council(&mut self, amount: U128) -> PromiseOrValue<AskResult> {
        let borrower = env::predecessor_account_id();
        require!(amount.0 > 0, ERR_ZERO_AMOUNT);
        let member = self.member(&borrower);
        require!(member.visitor.is_none(), ERR_VISITOR_NO_COUNCIL);
        let loan_id = self.open_loan(&borrower, amount.0, 0, None, 0, Lane::Council, Self::now());
        env::log_str(&format!("fiador: loan #{} of {} for {} goes to the council", loan_id, amount.0, borrower));
        PromiseOrValue::Promise(self.file_transfer(loan_id, false))
    }

    /// Anyone, any number of times: reconciles a loan with its Sputnik proposal.
    pub fn sync_loan(&mut self, loan_id: u64) -> Promise {
        let loan = self.loan(loan_id);
        let proposal_id = loan.proposal_id.unwrap_or_else(|| env::panic_str(ERR_NO_PROPOSAL));
        self.read_proposal(loan_id, proposal_id, ReadPurpose::Sync)
    }

    /// Anyone, after term + grace: defaults the loan only if Sputnik shows the payout Approved.
    pub fn mark_default(&mut self, loan_id: u64) -> Promise {
        let loan = self.loan(loan_id);
        require!(loan.status == LoanStatus::Active, ERR_LOAN_NOT_ACTIVE);
        let grace_end = loan.due_at.saturating_add(Self::secs(self.params.grace_sec));
        require!(Self::now() > grace_end, ERR_NOT_OVERDUE);
        let proposal_id = loan.proposal_id.unwrap_or_else(|| env::panic_str(ERR_NO_PROPOSAL));
        self.read_proposal(loan_id, proposal_id, ReadPurpose::Default)
    }

    #[private]
    pub fn on_proposal_read(&mut self, loan_id: u64, purpose: ReadPurpose) -> LoanStatus {
        Self::require_callback();
        let mut loan = self.loan(loan_id);
        let Some(status) = sputnik::read_proposal_status() else {
            env::log_str(&format!("fiador: could not read the proposal for loan #{}; no change", loan_id));
            return loan.status;
        };
        let now = Self::now();
        match (loan.status, status.as_str()) {
            (LoanStatus::AwaitingCouncil, "Approved") => {
                loan.status = LoanStatus::Active;
                loan.due_at = now.saturating_add(Self::secs(self.params.loan_term_sec));
                self.book = self.book.saturating_add(loan.principal);
                self.put_loan(loan);
            }
            (LoanStatus::AwaitingCouncil, "Rejected" | "Removed" | "Expired" | "Moved" | "Failed") => {
                self.close(loan_id, LoanStatus::NotFunded);
            }
            (LoanStatus::Active, "Failed") => {
                self.release(&loan);
                self.close(loan_id, LoanStatus::Voided);
            }
            (LoanStatus::Active, "Approved")
                if purpose == ReadPurpose::Default
                    && now > loan.due_at.saturating_add(Self::secs(self.params.grace_sec)) =>
            {
                self.release(&loan);
                self.apply_default(&loan);
                self.close(loan_id, LoanStatus::Defaulted);
            }
            _ => {
                env::log_str(&format!("fiador: loan #{} is {:?}, proposal {}; no change", loan_id, loan.status, status));
            }
        }
        let after = self.loan(loan_id).status;
        env::log_str(&format!("fiador: loan #{} now {:?}", loan_id, after));
        after
    }
}
