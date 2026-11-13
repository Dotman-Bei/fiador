//! Paginated public views (D8): the board and verify read everything from here, with no indexer.
use near_sdk::json_types::U128;
use near_sdk::{near, AccountId};

use crate::types::{Loan, LoanView, Member, MemberView, RequestView, SeatView};
use crate::{Desk, DeskExt, NS_PER_MS};

pub const MAX_PAGE: u32 = 100;

impl Desk {
    fn member_view(&self, account_id: &AccountId, m: &Member) -> MemberView {
        MemberView {
            account_id: account_id.clone(),
            standing: U128(m.standing),
            drawn: U128(m.drawn),
            pledged: U128(m.pledged),
            unused: U128(m.unused()),
            open_loans: m.open_loans,
            visitor: m.visitor.as_ref().map(|s| SeatView {
                joined_at_ms: s.joined_at / NS_PER_MS,
                expires_at_ms: s.joined_at.saturating_add(Self::secs(self.params.visitor_window_sec)) / NS_PER_MS,
                deposit: U128(s.deposit),
                loans_taken: s.loans_taken,
            }),
            repaid_on_time: m.repaid_on_time,
            defaults: m.defaults,
        }
    }

    fn loan_view(loan: &Loan) -> LoanView {
        LoanView {
            id: loan.id,
            borrower: loan.borrower.clone(),
            principal: U128(loan.principal),
            borrower_part: U128(loan.borrower_part),
            cosigner: loan.cosigner.clone(),
            pledge: U128(loan.pledge),
            lane: loan.lane,
            status: loan.status,
            proposal_id: loan.proposal_id,
            created_at_ms: loan.created_at / NS_PER_MS,
            due_at_ms: loan.due_at / NS_PER_MS,
            closed_at_ms: loan.closed_at / NS_PER_MS,
        }
    }
}

#[near]
impl Desk {
    pub fn get_member(&self, account_id: AccountId) -> Option<MemberView> {
        self.members.get(&account_id).map(|m| self.member_view(&account_id, m))
    }

    pub fn get_members(&self, from_index: u32, limit: u32) -> Vec<MemberView> {
        self.members
            .iter()
            .skip(from_index as usize)
            .take(limit.min(MAX_PAGE) as usize)
            .map(|(id, m)| self.member_view(id, m))
            .collect()
    }

    pub fn get_loan(&self, loan_id: u64) -> Option<LoanView> {
        u32::try_from(loan_id).ok().and_then(|i| self.loans.get(i)).map(Self::loan_view)
    }

    pub fn get_loans(&self, from_index: u64, limit: u64) -> Vec<LoanView> {
        let len = u64::from(self.loans.len());
        let end = from_index.saturating_add(limit.min(u64::from(MAX_PAGE))).min(len);
        (from_index..end)
            .filter_map(|i| u32::try_from(i).ok().and_then(|i| self.loans.get(i)))
            .map(Self::loan_view)
            .collect()
    }

    pub fn get_requests(&self, from_index: u32, limit: u32) -> Vec<RequestView> {
        let now = Self::now();
        self.requests
            .iter()
            .skip(from_index as usize)
            .take(limit.min(MAX_PAGE) as usize)
            .map(|(borrower, r)| {
                let unused = self.members.get(borrower).map(|m| m.unused()).unwrap_or(0);
                RequestView {
                    borrower: borrower.clone(),
                    amount: U128(r.amount),
                    gap: U128(r.amount.saturating_sub(unused)),
                    expires_at_ms: r.expires_at / NS_PER_MS,
                    expired: r.expires_at <= now,
                }
            })
            .collect()
    }
}
