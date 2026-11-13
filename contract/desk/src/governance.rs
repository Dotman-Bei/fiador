//! The DAO's only levers. Each accepts calls ONLY from the DAO account stored at init, so the council uses
//! ordinary Sputnik FunctionCall proposals. There is no owner and no other admin.
use near_sdk::{env, near, require, AccountId, NearToken, Promise};

use crate::errors::{ERR_ALREADY_MEMBER, ERR_MEMBER_BUSY};
use crate::types::{Member, Params};
use crate::{params, Desk, DeskExt};

#[near]
impl Desk {
    pub fn set_params(&mut self, params: Params) {
        self.require_dao();
        params::validate(&params);
        self.params = params;
        env::log_str("fiador: parameters updated by the DAO");
    }

    pub fn admit_member(&mut self, account_id: AccountId) {
        self.require_dao();
        require!(!self.members.contains_key(&account_id), ERR_ALREADY_MEMBER);
        let standing = self.params.starter_standing.0;
        self.members.insert(account_id.clone(), Member::new(standing, None));
        env::log_str(&format!("fiador: {} admitted with standing {}", account_id, standing));
    }

    pub fn remove_member(&mut self, account_id: AccountId) {
        self.require_dao();
        let member = self.member(&account_id);
        require!(
            member.open_loans == 0 && member.pledged == 0 && !self.requests.contains_key(&account_id),
            ERR_MEMBER_BUSY
        );
        self.members.remove(&account_id);
        if let Some(seat) = member.visitor {
            if seat.deposit > 0 {
                Promise::new(account_id.clone()).transfer(NearToken::from_yoctonear(seat.deposit)).detach();
            }
        }
        env::log_str(&format!("fiador: {} removed by the DAO", account_id));
    }
}
