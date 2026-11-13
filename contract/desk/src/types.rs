use near_sdk::json_types::U128;
use near_sdk::{near, AccountId};

/// Every number the DAO governs. Amounts in yocto, durations in seconds.
#[near(serializers = [borsh, json])]
#[derive(Clone, Debug, PartialEq)]
pub struct Params {
    pub starter_standing: U128,
    pub max_standing: U128,
    pub growth_step: U128,
    pub book_cap: U128,
    pub loan_term_sec: u64,
    pub grace_sec: u64,
    pub request_ttl_sec: u64,
    pub visitor_slots: u32,
    pub visitor_starter: U128,
    pub visitor_window_sec: u64,
    pub visitor_deposit: U128,
    /// Must equal the DAO policy's proposal_bond (0 on the demo DAO).
    pub proposal_bond: U128,
}

#[near(serializers = [borsh])]
#[derive(Clone, Debug, PartialEq)]
pub struct Seat {
    pub joined_at: u64,
    pub deposit: u128,
    pub loans_taken: u32,
}

#[near(serializers = [borsh])]
#[derive(Clone, Debug, PartialEq)]
pub struct Member {
    pub standing: u128,
    pub drawn: u128,
    pub pledged: u128,
    pub open_loans: u32,
    pub visitor: Option<Seat>,
    pub repaid_on_time: u32,
    pub defaults: u32,
}

impl Member {
    pub fn new(standing: u128, visitor: Option<Seat>) -> Self {
        Self { standing, drawn: 0, pledged: 0, open_loans: 0, visitor, repaid_on_time: 0, defaults: 0 }
    }

    /// Standing not yet drawn by the member's own loans nor pledged to someone else's.
    pub fn unused(&self) -> u128 {
        self.standing.saturating_sub(self.drawn.saturating_add(self.pledged))
    }
}

#[near(serializers = [borsh])]
#[derive(Clone, Debug, PartialEq)]
pub struct Request {
    pub amount: u128,
    pub created_at: u64,
    pub expires_at: u64,
}

#[near(serializers = [borsh, json])]
#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub enum Lane {
    Standing,
    Cosigned,
    Council,
}

#[near(serializers = [borsh, json])]
#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub enum LoanStatus {
    Filing,
    Voting,
    AwaitingCouncil,
    Active,
    Repaid,
    RepaidLate,
    Defaulted,
    Refused,
    NotFunded,
    Voided,
}

#[near(serializers = [borsh])]
#[derive(Clone, Debug, PartialEq)]
pub struct Loan {
    pub id: u64,
    pub borrower: AccountId,
    pub principal: u128,
    pub borrower_part: u128,
    pub cosigner: Option<AccountId>,
    pub pledge: u128,
    pub lane: Lane,
    pub status: LoanStatus,
    pub proposal_id: Option<u64>,
    pub created_at: u64,
    pub due_at: u64,
    pub closed_at: u64,
}

#[near(serializers = [json])]
#[derive(Clone, Debug, PartialEq)]
pub enum AskResult {
    Held { gap: U128, expires_at_ms: u64 },
    Loan { loan_id: u64, status: LoanStatus, proposal_id: Option<u64> },
}

#[near(serializers = [json])]
#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub enum ReadPurpose {
    Sync,
    Default,
}

#[near(serializers = [json])]
#[derive(Clone, Debug, PartialEq)]
pub struct ConfigView {
    pub dao: AccountId,
    pub params: Params,
    pub book: U128,
    pub member_count: u32,
    pub loan_count: u64,
    pub request_count: u32,
}

#[near(serializers = [json])]
#[derive(Clone, Debug, PartialEq)]
pub struct SeatView {
    pub joined_at_ms: u64,
    pub expires_at_ms: u64,
    pub deposit: U128,
    pub loans_taken: u32,
}

#[near(serializers = [json])]
#[derive(Clone, Debug, PartialEq)]
pub struct MemberView {
    pub account_id: AccountId,
    pub standing: U128,
    pub drawn: U128,
    pub pledged: U128,
    pub unused: U128,
    pub open_loans: u32,
    pub visitor: Option<SeatView>,
    pub repaid_on_time: u32,
    pub defaults: u32,
}

#[near(serializers = [json])]
#[derive(Clone, Debug, PartialEq)]
pub struct LoanView {
    pub id: u64,
    pub borrower: AccountId,
    pub principal: U128,
    pub borrower_part: U128,
    pub cosigner: Option<AccountId>,
    pub pledge: U128,
    pub lane: Lane,
    pub status: LoanStatus,
    pub proposal_id: Option<u64>,
    pub created_at_ms: u64,
    pub due_at_ms: u64,
    pub closed_at_ms: u64,
}

#[near(serializers = [json])]
#[derive(Clone, Debug, PartialEq)]
pub struct RequestView {
    pub borrower: AccountId,
    pub amount: U128,
    pub gap: U128,
    pub expires_at_ms: u64,
    pub expired: bool,
}
