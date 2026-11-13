//! Repayment (D10, D18): synchronous, exact principal, Active loans only. Every refusal is a panic, which makes
//! the runtime refund the attached NEAR. The money goes straight on to the DAO in the same chain.
use near_sdk::{env, near, require, NearToken, Promise};

use crate::errors::{ERR_LOAN_NOT_ACTIVE, ERR_WRONG_REPAY_AMOUNT};
use crate::types::{Loan, LoanStatus};
use crate::{Desk, DeskExt};

impl Desk {
    fn grow(&self, standing: u128, by: u128) -> u128 {
        let max = self.params.max_standing.0;
        if standing >= max {
            standing
        } else {
            standing.saturating_add(by).min(max)
        }
    }

    /// On time: the borrower gains min(step, principal), the co-signer min(step, pledge), both capped at max.
    pub(crate) fn reward(&mut self, loan: &Loan) {
        let step = self.params.growth_step.0;
        if let Some(mut b) = self.members.get(&loan.borrower).cloned() {
            b.standing = self.grow(b.standing, step.min(loan.principal));
            b.repaid_on_time += 1;
            self.put_member(&loan.borrower, b);
        }
        if loan.pledge > 0 {
            if let Some(c) = &loan.cosigner {
                if let Some(mut cm) = self.members.get(c).cloned() {
                    cm.standing = self.grow(cm.standing, step.min(loan.pledge));
                    self.put_member(c, cm);
                }
            }
        }
    }

    /// Default: the borrower's standing goes to 0; the co-signer loses exactly what they pledged.
    pub(crate) fn apply_default(&mut self, loan: &Loan) {
        if let Some(mut b) = self.members.get(&loan.borrower).cloned() {
            b.standing = 0;
            b.defaults += 1;
            self.put_member(&loan.borrower, b);
        }
        if loan.pledge > 0 {
            if let Some(c) = &loan.cosigner {
                if let Some(mut cm) = self.members.get(c).cloned() {
                    cm.standing = cm.standing.saturating_sub(loan.pledge);
                    self.put_member(c, cm);
                }
            }
        }
    }

    /// Deterministic by the repay call's timestamp, whoever calls mark_default first.
    pub(crate) fn settle(&mut self, loan: &Loan, now: u64) -> LoanStatus {
        self.release(loan);
        let grace_end = loan.due_at.saturating_add(Self::secs(self.params.grace_sec));
        let status = if now <= loan.due_at {
            self.reward(loan);
            LoanStatus::Repaid
        } else if now <= grace_end {
            LoanStatus::RepaidLate
        } else {
            self.apply_default(loan);
            LoanStatus::Defaulted
        };
        self.close(loan.id, status);
        status
    }
}

#[near]
impl Desk {
    #[payable]
    pub fn repay(&mut self, loan_id: u64) -> Promise {
        let loan = self.loan(loan_id);
        require!(loan.status == LoanStatus::Active, ERR_LOAN_NOT_ACTIVE);
        require!(env::attached_deposit().as_yoctonear() == loan.principal, ERR_WRONG_REPAY_AMOUNT);
        let status = self.settle(&loan, Self::now());
        env::log_str(&format!("fiador: loan #{} repaid ({:?}); {} forwarded to {}", loan_id, status, loan.principal, self.dao));
        Promise::new(self.dao.clone()).transfer(NearToken::from_yoctonear(loan.principal))
    }
}
