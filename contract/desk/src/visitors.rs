//! The visitor line (D6): self-serve, capped at `visitor_slots` records, each paying its own storage
//! deposit. A full line reclaims one expired idle seat (refunding its deposit) before refusing.
use near_sdk::{env, near, require, AccountId, NearToken, Promise};

use crate::errors::{ERR_ALREADY_MEMBER, ERR_VISITOR_DEPOSIT, ERR_VISITOR_LINE_FULL};
use crate::types::{Member, Seat};
use crate::{Desk, DeskExt};

impl Desk {
    fn reclaimable(&self, account_id: &AccountId, member: &Member, now: u64) -> bool {
        match &member.visitor {
            None => false,
            Some(seat) => {
                now >= seat.joined_at.saturating_add(Self::secs(self.params.visitor_window_sec))
                    && member.open_loans == 0
                    && member.drawn == 0
                    && member.pledged == 0
                    && !self.requests.contains_key(account_id)
            }
        }
    }
}

#[near]
impl Desk {
    #[payable]
    pub fn join_visitor_line(&mut self) {
        let visitor = env::predecessor_account_id();
        let deposit = env::attached_deposit().as_yoctonear();
        require!(deposit == self.params.visitor_deposit.0, ERR_VISITOR_DEPOSIT);
        require!(!self.members.contains_key(&visitor), ERR_ALREADY_MEMBER);
        let now = Self::now();
        let seats = self.members.iter().filter(|(_, m)| m.visitor.is_some()).count();
        if seats >= self.params.visitor_slots as usize {
            let reclaim = self
                .members
                .iter()
                .find(|(id, m)| self.reclaimable(id, m, now))
                .map(|(id, m)| (id.clone(), m.clone()));
            let Some((old_id, old)) = reclaim else { env::panic_str(ERR_VISITOR_LINE_FULL) };
            self.members.remove(&old_id);
            if let Some(seat) = old.visitor {
                if seat.deposit > 0 {
                    Promise::new(old_id.clone()).transfer(NearToken::from_yoctonear(seat.deposit)).detach();
                }
            }
            env::log_str(&format!("fiador: visitor seat of {} reclaimed and its deposit refunded", old_id));
        }
        let seat = Seat { joined_at: now, deposit, loans_taken: 0 };
        self.members.insert(visitor.clone(), Member::new(self.params.visitor_starter.0, Some(seat)));
        env::log_str(&format!("fiador: {} joined the visitor line with standing {}", visitor, self.params.visitor_starter.0));
    }
}
