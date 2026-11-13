use near_sdk::require;

use crate::errors::ERR_INVALID_PARAMS;
use crate::types::Params;

pub(crate) fn validate(p: &Params) {
    require!(p.starter_standing.0 <= p.max_standing.0, ERR_INVALID_PARAMS);
    require!(p.visitor_starter.0 <= p.max_standing.0, ERR_INVALID_PARAMS);
    require!(p.growth_step.0 > 0, ERR_INVALID_PARAMS);
    require!(p.loan_term_sec > 0 && p.request_ttl_sec > 0 && p.visitor_window_sec > 0, ERR_INVALID_PARAMS);
}
