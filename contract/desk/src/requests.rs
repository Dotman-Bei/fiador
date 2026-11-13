//! Co-signing (D1-D3): one co-signer covers a held request's whole gap in one call, and the loan is filed
//! and approved inside the co-signer's transaction. No pledge exists until that call.
use near_sdk::json_types::U128;
use near_sdk::{env, near, require, AccountId, PromiseOrValue};

use crate::errors::{
    ERR_BOOK_FULL, ERR_COSIGNER_SHORT, ERR_NO_GAP, ERR_NO_REQUEST, ERR_PLEDGE_CAP, ERR_REQUEST_EXPIRED, ERR_SELF_COSIGN,
    ERR_VISITOR_CANNOT_COSIGN,
};
use crate::types::{AskResult, Lane};
use crate::{Desk, DeskExt};

#[near]
impl Desk {
    pub fn cosign(&mut self, borrower: AccountId, max_pledge: U128) -> PromiseOrValue<AskResult> {
        let cosigner = env::predecessor_account_id();
        require!(cosigner != borrower, ERR_SELF_COSIGN);
        let c = self.member(&cosigner);
        require!(c.visitor.is_none(), ERR_VISITOR_CANNOT_COSIGN);
        let now = Self::now();
        let request = self.requests.get(&borrower).cloned().unwrap_or_else(|| env::panic_str(ERR_NO_REQUEST));
        require!(request.expires_at > now, ERR_REQUEST_EXPIRED);
        let b = self.member(&borrower);
        self.check_visitor_can_borrow(&b, now);
        let unused = b.unused();
        require!(request.amount > unused, ERR_NO_GAP);
        let gap = request.amount - unused;
        require!(gap <= max_pledge.0, ERR_PLEDGE_CAP);
        require!(gap <= c.unused(), ERR_COSIGNER_SHORT);
        require!(self.book.saturating_add(request.amount) <= self.params.book_cap.0, ERR_BOOK_FULL);
        self.requests.remove(&borrower);
        let loan_id = self.open_loan(&borrower, request.amount, unused, Some(cosigner.clone()), gap, Lane::Cosigned, now);
        env::log_str(&format!("fiador: {} co-signed {} for {}'s loan #{}; filing", cosigner, gap, borrower, loan_id));
        PromiseOrValue::Promise(self.file_transfer(loan_id, true))
    }

    pub fn cancel_request(&mut self) {
        let borrower = env::predecessor_account_id();
        require!(self.requests.remove(&borrower).is_some(), ERR_NO_REQUEST);
        env::log_str(&format!("fiador: {} cancelled their request", borrower));
    }
}
