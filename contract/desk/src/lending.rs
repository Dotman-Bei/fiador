//! The ask chain: reserve, then file. `file_transfer` is the ONE routine that calls Sputnik's write methods,
//! and the desk votes only on the proposal id returned by its own `add_proposal` call.
use near_sdk::json_types::U128;
use near_sdk::{env, near, require, AccountId, NearToken, Promise, PromiseOrValue};

use crate::errors::{ERR_BOOK_FULL, ERR_REQUEST_OPEN, ERR_TOO_LARGE_FOR_COSIGN, ERR_VISITOR_LOAN_LIMIT, ERR_VISITOR_SEAT_EXPIRED, ERR_ZERO_AMOUNT};
use crate::gas::{GAS_ACT_PROPOSAL, GAS_ADD_PROPOSAL, GAS_ON_FILED, GAS_ON_VOTED};
use crate::sputnik;
use crate::types::{AskResult, Lane, Loan, LoanStatus, Member, Request};
use crate::{Desk, DeskExt, NS_PER_MS};

pub const VISITOR_MAX_LOANS: u32 = 3;

impl Desk {
    pub(crate) fn check_visitor_can_borrow(&self, member: &Member, now: u64) {
        if let Some(seat) = &member.visitor {
            let ends = seat.joined_at.saturating_add(Self::secs(self.params.visitor_window_sec));
            require!(now < ends, ERR_VISITOR_SEAT_EXPIRED);
            require!(seat.loans_taken < VISITOR_MAX_LOANS, ERR_VISITOR_LOAN_LIMIT);
        }
    }

    /// Creates the loan record and reserves everything it needs BEFORE any cross-contract call.
    #[allow(clippy::too_many_arguments)]
    pub(crate) fn open_loan(
        &mut self,
        borrower: &AccountId,
        principal: u128,
        borrower_part: u128,
        cosigner: Option<AccountId>,
        pledge: u128,
        lane: Lane,
        now: u64,
    ) -> u64 {
        let id = u64::from(self.loans.len());
        let mut b = self.member(borrower);
        b.open_loans += 1;
        if lane != Lane::Council {
            b.drawn += borrower_part;
            self.book += principal;
            if let Some(seat) = b.visitor.as_mut() {
                seat.loans_taken += 1;
            }
        }
        self.put_member(borrower, b);
        if let Some(c) = &cosigner {
            let mut cm = self.member(c);
            cm.pledged += pledge;
            self.put_member(c, cm);
        }
        self.loans.push(Loan {
            id,
            borrower: borrower.clone(),
            principal,
            borrower_part,
            cosigner,
            pledge,
            lane,
            status: LoanStatus::Filing,
            proposal_id: None,
            created_at: now,
            due_at: 0,
            closed_at: 0,
        });
        id
    }

    /// Whether the loan currently holds a reservation (book room, drawn standing, a pledge).
    pub(crate) fn holds_reservation(loan: &Loan) -> bool {
        match loan.lane {
            Lane::Council => loan.status == LoanStatus::Active,
            Lane::Standing | Lane::Cosigned => {
                matches!(loan.status, LoanStatus::Filing | LoanStatus::Voting | LoanStatus::Active)
            }
        }
    }

    /// Undoes exactly what `open_loan` (or a council activation) reserved. Call BEFORE changing the status.
    pub(crate) fn release(&mut self, loan: &Loan) {
        if !Self::holds_reservation(loan) {
            return;
        }
        self.book = self.book.saturating_sub(loan.principal);
        if loan.borrower_part > 0 {
            if let Some(mut b) = self.members.get(&loan.borrower).cloned() {
                b.drawn = b.drawn.saturating_sub(loan.borrower_part);
                self.put_member(&loan.borrower, b);
            }
        }
        if loan.pledge > 0 {
            if let Some(c) = &loan.cosigner {
                if let Some(mut cm) = self.members.get(c).cloned() {
                    cm.pledged = cm.pledged.saturating_sub(loan.pledge);
                    self.put_member(c, cm);
                }
            }
        }
    }

    /// Moves a loan to a terminal status and frees the borrower's open-loan slot.
    pub(crate) fn close(&mut self, loan_id: u64, status: LoanStatus) {
        let mut loan = self.loan(loan_id);
        loan.status = status;
        loan.closed_at = Self::now();
        let borrower = loan.borrower.clone();
        self.put_loan(loan);
        if let Some(mut b) = self.members.get(&borrower).cloned() {
            b.open_loans = b.open_loans.saturating_sub(1);
            self.put_member(&borrower, b);
        }
    }

    pub(crate) fn outcome(loan: &Loan) -> AskResult {
        AskResult::Loan { loan_id: loan.id, status: loan.status, proposal_id: loan.proposal_id }
    }

    /// THE core routine (security-reviewed): files a Transfer of the loan's principal to the borrower on the DAO,
    /// attaching exactly the policy bond, then hands the returned id to `on_filed`.
    pub(crate) fn file_transfer(&mut self, loan_id: u64, approve: bool) -> Promise {
        let loan = self.loan(loan_id);
        Promise::new(self.dao.clone())
            .function_call(
                "add_proposal",
                sputnik::add_proposal_args(&loan),
                NearToken::from_yoctonear(self.params.proposal_bond.0),
                GAS_ADD_PROPOSAL,
            )
            .then(Self::ext(env::current_account_id()).with_static_gas(GAS_ON_FILED).on_filed(loan_id, approve))
    }
}

#[near]
impl Desk {
    /// Within unused standing and the book cap: filed and approved now (standing lane).
    /// Above unused standing: held as a request that needs `gap` co-signed (D1, D4).
    pub fn ask(&mut self, amount: U128) -> PromiseOrValue<AskResult> {
        let borrower = env::predecessor_account_id();
        let amount = amount.0;
        require!(amount > 0, ERR_ZERO_AMOUNT);
        let member = self.member(&borrower);
        let now = Self::now();
        self.check_visitor_can_borrow(&member, now);
        if let Some(open) = self.requests.get(&borrower) {
            require!(open.expires_at <= now, ERR_REQUEST_OPEN);
        }
        self.requests.remove(&borrower);
        let unused = member.unused();
        if amount <= unused {
            require!(self.book.saturating_add(amount) <= self.params.book_cap.0, ERR_BOOK_FULL);
            let loan_id = self.open_loan(&borrower, amount, amount, None, 0, Lane::Standing, now);
            env::log_str(&format!("fiador: loan #{} of {} for {} within standing; filing", loan_id, amount, borrower));
            return PromiseOrValue::Promise(self.file_transfer(loan_id, true));
        }
        let gap = amount - unused;
        require!(gap <= self.params.max_standing.0, ERR_TOO_LARGE_FOR_COSIGN);
        let expires_at = now.saturating_add(Self::secs(self.params.request_ttl_sec));
        self.requests.insert(borrower.clone(), Request { amount, created_at: now, expires_at });
        env::log_str(&format!("fiador: holding {}'s request for {}: needs {} co-signed", borrower, amount, gap));
        PromiseOrValue::Value(AskResult::Held { gap: U128(gap), expires_at_ms: expires_at / NS_PER_MS })
    }

    #[private]
    pub fn on_filed(&mut self, loan_id: u64, approve: bool) -> PromiseOrValue<AskResult> {
        Self::require_callback();
        let mut loan = self.loan(loan_id);
        if loan.status != LoanStatus::Filing {
            return PromiseOrValue::Value(Self::outcome(&loan));
        }
        let Some(proposal_id) = sputnik::read_u64_result() else {
            self.release(&loan);
            if loan.lane != Lane::Council {
                if let Some(mut b) = self.members.get(&loan.borrower).cloned() {
                    if let Some(seat) = b.visitor.as_mut() {
                        seat.loans_taken = seat.loans_taken.saturating_sub(1);
                    }
                    self.put_member(&loan.borrower, b);
                }
            }
            self.close(loan_id, LoanStatus::Refused);
            env::log_str(&format!("fiador: loan #{} refused: the DAO did not accept the proposal", loan_id));
            return PromiseOrValue::Value(Self::outcome(&self.loan(loan_id)));
        };
        loan.proposal_id = Some(proposal_id);
        if !approve {
            loan.status = LoanStatus::AwaitingCouncil;
            self.put_loan(loan.clone());
            env::log_str(&format!("fiador: loan #{} filed as proposal {} for a council vote", loan_id, proposal_id));
            return PromiseOrValue::Value(Self::outcome(&loan));
        }
        loan.status = LoanStatus::Voting;
        self.put_loan(loan.clone());
        PromiseOrValue::Promise(
            Promise::new(self.dao.clone())
                .function_call(
                    "act_proposal",
                    sputnik::act_proposal_args(proposal_id, &loan),
                    NearToken::from_yoctonear(0),
                    GAS_ACT_PROPOSAL,
                )
                .then(Self::ext(env::current_account_id()).with_static_gas(GAS_ON_VOTED).on_voted(loan_id)),
        )
    }

    #[private]
    pub fn on_voted(&mut self, loan_id: u64) -> AskResult {
        Self::require_callback();
        let mut loan = self.loan(loan_id);
        if loan.status != LoanStatus::Voting {
            return Self::outcome(&loan);
        }
        if sputnik::promise_ok() {
            loan.status = LoanStatus::Active;
            loan.due_at = Self::now().saturating_add(Self::secs(self.params.loan_term_sec));
            self.put_loan(loan.clone());
            env::log_str(&format!("fiador: loan #{} approved by the desk; the DAO pays {}", loan_id, loan.borrower));
        } else {
            // D27: the vote failed, so the proposal falls back to the council lane and every reservation is released.
            self.release(&loan);
            loan.lane = Lane::Council;
            loan.borrower_part = 0;
            loan.pledge = 0;
            loan.status = LoanStatus::AwaitingCouncil;
            self.put_loan(loan.clone());
            env::log_str(&format!("fiador: loan #{} vote failed; it now waits for a council vote", loan_id));
        }
        Self::outcome(&loan)
    }
}
